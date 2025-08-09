import os
import uuid
import re
import time
import json
import traceback
from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for, flash, make_response, Response
import logging
from utils.cobol_parser import parse_cobol
from utils.documentation_generator import generate_documentation
from utils.perplexity_client import extract_structure, generate_diagrams, translate_documentation
from utils.llm_selector import llm_selector
from utils.groq_client import get_groq_models
from models import db, User, Project, CobolFile, Documentation, SourceCodeQueue, SourceCodeContent, DocGenerated
from datetime import datetime
from dotenv import load_dotenv
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key_for_development")

# Initialize CSRF protection but exempt API routes used by JavaScript
csrf = CSRFProtect(app)

# List of API routes to exempt from CSRF protection
exempt_routes = [
    '/api/execute-sql',
    '/api/ledger/get-source-queue',
    '/api/ledger/get-doc-queue',
    '/api/upload',
    '/api/process',
    '/api/agent/process',
    '/api/translate',
    '/api/download',
    '/api/validate-mermaid',
    '/api/llm-settings',
    '/api/prompts/save', 
    '/api/prompts/reset',
    '/api/prompts/reset-all',
    '/api/prompts/set-active',
    '/api/prompts/status',
    '/api/check-api-keys',
    '/api/save-api-keys',
    '/api/get-models',
    '/api/ledger/source-queue',
    '/api/documentation',
    '/api/ledger/doc-queue',
    '/api/ledger/add-source',
    '/api/ledger/update-source-status',
    '/api/ledger/delete-source',
    '/api/ledger/get-source',
    '/api/ledger/process-source',
    '/api/ledger/get-doc',
    '/api/ledger/update-doc-status',
    '/api/ledger/download-doc',
]

# Apply exemptions
for route in exempt_routes:
    csrf.exempt(route)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure database connection
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    logger.error("DATABASE_URL environment variable is not set! Database functionality will be unavailable.")

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
    "pool_size": 10,
    "max_overflow": 20,
    "connect_args": {"connect_timeout": 15}
}
app.config["SQLALCHEMY_ECHO"] = True  # Echo SQL queries for debugging

# Initialize database with app
try:
    db.init_app(app)
    with app.app_context():
        # Test database connection
        db.engine.connect()
        logger.info("Database connection successful!")
except Exception as e:
    logger.error(f"Error connecting to database: {str(e)}")
    logger.error(traceback.format_exc())

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'

# Add CORS headers to allow Authorization header
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRFToken')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Create all tables in the database
with app.app_context():
    try:
        db.create_all()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        logger.error(traceback.format_exc())

# Timestamp function
def timestamp(dt=None, timezone_offset=-5):
    """
    Generate a formatted timestamp string in the format YYYYMMDD_HHMMSS GMT-n
    
    Args:
        dt (datetime, optional): Datetime object to format. Defaults to current time.
        timezone_offset (int, optional): Offset from GMT in hours. Defaults to -5 (GMT-5).
        
    Returns:
        str: Formatted timestamp string with timezone
    """
    if dt is None:
        dt = datetime.now()
    
    # Calculate the time with offset
    from datetime import timedelta
    adjusted_dt = dt + timedelta(hours=timezone_offset)
    
    # Format the timestamp with timezone indicator
    gmt_sign = "+" if timezone_offset >= 0 else "-"
    gmt_value = abs(timezone_offset)
    
    return f"{adjusted_dt.strftime('%Y%m%d_%H%M%S')} GMT{gmt_sign}{gmt_value}"

# Make the timestamp function available to all templates
@app.context_processor
def utility_processor():
    def check_db_connection():
        """Check if the database connection is working"""
        try:
            # Use our new LedgerSQL class to check connection and get DB info
            from utils.ledger_sql import LedgerSQL
            
            db_info = LedgerSQL.get_database_info()
            logging.debug(f"Database info: {db_info}")
            return db_info.get('connected', False)
        except Exception as e:
            logging.error(f"Database connection check error: {str(e)}")
            return False
    
    def get_db_url():
        """Get the database URL (masked for security)"""
        db_url = os.environ.get("DATABASE_URL", "")
        if db_url and "@" in db_url:
            # Mask the password in the URL for display
            parts = db_url.split("@")
            prefix = parts[0].split(":")
            # Keep only the first two parts (driver and user) and mask the password
            safe_prefix = ":".join(prefix[:2]) + ":********"
            return safe_prefix + "@" + parts[1]
        return "Database URL not configured"
    
    return {
        'timestamp': timestamp,
        'now': datetime.now,
        'check_db_connection': check_db_connection,
        'get_db_url': get_db_url
    }

@app.route("/prompts")
@login_required
def prompts():
    """
    Display the prompt management interface
    """
    from utils.prompt_manager import get_default_prompts, get_prompt_list
    
    # Get all prompts for the current user
    default_prompts = get_default_prompts()
    prompt_list = get_prompt_list()
    
    # Check session for custom prompts
    custom_prompts = session.get('custom_prompts', {})
    
    # Merge default and custom prompts
    prompts = {}
    for key, prompt_data in default_prompts.items():
        if key in custom_prompts:
            prompts[key] = custom_prompts[key]
        else:
            prompts[key] = prompt_data
    
    return render_template("prompts.html", prompts=prompts, prompt_list=prompt_list)

@app.route("/api/prompts/save", methods=["POST"])
@login_required
def save_prompt():
    """
    Save a custom prompt
    """
    from utils.prompt_manager import save_custom_prompt
    
    data = request.json
    prompt_key = data.get('prompt_key')
    prompt_data = data.get('prompt_data')
    
    if not prompt_key or not prompt_data:
        return jsonify({"success": False, "message": "Missing prompt key or data"}), 400
    
    success = save_custom_prompt(prompt_key, prompt_data, current_user.id)
    
    if success:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Failed to save prompt"}), 500

@app.route("/api/prompts/reset", methods=["POST"])
@login_required
def reset_prompt():
    """
    Reset a prompt to its default value
    """
    from utils.prompt_manager import reset_prompt as reset_prompt_func
    
    data = request.json
    prompt_key = data.get('prompt_key')
    
    if not prompt_key:
        return jsonify({"success": False, "message": "Missing prompt key"}), 400
    
    success = reset_prompt_func(prompt_key, current_user.id)
    
    if success:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Failed to reset prompt or prompt was already default"}), 500

@app.route("/api/prompts/reset-all", methods=["POST"])
@login_required
def reset_all_prompts():
    """
    Reset all prompts to their default values
    """
    from utils.prompt_manager import reset_all_prompts as reset_all_prompts_func
    
    reset_all_prompts_func(current_user.id)
    
    return jsonify({"success": True})


@app.route("/api/prompts/set-active", methods=["POST"])
@login_required
def set_active_prompt():
    """
    Set the active prompt
    """
    from utils.prompt_manager import set_active_prompt_key
    
    # Get prompt key from request
    data = request.get_json()
    prompt_key = data.get('prompt_key')
    
    if not prompt_key:
        return jsonify({"success": False, "message": "No prompt key provided"}), 400
    
    # Set the active prompt
    success = set_active_prompt_key(prompt_key)
    
    if success:
        return jsonify({"success": True, "active_prompt_key": prompt_key})
    else:
        return jsonify({"success": False, "message": f"Invalid prompt key: {prompt_key}"}), 400

@app.route("/api/prompts/status")
@login_required
def prompt_status():
    """
    Get the status of prompts (custom or default, and which is active)
    """
    from utils.prompt_manager import get_active_prompt_key
    
    # Get custom prompts from session
    custom_prompts = session.get('custom_prompts', {})
    
    # Get active prompt key
    active_prompt_key = get_active_prompt_key()
    
    return jsonify({
        "success": True,
        "custom_prompts": list(custom_prompts.keys()),
        "active_prompt_key": active_prompt_key
    })

@app.route("/documentation")
def view_documentation():
    """
    Display the COBOL Documentation Generator markdown documentation with proper rendering
    """
    try:
        import markdown
        
        # Read the markdown file
        with open('COBOL_Documentation_Generator.md', 'r') as f:
            md_content = f.read()
        
        # Convert markdown to HTML
        html_content = markdown.markdown(
            md_content,
            extensions=[
                'markdown.extensions.tables',
                'markdown.extensions.fenced_code',
                'markdown.extensions.codehilite',
                'markdown.extensions.toc'
            ]
        )
        
        # Process Mermaid diagrams
        # Find mermaid code blocks and wrap them properly for client-side rendering
        mermaid_pattern = r'```mermaid\s+(.*?)\s+```'
        
        def mermaid_replace(match):
            diagram_code = match.group(1).strip()
            return f'<div class="mermaid">{diagram_code}</div>'
        
        html_content = re.sub(mermaid_pattern, mermaid_replace, html_content, flags=re.DOTALL)
        
        return render_template('documentation_viewer.html', doc_content=html_content)
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Error rendering documentation: {str(e)}")
        return f"<h1>Error rendering documentation</h1><p>{str(e)}</p><pre>{traceback.format_exc()}</pre>"

@app.route("/")
def index():
    # Get user settings from session
    user_settings = {}
    if hasattr(current_user, 'id'):
        user_settings = session.get('user_settings', {})
    
    # Default settings if none exist
    if not user_settings:
        user_settings = {
            'llm_provider': 'groq',          # Default to GROQ
            'llm_model': None,               # Will be set to default for the provider
            'detail_level': 'medium',        # medium detail level
            'audience': 'technical',         # technical audience
            'documentation_style': 'formal', # formal style
            'tooltip_delay': 1000,           # 1000ms delay for tooltips
            'tooltip_x_offset': 10,          # 10px right offset
            'tooltip_y_offset': 10,          # 10px down offset
            'tooltip_font_size': 6,          # 6px font size
            'tooltip_opacity': 0.9           # 90% opacity
        }
        session['user_settings'] = user_settings
    
    return render_template("index.html", user_settings=user_settings)

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        
        # Basic validation
        if not username or not email or not password:
            flash("All fields are required", "danger")
            return render_template("register.html")
        
        # Check if user already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash("Username already exists", "danger")
            return render_template("register.html")
        
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            flash("Email already registered", "danger")
            return render_template("register.html")
        
        # Create new user
        from werkzeug.security import generate_password_hash
        new_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password)
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        flash("Account created successfully! Please log in.", "success")
        return redirect(url_for("login"))
    
    return render_template("register.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        
        # Basic validation
        if not username or not password:
            flash("Both username and password are required", "danger")
            return render_template("login.html")
        
        # Verify user
        from werkzeug.security import check_password_hash
        user = User.query.filter_by(username=username).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            flash("Invalid credentials", "danger")
            return render_template("login.html")
        
        # Log in user with Flask-Login
        login_user(user, remember=True)
        
        # Set additional info in session if needed
        session["username"] = user.username
        
        flash(f"Welcome back, {user.username}!", "success")
        return redirect(url_for("dashboard"))
    
    return render_template("login.html")

@app.route("/logout")
def logout():
    logout_user()
    session.pop("username", None)
    flash("You have been logged out", "info")
    return redirect(url_for("login"))

@app.route("/dashboard")
@login_required
def dashboard():
    # Get user's projects
    projects = Project.query.filter_by(user_id=current_user.id).all()
    
    return render_template("dashboard.html", projects=projects)

@app.route("/api/upload", methods=["POST"])
@csrf.exempt
def upload_cobol():
    try:
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        session['job_id'] = job_id
        
        cobol_code = ""
        
        # Debug the request format
        logger.debug(f"Request method: {request.method}")
        logger.debug(f"Request content type: {request.content_type}")
        logger.debug(f"Request form keys: {list(request.form.keys()) if request.form else 'None'}")
        logger.debug(f"Request files keys: {list(request.files.keys()) if request.files else 'None'}")
        
        # Check if code was uploaded as file
        if 'file' in request.files and request.files['file'].filename:
            file = request.files['file']
            logger.debug(f"File uploaded: {file.filename}")
            cobol_code = file.read().decode('utf-8')
        # Check if code was pasted
        elif 'code' in request.form:
            logger.debug("Code found in form data")
            cobol_code = request.form['code']
        else:
            # Attempt to read raw data as a fallback
            try:
                raw_data = request.get_data(as_text=True)
                logger.debug(f"Trying to parse raw data: {raw_data[:100]}..." if len(raw_data) > 100 else raw_data)
                
                # If it looks like URL-encoded form data
                if "code=" in raw_data:
                    import urllib.parse
                    parsed = urllib.parse.parse_qs(raw_data)
                    if 'code' in parsed:
                        cobol_code = parsed['code'][0]
                        logger.debug("Extracted code from raw URL-encoded data")
                else:
                    # Try to parse as JSON
                    try:
                        json_data = json.loads(raw_data)
                        if 'code' in json_data:
                            cobol_code = json_data['code']
                            logger.debug("Extracted code from raw JSON data")
                    except json.JSONDecodeError:
                        logger.debug("Raw data is not valid JSON")
            except Exception as raw_error:
                logger.error(f"Error parsing raw request data: {str(raw_error)}")
                
            if not cobol_code:
                logger.error("No COBOL code found in request")
                return jsonify({"error": "No COBOL code provided"}), 400
        
        # Validate COBOL code
        if not cobol_code.strip():
            return jsonify({"error": "Empty COBOL code provided"}), 400
        
        # Store the COBOL code in session for later processing
        session['cobol_code'] = cobol_code
        
        # Debug the session data
        logger.debug(f"Stored code in session, length: {len(cobol_code)}")
        logger.debug(f"Session job_id: {job_id}")
        
        return jsonify({
            "status": "success", 
            "message": "COBOL code received", 
            "job_id": job_id
        })
        
    except Exception as e:
        logger.error(f"Error uploading COBOL code: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/process", methods=["POST"])
@csrf.exempt
def process_cobol():
    try:
        # Import the markdown conversion library
        import markdown
        
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Get the COBOL code from form (file upload or pasted code) or session
        cobol_code = None
        
        # Check if code was uploaded as file
        file_fields = ['cobolFile', 'file']  # Check multiple possible field names
        for field_name in file_fields:
            if field_name in request.files and request.files[field_name].filename:
                file = request.files[field_name]
                logger.debug(f"File uploaded: {file.filename}")
                try:
                    cobol_code = file.read().decode('utf-8')
                    break
                except Exception as e:
                    logger.error(f"Error reading file: {str(e)}")
        
        # If no file, check for pasted code
        if not cobol_code:
            for field_name in ['cobolCode', 'code']:  # Check multiple possible field names
                if field_name in request.form and request.form[field_name].strip():
                    logger.debug(f"Code found in form field: {field_name}")
                    cobol_code = request.form[field_name]
                    break
        
        # If still no code, try session
        if not cobol_code:
            cobol_code = session.get('cobol_code', '')
            if cobol_code:
                logger.debug(f"Retrieved code from session, length: {len(cobol_code)}")
            
        if not cobol_code:
            logger.error("No COBOL code found for processing")
            return jsonify({"error": "No COBOL code found for processing"}), 400
            
        # Store the code in session
        session['cobol_code'] = cobol_code
        session['job_id'] = job_id
        
        # Initialize job status in session
        session['job_status'] = {
            'status': 'processing',
            'progress_percentage': 10,
            'status_message': 'Parsing COBOL code...',
            'started_at': datetime.utcnow().isoformat(),
            'result': None,
            'error': None
        }
        
        # Step 1: Parse COBOL code
        parsed_structure = parse_cobol(cobol_code)
        
        # Step 2: Extract structured information using Perplexity AI
        structured_data = extract_structure(cobol_code, parsed_structure)
        
        # Step 3: Generate documentation with Perplexity AI
        documentation = generate_documentation(structured_data)
        
        # Step 4: Generate diagrams for the documentation with Perplexity AI
        final_documentation = generate_diagrams(documentation)
        
        # Step 5: Enhance with tabbed diagram views if needed
        if '```mermaid' in final_documentation and '<div class="mermaid-container">' not in final_documentation:
            try:
                from utils.mermaid_viewer import enhance_markdown_with_tabs
                final_documentation = enhance_markdown_with_tabs(final_documentation)
                logger.debug("Enhanced documentation with tabbed diagram views")
            except Exception as e:
                logger.warning(f"Could not enhance documentation with tabbed diagram views: {str(e)}")
        
        # Store documentation in a temporary file rather than in the session
        doc_id = str(uuid.uuid4())
        session['doc_id'] = doc_id
        tmp_path = f"/tmp/{doc_id}.md"
        
        # Write documentation to temporary file
        with open(tmp_path, "w") as f:
            f.write(final_documentation)
            
        # Store just basic metadata in session
        doc_metadata = {
            'length': len(final_documentation),
            'timestamp': datetime.utcnow().isoformat(),
        }
        session['doc_metadata'] = doc_metadata
        
        # Store the documentation in the session as well for job status endpoint
        session['documentation'] = final_documentation
        
        # Store program ID in session for the download filename
        if structured_data and 'program_id' in structured_data:
            session['program_id'] = structured_data.get('program_id')
        
        # Convert Markdown to HTML on server-side
        # Define custom extensions for proper markdown processing
        md = markdown.Markdown(
            extensions=[
                'markdown.extensions.extra',
                'markdown.extensions.codehilite',
                'markdown.extensions.tables',
                'markdown.extensions.toc'
            ]
        )
        
        try:
            # Replace mermaid code blocks with proper divs for mermaid.js
            # This preserves mermaid blocks for client-side rendering
            try:
                mermaid_processed = final_documentation
                mermaid_blocks = re.findall(r'```mermaid([\s\S]*?)```', mermaid_processed)
                
                for i, block in enumerate(mermaid_blocks):
                    # Replace each mermaid code block with a div
                    mermaid_processed = mermaid_processed.replace(
                        f"```mermaid{block}```",
                        f'<div class="mermaid">{block.strip()}</div>',
                        1  # Replace only the first occurrence each time
                    )
                logger.debug(f"Processed {len(mermaid_blocks)} mermaid blocks")
            except Exception as mermaid_error:
                logger.error(f"Error processing mermaid blocks: {str(mermaid_error)}")
                # If mermaid processing fails, use original documentation
                mermaid_processed = final_documentation
            
            # Process regular markdown after handling mermaid blocks
            try:
                html_content = md.convert(mermaid_processed)
                logger.info("Successfully converted markdown to HTML on server-side")
                
                # Additional step to fix code blocks and ensure HTML is valid for JSON
                html_content = re.sub(
                    r'<code>(.*?)</code>',
                    lambda m: f'<code>{m.group(1).replace("<", "&lt;").replace(">", "&gt;")}</code>',
                    html_content,
                    flags=re.DOTALL
                )
                
                # Update the job status to completed
                session['job_status'] = {
                    'status': 'completed',
                    'progress_percentage': 100,
                    'status_message': 'Documentation generated successfully',
                    'result': {
                        'documentation': html_content,
                        'format': 'html',
                        'job_id': job_id
                    }
                }
                
                # Create a Response object with explicit content-type
                from flask import Response
                response_data = json.dumps({
                    "status": "success",
                    "job_id": job_id,
                    "documentation": html_content,
                    "format": "html"
                })
                
                return Response(
                    response=response_data,
                    status=200,
                    mimetype="application/json"
                )
            except Exception as html_error:
                logger.error(f"Error during HTML conversion/escaping: {str(html_error)}")
                
                # Update the job status to completed but with markdown format
                session['job_status'] = {
                    'status': 'completed',
                    'progress_percentage': 100,
                    'status_message': 'Documentation generated successfully (markdown format)',
                    'result': {
                        'documentation': final_documentation,
                        'format': 'markdown',
                        'job_id': job_id
                    }
                }
                
                # If HTML conversion fails, use original markdown as fallback
                return jsonify({
                    "status": "success",
                    "job_id": job_id,
                    "documentation": final_documentation,
                    "format": "markdown"
                })
            
        except Exception as md_error:
            logger.error(f"Error converting markdown to HTML: {str(md_error)}")
            # Fall back to sending raw markdown
            return jsonify({
                "status": "success",
                "job_id": job_id,
                "documentation": final_documentation,
                "format": "markdown"
            })
        
    except Exception as e:
        logger.error(f"Error processing COBOL code: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/agent/process", methods=["POST"])
@csrf.exempt
def agent_process_cobol():
    try:
        # Import the agent
        from agent_fixed import COBOLDocumentationAgent
        
        # Log full request information for debugging
        logger.info(f"API Agent Process - Request method: {request.method}")
        logger.info(f"API Agent Process - Request content type: {request.content_type}")
        logger.info(f"API Agent Process - Request form keys: {list(request.form.keys()) if request.form else 'None'}")
        logger.info(f"API Agent Process - Request headers: {dict(request.headers)}")
        logger.info(f"API Agent Process - Request query string: {request.query_string.decode('utf-8') if request.query_string else 'None'}")
        
        # Safely print the request data for debugging
        try:
            # Log the first part of different types of request data for debugging
            request_data = request.get_data(as_text=True)
            logger.info(f"API Agent Process - Raw request data first 100 chars: {request_data[:100]}")
            
            if request.form:
                logger.info(f"API Agent Process - Form data available with keys: {list(request.form.keys())}")
            if request.json:
                logger.info(f"API Agent Process - JSON data available with keys: {list(request.json.keys())}")
                
            # Log CSRF token presence
            csrf_token = request.form.get('csrf_token') or request.headers.get('X-CSRFToken')
            logger.info(f"API Agent Process - CSRF token present: {bool(csrf_token)}")
            
        except Exception as data_error:
            logger.error(f"API Agent Process - Error getting request data: {str(data_error)}")
        
        # Get the COBOL code from session
        cobol_code = session.get('cobol_code', '')
        job_id = session.get('job_id', str(uuid.uuid4()))
        user_id = session.get('user_id')
        
        if not cobol_code:
            return jsonify({"error": "No COBOL code found for processing"}), 400
        
        # Create an agent instance
        agent = COBOLDocumentationAgent(session_id=job_id, user_id=user_id)
        
        # Get user preferences from session
        user_settings = session.get('user_settings', {})
        if user_settings:
            for key, value in user_settings.items():
                agent.set_user_preference(key, value)
                
        # Get job_id and preferences from form data (new URL-encoded format)
        preferences = {}
        
        # Get job_id from form data or URL params if available
        form_job_id = request.form.get('job_id')
        if form_job_id:
            job_id = form_job_id
            logger.debug(f"Using job_id from form data: {job_id}")
        
        # Handle individual preference fields as sent from the frontend
        if request.form:
            logger.debug(f"Form data received: {list(request.form.keys())}")
            llm_provider = request.form.get('llm_provider')
            llm_model = request.form.get('llm_model')
            detail_level = request.form.get('detail_level')
            audience = request.form.get('audience')
            doc_style = request.form.get('documentation_style')
            
            # Create preferences dictionary from individual fields
            if llm_provider:
                preferences['llm_provider'] = llm_provider
            if llm_model:
                preferences['llm_model'] = llm_model
            if detail_level:
                preferences['detail_level'] = detail_level
            if audience:
                preferences['audience'] = audience
            if doc_style:
                preferences['documentation_style'] = doc_style
            
            logger.debug(f"Constructed preferences from form fields: {preferences}")
        # Fall back to JSON data if form data isn't in the expected format
        elif request.json:
            if 'preferences' in request.json:
                preferences = request.json.get('preferences', {})
            else:
                # Try to build preferences from individual fields in JSON
                preferences = {
                    'llm_provider': request.json.get('llm_provider'),
                    'llm_model': request.json.get('llm_model'),
                    'detail_level': request.json.get('detail_level'),
                    'audience': request.json.get('audience'),
                    'documentation_style': request.json.get('documentation_style')
                }
                # Remove None values
                preferences = {k: v for k, v in preferences.items() if v is not None}
            
            logger.debug(f"Got preferences from JSON data: {preferences}")
        
        # Apply the preferences
        for key, value in preferences.items():
            logger.debug(f"Setting user preference: {key} = {value}")
            agent.set_user_preference(key, value)
        
        # Step 1: Parse COBOL code
        parsed_structure = parse_cobol(cobol_code)
        
        # Step 2: Use agent to analyze code and generate documentation
        structured_data = agent.analyze_cobol_structure(cobol_code, parsed_structure)
        documentation = agent.generate_documentation(structured_data)
        
        # Step 3: Ensure the mermaid tabs are applied
        if '```mermaid' in documentation and '<div class="mermaid-container">' not in documentation:
            try:
                from utils.mermaid_viewer import enhance_markdown_with_tabs
                documentation = enhance_markdown_with_tabs(documentation)
                logger.debug("Enhanced documentation with tabbed diagram views in agent processing")
            except Exception as e:
                logger.warning(f"Could not enhance documentation with tabbed diagram views: {str(e)}")
        
        # Store only necessary data in session
        # Store the program_id in session for the download filename
        # Full documentation is too large for session cookie, so we'll limit it
        
        # Store only program_id and a truncated version of the documentation
        if structured_data and 'program_id' in structured_data:
            session['program_id'] = structured_data.get('program_id')
            
        # Store documentation in a temporary file rather than in the session
        doc_id = str(uuid.uuid4())
        session['doc_id'] = doc_id
        tmp_path = f"/tmp/{doc_id}.md"
        
        # Write documentation to temporary file
        with open(tmp_path, "w") as f:
            f.write(documentation)
            
        # Store just basic metadata in session
        doc_metadata = {
            'length': len(documentation),
            'timestamp': datetime.utcnow().isoformat(),
        }
        session['doc_metadata'] = doc_metadata
        
        # If user is logged in, save the documentation
        if user_id:
            try:
                # Get the project, or create one if it doesn't exist
                project = Project.query.filter_by(
                    user_id=user_id,
                    name=f"COBOL Documentation - {structured_data.get('program_id', 'Unknown')}"
                ).first()
                
                if not project:
                    project = Project(
                        name=f"COBOL Documentation - {structured_data.get('program_id', 'Unknown')}",
                        description=structured_data.get('description', 'No description available'),
                        user_id=user_id
                    )
                    db.session.add(project)
                    db.session.flush()
                
                # Create or update the COBOL file
                cobol_file = CobolFile.query.filter_by(
                    project_id=project.id,
                    program_id=structured_data.get('program_id', 'Unknown')
                ).first()
                
                if not cobol_file:
                    cobol_file = CobolFile(
                        filename=f"{structured_data.get('program_id', 'program')}.cbl",
                        content=cobol_code,
                        program_id=structured_data.get('program_id', 'Unknown'),
                        project_id=project.id
                    )
                    db.session.add(cobol_file)
                    db.session.flush()
                else:
                    cobol_file.content = cobol_code
                    cobol_file.updated_at = datetime.utcnow()
                
                # Create or update the documentation
                doc = Documentation.query.filter_by(cobol_file_id=cobol_file.id).first()
                if not doc:
                    doc = Documentation(
                        content=documentation,
                        cobol_file_id=cobol_file.id
                    )
                    db.session.add(doc)
                else:
                    doc.content = documentation
                    doc.updated_at = datetime.utcnow()
                
                db.session.commit()
                logger.info(f"Saved documentation for user {user_id}")
                
            except Exception as db_error:
                logger.error(f"Error saving documentation to database: {str(db_error)}")
                db.session.rollback()
        
        # Convert Markdown to HTML on server-side
        import markdown
        import re  # Ensure re is imported
        
        # Define custom extensions for proper markdown processing
        md = markdown.Markdown(
            extensions=[
                'markdown.extensions.extra',
                'markdown.extensions.codehilite',
                'markdown.extensions.tables',
                'markdown.extensions.toc'
            ]
        )
        
        try:
            # Replace mermaid code blocks with proper divs for mermaid.js
            # This preserves mermaid blocks for client-side rendering
            mermaid_processed = documentation
            mermaid_blocks = re.findall(r'```mermaid([\s\S]*?)```', mermaid_processed)
            
            for i, block in enumerate(mermaid_blocks):
                # Replace each mermaid code block with a div
                mermaid_processed = mermaid_processed.replace(
                    f"```mermaid{block}```",
                    f'<div class="mermaid">{block.strip()}</div>',
                    1  # Replace only the first occurrence each time
                )
            
            # Process regular markdown after handling mermaid blocks
            html_content = md.convert(mermaid_processed)
            logger.info("Successfully converted markdown to HTML on server-side in agent process")
            
            # Additional step to fix code blocks
            html_content = re.sub(
                r'<code>(.*?)</code>',
                lambda m: f'<code>{m.group(1).replace("<", "&lt;").replace(">", "&gt;")}</code>',
                html_content,
                flags=re.DOTALL
            )
            
            # Create a direct response with explicit content-type
            response_data = json.dumps({
                "status": "success",
                "job_id": job_id,
                "documentation": html_content,
                "format": "html",
                "program_details": {
                    "program_id": structured_data.get("program_id", "Unknown"),
                    "description": structured_data.get("description", "No description available")
                }
            })
            
            # Create a Response object with explicit content-type
            response = Response(
                response=response_data,
                status=200,
                mimetype="application/json"
            )
            
            # Add CORS and other headers
            response.headers["Content-Type"] = "application/json; charset=utf-8"
            response.headers["Access-Control-Allow-Origin"] = "*"
            
            logger.info(f"Sending success response with content type: {response.headers['Content-Type']}")
            
            return response
            
        except Exception as md_error:
            logger.error(f"Error converting markdown to HTML in agent process: {str(md_error)}")
            # Fall back to sending raw markdown with explicit content type
            response_data = json.dumps({
                "status": "success",
                "job_id": job_id,
                "documentation": documentation,
                "format": "markdown",
                "program_details": {
                    "program_id": structured_data.get("program_id", "Unknown"),
                    "description": structured_data.get("description", "No description available")
                }
            })
            
            # Create a Response object with explicit content-type
            response = Response(
                response=response_data,
                status=200,
                mimetype="application/json"
            )
            
            # Add CORS and other headers
            response.headers["Content-Type"] = "application/json; charset=utf-8"
            response.headers["Access-Control-Allow-Origin"] = "*"
            
            logger.info(f"Sending fallback markdown response with content type: {response.headers['Content-Type']}")
            
            return response
        
    except Exception as e:
        logger.error(f"Error in agent processing COBOL code: {str(e)}")
        
        # Create an error response with explicit content type
        response_data = json.dumps({"error": str(e)})
        
        # Create a Response object with explicit content-type
        response = Response(
            response=response_data,
            status=500,
            mimetype="application/json"
        )
        
        # Add CORS and other headers
        response.headers["Content-Type"] = "application/json; charset=utf-8"
        response.headers["Access-Control-Allow-Origin"] = "*"
        
        logger.info(f"Sending error response with content type: {response.headers['Content-Type']}")
        
        return response

@app.route("/api/job-status", methods=["GET"])
@csrf.exempt
def get_job_status():
    """Get the status of a background job"""
    try:
        job_id = request.args.get('job_id')
        if not job_id:
            return jsonify({"error": "No job ID provided"}), 400
            
        # Log information for troubleshooting
        logger.debug(f"Job status request for job_id: {job_id}")
            
        # Check if we have the requested job ID in the session
        session_job_id = session.get('job_id')
        documentation = session.get('documentation')
        job_status = session.get('job_status', {})
        doc_id = session.get('doc_id')
        
        logger.debug(f"Session job_id: {session_job_id}, doc_id: {doc_id}")
        
        # Check if we have temporary file documentation
        if doc_id:
            tmp_path = f"/tmp/{doc_id}.md"
            try:
                if os.path.exists(tmp_path):
                    with open(tmp_path, "r") as f:
                        documentation = f.read()
                    logger.debug(f"Retrieved documentation from temp file: {tmp_path}")
            except Exception as temp_error:
                logger.error(f"Error reading temp documentation: {str(temp_error)}")
        
        if session_job_id and session_job_id == job_id and documentation:
            # We have the documentation in the session or temp file, job is complete
            logger.debug(f"Returning completed status for job_id: {job_id}")
            return jsonify({
                'status': 'completed',
                'progress_percentage': 100,
                'status_message': 'Documentation generated successfully',
                'result': {
                    'job_id': job_id,
                    'markdown': documentation
                }
            })
        elif session_job_id and session_job_id == job_id and job_status:
            # Job is known and we have status information
            # Return the status stored in the session
            logger.debug(f"Returning stored job status for job_id: {job_id}")
            return jsonify(job_status)
        elif session_job_id and session_job_id == job_id:
            # Job is known but no detailed status or documentation yet
            logger.debug(f"Returning processing status for job_id: {job_id}")
            return jsonify({
                'status': 'processing',
                'progress_percentage': 50,
                'status_message': 'Processing COBOL code...'
            })
        
        # For unknown job IDs, return an "in progress" response instead of 404
        # This prevents client-side errors during polling
        logger.warning(f"Unknown job_id requested: {job_id}, returning fallback processing status")
        return jsonify({
            'status': 'processing',
            'progress_percentage': 30,
            'status_message': 'Initializing job...'
        })
    except Exception as e:
        logger.error(f"Error getting job status: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/translate", methods=["POST"])
def translate():
    try:
        # Get doc_id from session
        doc_id = session.get('doc_id')
        target_language = request.form.get('language', 'en')
        
        if not doc_id:
            return jsonify({"error": "No documentation found for translation"}), 400
        
        # Read from temporary file
        tmp_path = f"/tmp/{doc_id}.md"
        
        try:
            with open(tmp_path, "r") as f:
                documentation = f.read()
        except FileNotFoundError:
            return jsonify({"error": "Documentation file not found, it may have expired"}), 400
        
        # Translate the documentation
        translated_doc = translate_documentation(documentation, target_language)
        
        # Create a new temp file for the translated version
        translated_doc_id = str(uuid.uuid4())
        translated_tmp_path = f"/tmp/{translated_doc_id}.md"
        
        # Save the translated documentation to a new temp file
        with open(translated_tmp_path, "w") as f:
            f.write(translated_doc)
            
        # Update session with the new doc_id
        session['doc_id'] = translated_doc_id
        session['doc_metadata'] = {
            'length': len(translated_doc),
            'timestamp': datetime.utcnow().isoformat(),
            'language': target_language
        }
        
        return jsonify({
            "status": "success",
            "translated_documentation": translated_doc
        })
        
    except Exception as e:
        logger.error(f"Error translating documentation: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/download", methods=["GET"])
def download_documentation():
    try:
        # Get doc_id from session
        doc_id = session.get('doc_id')
        
        if not doc_id:
            return jsonify({"error": "No documentation found for download"}), 400
        
        # Try to read from the temporary file
        tmp_path = f"/tmp/{doc_id}.md"
        
        try:
            with open(tmp_path, "r") as f:
                documentation = f.read()
        except FileNotFoundError:
            return jsonify({"error": "Documentation file not found, it may have expired"}), 400
        
        # Get program ID for the filename if available
        program_id = session.get('program_id', 'cobol')
        
        # Generate timestamp in GMT+0 format (pass 0 to timestamp function)
        ts = timestamp(timezone_offset=0)
        
        # Create a filename with the timestamp prefix in YYMMDD_HHMMSS format
        # Extract only the date/time part from the timestamp (remove the GMT part)
        ts_prefix = ts.split()[0]  # Get just the YYYYMMDD_HHMMSS part
        filename = f"{ts_prefix}_{program_id}_documentation.md"
        
        # Use the existing file rather than creating another copy
        return send_file(tmp_path, as_attachment=True, download_name=filename)
        
    except Exception as e:
        logger.error(f"Error downloading documentation: {str(e)}")
        return jsonify({"error": str(e)}), 500
        
@app.route("/api/validate-mermaid", methods=["POST"])
def validate_mermaid():
    try:
        # Get Mermaid code from request
        mermaid_code = request.form.get('mermaid_code', '')
        
        if not mermaid_code:
            return jsonify({"error": "No Mermaid code provided"}), 400
        
        # Import the validator
        from utils.perplexity_client import validate_mermaid_syntax
        
        # Validate the Mermaid code
        is_valid, corrected_code, message = validate_mermaid_syntax(mermaid_code)
        
        # Log the validation attempt
        if not is_valid:
            logger.info(f"Mermaid validation: {message}")
        
        return jsonify({
            "is_valid": is_valid,
            "corrected_code": corrected_code,
            "message": message,
            "original_code": mermaid_code
        })
        
    except Exception as e:
        logger.error(f"Error validating Mermaid code: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/llm-settings", methods=["GET", "POST"])
@login_required
def llm_settings():
    # Get available LLM providers and models
    available_providers = llm_selector.get_providers()
    
    # Get current user settings
    user_settings = {}
    if hasattr(current_user, 'id'):
        # TODO: Load user settings from database when implemented
        # For now, use session as temporary storage
        user_settings = session.get('user_settings', {})
    
    # Default settings if none exist
    if not user_settings:
        user_settings = {
            'llm_provider': 'groq',         # Default to GROQ
            'llm_model': None,              # Will be set to default for the provider
            'detail_level': 'medium',       # medium detail level
            'audience': 'technical',        # technical audience
            'documentation_style': 'formal', # formal style
            'tooltip_delay': 1000,          # 1000ms delay for tooltips
            'tooltip_x_offset': 10,         # 10px right offset
            'tooltip_y_offset': 10,         # 10px down offset
            'tooltip_font_size': 6,         # 6px font size
            'tooltip_opacity': 0.9          # 90% opacity
        }
        session['user_settings'] = user_settings
    
    # Handle form submission
    if request.method == "POST":
        # Update LLM settings
        user_settings['llm_provider'] = request.form.get('llm_provider', user_settings['llm_provider'])
        user_settings['llm_model'] = request.form.get('llm_model', user_settings['llm_model'])
        user_settings['detail_level'] = request.form.get('detail_level', user_settings['detail_level'])
        user_settings['audience'] = request.form.get('audience', user_settings['audience'])
        user_settings['documentation_style'] = request.form.get('documentation_style', user_settings['documentation_style'])
        
        # Save settings to session
        session['user_settings'] = user_settings
        
        # TODO: Save user settings to database when implemented
        
        flash("LLM settings updated successfully", "success")
        return redirect(url_for('llm_settings'))
    
    # Get models for the currently selected provider
    current_provider = user_settings.get('llm_provider', 'groq')
    available_models = []
    
    if current_provider in available_providers:
        available_models = llm_selector.get_models(current_provider)
    elif current_provider == 'groq' and os.environ.get('GROQ_API_KEY'):
        # Special case for Groq if not in selector but API key exists
        available_models = get_groq_models()
    
    # Check if API keys are set
    has_perplexity_key = bool(os.environ.get('PERPLEXITY_API_KEY'))
    has_groq_key = bool(os.environ.get('GROQ_API_KEY'))
    
    return render_template("llm_settings.html", 
                          user_settings=user_settings,
                          available_providers=available_providers,
                          available_models=available_models,
                          has_perplexity_key=has_perplexity_key,
                          has_groq_key=has_groq_key)

@app.route("/tooltip-settings", methods=["GET", "POST"])
@login_required
def tooltip_settings():
    # Get current user settings
    user_settings = {}
    if hasattr(current_user, 'id'):
        # For now, use session as temporary storage
        user_settings = session.get('user_settings', {})
    
    # Default settings if none exist
    if not user_settings:
        user_settings = {
            'llm_provider': 'groq',         # Default to GROQ
            'llm_model': None,              # Will be set to default for the provider
            'detail_level': 'medium',       # medium detail level
            'audience': 'technical',        # technical audience
            'documentation_style': 'formal', # formal style
            'tooltip_delay': 1000,          # 1000ms delay for tooltips
            'tooltip_x_offset': 10,         # 10px right offset
            'tooltip_y_offset': 10,         # 10px down offset
            'tooltip_font_size': 6,         # 6px font size
            'tooltip_opacity': 0.9          # 90% opacity
        }
        session['user_settings'] = user_settings
    
    # Handle form submission
    if request.method == "POST":
        # Update tooltip settings
        try:
            tooltip_delay = int(request.form.get('tooltip_delay', 1000))
            tooltip_x_offset = int(request.form.get('tooltip_x_offset', 10))
            tooltip_y_offset = int(request.form.get('tooltip_y_offset', 10))
            tooltip_font_size = int(request.form.get('tooltip_font_size', 10))
            # Get the value and check for NaN before conversion
            opacity_value = request.form.get('tooltip_opacity', '0.9')
            if opacity_value.lower() == 'nan':
                tooltip_opacity = 0.9  # Default if NaN is detected
            else:
                try:
                    tooltip_opacity = float(opacity_value)
                    # Check for NaN after conversion (handles case sensitivity)
                    if tooltip_opacity != tooltip_opacity:  # NaN check - NaN is the only value that doesn't equal itself
                        tooltip_opacity = 0.9
                except ValueError:
                    tooltip_opacity = 0.9
            
            # Add validation to ensure reasonable values
            user_settings['tooltip_delay'] = max(0, min(5000, tooltip_delay))  # 0-5000ms
            user_settings['tooltip_x_offset'] = max(-500, min(500, tooltip_x_offset))  # -500px to +500px
            user_settings['tooltip_y_offset'] = max(-500, min(500, tooltip_y_offset))  # -500px to +500px
            user_settings['tooltip_font_size'] = max(6, min(48, tooltip_font_size))  # 6-48px font size
            user_settings['tooltip_opacity'] = max(0.1, min(1.0, tooltip_opacity))  # 0.1-1.0 opacity
            
            # Update the actual JS file with new default values
            try:
                with open('static/js/tooltip-config.js', 'r') as file:
                    content = file.read()
                    
                # Update default values using regex
                import re
                # Replace delay value
                content = re.sub(r'(delay:)\s*(\d+),', f'delay: {user_settings["tooltip_delay"]},', content)
                # Replace xOffset value
                content = re.sub(r'(xOffset:)\s*(-?\d+),', f'xOffset: {user_settings["tooltip_x_offset"]},', content)
                # Replace yOffset value
                content = re.sub(r'(yOffset:)\s*(-?\d+),', f'yOffset: {user_settings["tooltip_y_offset"]},', content)
                # Replace fontSize value
                content = re.sub(r'(fontSize:)\s*(\d+),', f'fontSize: {user_settings["tooltip_font_size"]},', content)
                # Replace opacity value if it exists
                if re.search(r'(opacity:)\s*([\d\.]+)', content):
                    content = re.sub(r'(opacity:)\s*([\d\.]+)', f'opacity: {user_settings["tooltip_opacity"]},', content)
                else:
                    # Add opacity setting if it doesn't exist
                    content = content.replace('fontSize:', 'opacity: ' + str(user_settings["tooltip_opacity"]) + ',\n    fontSize:')
                
                # Write back the updated content
                with open('static/js/tooltip-config.js', 'w') as file:
                    file.write(content)
                
                app.logger.info(f"Updated tooltip-config.js with new defaults: delay={user_settings['tooltip_delay']}, " +
                               f"xOffset={user_settings['tooltip_x_offset']}, yOffset={user_settings['tooltip_y_offset']}, " +
                               f"fontSize={user_settings['tooltip_font_size']}, opacity={user_settings['tooltip_opacity']}")
                
            except Exception as e:
                app.logger.error(f"Failed to update tooltip-config.js: {str(e)}")
                # This is just a convenience feature, so we don't need to fail if it doesn't work
                flash("Settings saved to session but could not update JS file: " + str(e), "warning")
                
        except ValueError:
            # If conversion fails, use default values
            user_settings['tooltip_delay'] = 1000
            user_settings['tooltip_x_offset'] = 10
            user_settings['tooltip_y_offset'] = 10
            user_settings['tooltip_font_size'] = 6
            user_settings['tooltip_opacity'] = 0.9
            flash("Invalid tooltip settings provided. Using default values.", "warning")
        
        # Save settings to session
        session['user_settings'] = user_settings
        
        # TODO: Save user settings to database when implemented
        
        flash("Tooltip settings updated successfully", "success")
        return redirect(url_for('tooltip_settings'))
    
    return render_template("tooltip_settings.html", user_settings=user_settings)

@app.route("/settings")
@login_required
def settings():
    # Redirect to LLM settings page
    return redirect(url_for('llm_settings'))

@app.route("/admin/db-dump")
@login_required
def db_dump():
    """
    Database dump page for administrators
    """
    return render_template("admin/db_dump.html")

@app.route("/api/models", methods=["GET"])
def get_models():
    provider = request.args.get('provider', 'groq')
    
    # Get models for the specified provider
    if provider in llm_selector.get_providers():
        models = llm_selector.get_models(provider)
    elif provider == 'groq' and os.environ.get('GROQ_API_KEY'):
        # Special case for Groq if not in selector but API key exists
        models = get_groq_models()
    else:
        models = []
    
    return jsonify({
        "provider": provider,
        "models": models
    })

@app.route("/api/llm-settings", methods=["GET"])
def get_llm_settings():
    """Get current LLM settings for use in the index page"""
    # Get user settings from session
    user_settings = {}
    if hasattr(current_user, 'id'):
        user_settings = session.get('user_settings', {})
    
    # Default settings if none exist
    if not user_settings:
        user_settings = {
            'llm_provider': 'groq',          # Default to GROQ
            'llm_model': None,               # Will be set to default for the provider
            'detail_level': 'medium',        # medium detail level
            'audience': 'technical',         # technical audience
            'documentation_style': 'formal', # formal style
            'tooltip_delay': 1000,           # 1000ms delay for tooltips
            'tooltip_x_offset': 10,          # 10px right offset
            'tooltip_y_offset': 10,          # 10px down offset
            'tooltip_font_size': 12,         # 12px font size
            'tooltip_opacity': 0.75          # 75% opacity
        }
        session['user_settings'] = user_settings
    
    # Check if API keys are set
    has_perplexity_key = bool(os.environ.get('PERPLEXITY_API_KEY'))
    has_groq_key = bool(os.environ.get('GROQ_API_KEY'))
    
    # Get models for the current provider
    models = []
    current_provider = user_settings.get('llm_provider', 'groq')
    
    if current_provider in llm_selector.get_providers():
        models = llm_selector.get_models(current_provider)
    elif current_provider == 'groq' and has_groq_key:
        models = get_groq_models()
    
    # Create a JavaScript-friendly data structure
    settings_data = {
        "settings": user_settings,
        "has_perplexity_key": has_perplexity_key,
        "has_groq_key": has_groq_key,
        "available_models": models
    }
    
    return jsonify(settings_data)

@app.route("/api/check-keys", methods=["GET"])
def check_api_keys():
    """Check if API keys are available and prompt user if needed"""
    # Get current provider from user settings or from query parameters
    provider = request.args.get('provider', None)
    
    if current_user.is_authenticated:
        user_settings = session.get('user_settings', {})
        if not provider:
            provider = user_settings.get('llm_provider', 'groq')
    else:
        # For unauthenticated users, default to 'groq' if not specified
        if not provider:
            provider = 'groq'
    
    result = {
        "perplexity": {"available": bool(os.environ.get('PERPLEXITY_API_KEY'))},
        "groq": {"available": bool(os.environ.get('GROQ_API_KEY'))},
        "selected_provider": provider,
        "needs_key": False
    }
    
    # Check if the selected provider needs a key
    if provider == 'perplexity' and not result["perplexity"]["available"]:
        result["needs_key"] = True
    elif provider == 'groq' and not result["groq"]["available"]:
        result["needs_key"] = True
    
    return jsonify(result)

@app.route("/api/save-keys", methods=["POST"])
def save_api_keys():
    # In production, you would save these keys securely
    # For simplicity, we'll save them in environment variables
    perplexity_key = request.form.get('perplexity_key')
    groq_key = request.form.get('groq_key')
    
    result = {
        "perplexity": {"updated": False, "message": ""},
        "groq": {"updated": False, "message": ""}
    }
    
    if perplexity_key:
        # In a real app, you would store this securely
        # For demo, we'll set it in environment variables
        os.environ['PERPLEXITY_API_KEY'] = perplexity_key
        result["perplexity"]["updated"] = True
        result["perplexity"]["message"] = "Perplexity API key updated successfully"
        
        # For authenticated users, save the preference
        if current_user.is_authenticated:
            user_settings = session.get('user_settings', {})
            user_settings['has_perplexity_key'] = True
            session['user_settings'] = user_settings
        
    if groq_key:
        # In a real app, you would store this securely
        # For demo, we'll set it in environment variables
        os.environ['GROQ_API_KEY'] = groq_key
        result["groq"]["updated"] = True
        result["groq"]["message"] = "Groq API key updated successfully"
        
        # For authenticated users, save the preference
        if current_user.is_authenticated:
            user_settings = session.get('user_settings', {})
            user_settings['has_groq_key'] = True
            session['user_settings'] = user_settings
        
        # Reinitialize the LLM selector to recognize the new API key
        if "groq" not in llm_selector.get_providers():
            llm_selector._initialize_providers()
    
    return jsonify(result)


# Ledger Management Routes
@app.route("/ledger")
@login_required
def ledger_dashboard():
    """
    Display the source code ledger dashboard
    """
    try:
        # Get user settings for the document generator component
        user_settings = {}
        
        # Get LLM provider settings
        try:
            # Get user settings from session
            llm_settings_data = {}
            if hasattr(current_user, 'id'):
                llm_settings_data = session.get('user_settings', {})
            
            # Default settings if none exist
            if not llm_settings_data:
                llm_settings_data = {
                    'llm_provider': 'groq',          # Default to GROQ
                    'llm_model': None,               # Will be set to default for the provider
                    'detail_level': 'medium',        # medium detail level
                    'audience': 'technical',         # technical audience
                    'documentation_style': 'formal', # formal style
                    'tooltip_delay': 1000,           # 1000ms delay for tooltips
                    'tooltip_x_offset': 10,          # 10px right offset
                    'tooltip_y_offset': 10,          # 10px down offset
                    'tooltip_font_size': 12,         # 12px font size
                    'tooltip_opacity': 0.75          # 75% opacity
                }
                session['user_settings'] = llm_settings_data
                
            # Update user settings with session data
            user_settings.update(llm_settings_data)
        except Exception as llm_err:
            print(f"Error getting LLM settings: {str(llm_err)}")
            app.logger.error(f"Error getting LLM settings: {str(llm_err)}")
            # Continue without LLM settings
            user_settings['llm_provider'] = 'groq'  # Default fallback
            user_settings['llm_model'] = 'default'  # Default fallback
        
        # Check if API keys are available
        try:
            api_key_status = check_api_keys()
        except Exception as api_err:
            print(f"Error checking API keys: {str(api_err)}")
            app.logger.error(f"Error checking API keys: {str(api_err)}")
            api_key_status = {'has_groq': False, 'has_perplexity': False}
        
        # Log the dashboard access
        print(f"Ledger dashboard accessed by: {current_user.username if current_user.is_authenticated else 'anonymous'}")
        print(f"User settings for dashboard: {user_settings}")
        
        # Pass all needed data to the template
        return render_template(
            "ledger/dashboard.html",
            user_settings=user_settings,
            api_key_status=api_key_status
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in ledger_dashboard: {str(e)}")
        print(error_details)
        
        # Return a basic error page with the error details
        return f"""
        <html>
        <head><title>Dashboard Error</title>
        <style>
            body {{ background-color: #111; color: #00ffff; font-family: 'IBM Plex Sans Condensed', monospace; padding: 20px; }}
            .error {{ background-color: #222; padding: 20px; border-radius: 5px; white-space: pre-wrap; }}
            h1 {{ color: #ff4757; }}
            a {{ color: #00ffff; }}
        </style>
        </head>
        <body>
            <h1>Dashboard Error</h1>
            <p>An error occurred while loading the ledger dashboard:</p>
            <div class="error">{str(e)}</div>
            <h2>Details:</h2>
            <div class="error">{error_details}</div>
            <p><a href="/">Return to home page</a></p>
        </body>
        </html>
        """, 500

@app.route("/api/db-test")
@login_required
def db_test():
    """
    Simple test endpoint for database connection and queries
    """
    logger.debug("Database test endpoint called")
    try:
        from utils.ledger_sql import LedgerSQL
        
        # Get database info
        db_info = LedgerSQL.get_database_info()
        logger.debug(f"Database info: {db_info}")
        
        # Run a simple query
        tables_query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        logger.debug(f"Running test query: {tables_query}")
        tables = LedgerSQL.execute_query(tables_query, fetch_all=True)
        
        # Get row count
        user_count_query = "SELECT COUNT(*) FROM \"user\""
        logger.debug(f"Running user count query: {user_count_query}")
        user_count = LedgerSQL.execute_query(user_count_query, fetch_one=True)
        
        response_data = {
            "success": True,
            "db_connected": db_info.get('connected', False),
            "db_name": db_info.get('database', 'Unknown'),
            "tables": [table[0] for table in tables] if tables else [],
            "user_count": user_count[0] if user_count else 0,
            "message": "Database test completed successfully"
        }
        logger.debug(f"DB test response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Database test error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Database test failed"
        }), 500

@app.route("/api/execute-sql", methods=["POST"])
@login_required
def execute_sql():
    """
    Execute SQL query for testing database
    """
    import traceback
    from utils.ledger_sql import LedgerSQL
    
    # Debug request information
    logger.debug(f"execute_sql called by user: {current_user.username if current_user else 'Unknown'}")
    logger.debug(f"Request JSON: {request.json}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    
    # Get the query
    query = request.json.get('query', '') if request.json else ''
    logger.debug(f"Received SQL query: {query}")
    
    if not query:
        logger.warning("Empty SQL query received")
        return jsonify({"success": False, "message": "No SQL query provided"}), 400
    
    # Basic security check - only allow SELECT queries
    if not query.strip().lower().startswith('select'):
        logger.warning(f"Security check failed - non-SELECT query attempted: {query}")
        return jsonify({
            "success": False, 
            "message": "For security reasons, only SELECT queries are allowed"
        }), 403
    
    try:
        # Check if database is connected
        db_info = LedgerSQL.get_database_info()
        if not db_info.get('connected', False):
            logger.error("Database not connected")
            return jsonify({
                "success": False,
                "message": "Database connection error. Please check the database configuration."
            }), 500
        
        # Execute the query using our LedgerSQL module
        logger.debug(f"Executing SQL query via LedgerSQL: {query}")
        result = LedgerSQL.execute_query(query, fetch_all=True)
        
        if result is None:
            logging.error("SQL query returned None (possible execution error)")
            return jsonify({
                "success": False,
                "message": "Query execution failed - check query syntax"
            }), 500
        
        # Process the results
        logging.debug(f"SQL query returned {len(result)} rows")
        
        # Check if we have SQLAlchemy Row objects or tuples
        from sqlalchemy.engine.row import Row
        
        try:
            if len(result) > 0:
                logging.debug(f"Result type: {type(result)}, First row type: {type(result[0])}")
                
                if isinstance(result[0], Row):
                    # SQLAlchemy Row objects - get column names from keys
                    column_names = result[0]._fields
                    logging.debug(f"Column names from Row: {column_names}")
                    
                    # Convert Row objects to dictionaries
                    rows = []
                    for row in result:
                        row_dict = {}
                        for i, col in enumerate(column_names):
                            # Convert SQLAlchemy values to JSON-serializable values
                            value = row[i]
                            if isinstance(value, datetime):
                                row_dict[col] = value.isoformat()
                            else:
                                row_dict[col] = value
                        rows.append(row_dict)
                else:
                    # Regular tuples - need to generate column names
                    # First check if we have a cursor.description
                    if hasattr(result, 'description'):
                        column_names = [col[0] for col in result.description]
                    else:
                        # Generate numeric column names
                        column_names = [f"column_{i}" for i in range(len(result[0]))]
                    
                    logging.debug(f"Generated column names: {column_names}")
                    
                    # Convert tuples to dictionaries
                    rows = []
                    for row in result:
                        # Convert values to JSON-serializable types
                        row_values = []
                        for value in row:
                            if isinstance(value, datetime):
                                row_values.append(value.isoformat())
                            else:
                                row_values.append(value)
                        
                        # Create dictionary
                        rows.append(dict(zip(column_names, row_values)))
            else:
                # No rows returned
                column_names = []
                rows = []
            
            logging.debug(f"Processed {len(rows)} rows with columns: {column_names}")
        except Exception as e:
            logging.error(f"Error processing SQL results: {str(e)}")
            logging.error(traceback.format_exc())
            return jsonify({
                "success": False,
                "message": f"Error processing SQL results: {str(e)}"
            }), 500
        
        return jsonify({
            "success": True,
            "columns": list(column_names),
            "rows": rows,
            "row_count": len(rows)
        })
        
    except Exception as e:
        error_message = str(e)
        
        # Format user-friendly error message
        friendly_message = "Error executing query"
        detailed_error = error_message
        
        # Check for common SQL errors
        if "relation" in error_message and "does not exist" in error_message:
            # Table doesn't exist error
            import re
            table_match = re.search(r'relation "([^"]+)" does not exist', error_message)
            if table_match:
                wrong_table = table_match.group(1)
                # Get list of available tables to suggest alternatives
                tables = LedgerSQL.list_tables()
                similar_tables = [t for t in tables if len(t) > 0 and len(wrong_table) > 0 and t.lower().startswith(wrong_table[0].lower())]
                
                friendly_message = f"Table '{wrong_table}' doesn't exist"
                suggestion_text = ""
                if similar_tables:
                    suggestion_text = f". Did you mean: {', '.join(similar_tables)}?"
                else:
                    suggestion_text = f". Available tables: {', '.join(tables)}" if tables else ""
                
                friendly_message += suggestion_text
        elif "syntax error" in error_message.lower():
            friendly_message = "SQL syntax error in your query"
        elif "permission denied" in error_message.lower():
            friendly_message = "Permission denied - you may not have access to this table or column"
        elif "violates not-null constraint" in error_message.lower():
            friendly_message = "Query violates NOT NULL constraint"
        
        logger.error(f"SQL query error: {error_message}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            "success": False,
            "message": friendly_message,
            "error": detailed_error
        }), 500
        
@app.route("/api/execute-psql", methods=["POST"])
@login_required
def execute_psql():
    """
    Execute a psql command using the read-only user
    """
    import re
    import traceback
    import logging
    from utils.ledger_sql import LedgerSQL
    
    command = request.json.get('command', '')
    
    # Log the received command
    logging.debug(f"Received PSQL command: '{command}'")
    
    if not command:
        return jsonify({"success": False, "message": "No command provided"}), 400
        
    try:
        # Fix double backslash issue in psql commands
        # Backslashes can get doubled in JS -> JSON -> Python transport
        command = command.replace("\\\\", "\\")
        
        # Log the command being executed
        logging.debug(f"Executing PSQL command: '{command}'")
        
        # Basic security check - only allow read operations for SQL statements
        if re.match(r'^\s*(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT)\s', command, re.IGNORECASE):
            logging.warning(f"Security check failed: Write operation attempted: {command}")
            return jsonify({
                "success": False,
                "message": "For security reasons, only read operations are allowed",
                "output": "ERROR: Write operations are not allowed through this interface"
            })
        
        # Handle meta-commands specially
        if command.startswith("\\"):
            logging.debug(f"Processing meta-command: {command}")
            
            # For \l command (list databases)
            if command == "\\l":
                db_list = LedgerSQL.execute_query(
                    "SELECT datname as database FROM pg_database WHERE datistemplate = false;",
                    fetch_all=True
                )
                
                if db_list:
                    output = "List of databases:\n"
                    for row in db_list:
                        output += f"  {row[0]}\n"
                    return jsonify({"success": True, "output": output})
            
            # For \dt command (list tables)
            elif command == "\\dt":
                tables = LedgerSQL.list_tables()
                
                if tables:
                    output = "List of relations:\n"
                    output += " Schema |    Name     | Type  \n"
                    output += "--------+-------------+-------\n"
                    for table in tables:
                        output += f" public | {table.ljust(11)} | table\n"
                    return jsonify({"success": True, "output": output})
            
            # For \d command (describe table)
            elif command.startswith("\\d "):
                table_name = command[3:].strip()
                columns = LedgerSQL.get_table_schema(table_name)
                
                if columns:
                    output = f"Table: {table_name}\n"
                    output += " Column  |  Type  | Nullable | Default \n"
                    output += "---------+--------+----------+---------\n"
                    for col in columns:
                        nullable = "YES" if col['nullable'] == "YES" else "NO"
                        default = col['default'] or ""
                        output += f" {col['name'].ljust(7)} | {col['type'].ljust(6)} | {nullable.ljust(8)} | {default}\n"
                    return jsonify({"success": True, "output": output})
            
            # For \conninfo command
            elif command == "\\conninfo":
                db_info = LedgerSQL.get_database_info()
                
                if db_info and db_info.get('connected'):
                    output = f"You are connected to database '{db_info['database']}'\n"
                    output += f"Server: PostgreSQL\n"
                    output += f"Tables: {db_info.get('table_count', 0)}\n"
                    
                    # Show row counts for main tables
                    if 'row_counts' in db_info:
                        output += "\nRow counts:\n"
                        for table, count in db_info['row_counts'].items():
                            output += f"  {table}: {count}\n"
                    
                    return jsonify({"success": True, "output": output})
            
            # Other meta-commands not directly supported
            return jsonify({
                "success": False,
                "message": "Meta-command not supported",
                "output": f"Meta-command '{command}' is not directly supported in this interface yet."
            })
        
        # Regular SQL command
        else:
            logging.debug(f"Processing SQL command: {command}")
            
            # Add a semicolon if not present to ensure proper execution
            if not command.rstrip().endswith(';'):
                command = command + ';'
            
            # Execute the query using our LedgerSQL module
            result = LedgerSQL.execute_query(command, fetch_all=True)
            
            if result is None:
                return jsonify({
                    "success": False,
                    "message": "Error executing SQL query",
                    "output": "Error: Database query returned no result"
                })
            
            # Format the output
            if len(result) > 0:
                # Get column names from first row
                from sqlalchemy.engine.row import Row
                
                if isinstance(result[0], Row):
                    # SQLAlchemy Row object - get keys from it
                    column_names = result[0]._fields
                else:
                    # Regular tuple - generate numeric column names
                    column_names = [f"col{i}" for i in range(len(result[0]))]
                
                # Format as a table
                output = ""
                
                # Add column headers
                output += " " + " | ".join(str(col) for col in column_names) + " \n"
                output += "-" + "-+-".join("-" * len(str(col)) for col in column_names) + "-\n"
                
                # Add rows
                for row in result:
                    if isinstance(row, Row):
                        # Convert Row to tuple
                        row_values = tuple(row)
                    else:
                        row_values = row
                    
                    output += " " + " | ".join(str(val) for val in row_values) + " \n"
                    
                output += f"({len(result)} rows)"
                
                return jsonify({
                    "success": True,
                    "output": output
                })
            else:
                return jsonify({
                    "success": True,
                    "output": "Query executed successfully (0 rows)"
                })
        
    except Exception as e:
        error_message = str(e)
        logging.error(f"PSQL execution error: {error_message}")
        logging.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": "Error executing psql command",
            "error": error_message,
            "output": f"Error: {error_message}"
        }), 500

@app.route("/ledger/source-queue")
@login_required
def source_queue():
    """
    Display the source code queue
    """
    from utils.ledger_manager import LedgerManager
    
    # Get source queue for current user
    queue_entries = LedgerManager.get_source_queue(user_id=current_user.id)
    
    return render_template("ledger/source_queue.html", queue_entries=queue_entries)

@app.route("/ledger/doc-queue")
@login_required
def doc_queue():
    """
    Display the documentation queue
    """
    from utils.ledger_manager import LedgerManager
    
    # Get documentation queue for current user
    queue_entries = LedgerManager.get_doc_queue(user_id=current_user.id)
    
    return render_template("ledger/doc_queue.html", queue_entries=queue_entries)

def detect_language_from_code(code_content, filename=None):
    """
    Detect the programming language from source code content and/or filename
    
    Args:
        code_content (str): The source code content to analyze
        filename (str, optional): The original filename if available
        
    Returns:
        str: Detected language (COBOL, JCL, etc.) or None if can't be detected
    """
    # First check if we can detect from filename extension
    if filename:
        # Convert to lowercase
        filename = filename.lower()
        
        # Detect based on file extension
        if filename.endswith(('.cob', '.cobol', '.cbl')):
            return 'COBOL'
        elif filename.endswith('.jcl'):
            return 'JCL'
        elif filename.endswith('.cpy'):
            return 'CPY'
        elif filename.endswith(('.py', '.pyw')):
            return 'PYTHON'
        elif filename.endswith('.json'):
            return 'JSON'
        elif filename.endswith(('.xml', '.html', '.htm')):
            return 'XML'
        elif filename.endswith(('.sql', '.pgsql', '.mysql')):
            return 'SQL'
    
    # If we couldn't detect from filename or no filename was provided, analyze the content
    if not code_content or len(code_content.strip()) < 10:
        return None
    
    # Convert to uppercase for easier pattern matching
    code_upper = code_content.upper()
    
    # Check for COBOL specific patterns
    if (re.search(r'IDENTIFICATION\s+DIVISION', code_upper) or 
        re.search(r'ID\s+DIVISION', code_upper) or
        re.search(r'PROGRAM-ID', code_upper)):
        return 'COBOL'
    
    # Check for JCL specific patterns
    if re.search(r'//\w+\s+JOB', code_upper) or re.search(r'//\w+\s+EXEC', code_upper):
        return 'JCL'
    
    # Check for CPY (copybook) patterns
    if (re.search(r'01\s+\w+-RECORD', code_upper) and 
        not re.search(r'PROGRAM-ID', code_upper) and
        not re.search(r'PROCEDURE\s+DIVISION', code_upper)):
        return 'CPY'
    
    # Check for SQL patterns
    if (re.search(r'SELECT\s+.*\s+FROM', code_upper) or
        re.search(r'CREATE\s+TABLE', code_upper) or
        re.search(r'INSERT\s+INTO', code_upper)):
        return 'SQL'
    
    # Default to None if we can't determine
    return None

@app.route("/api/ledger/add-source", methods=["POST"])
@login_required
@csrf.exempt
def add_source_code():
    """
    Add source code to the ledger queue
    """
    from utils.ledger_manager import LedgerManager
    
    try:
        cobol_code = ""
        source_name = ""
        input_source = "Manual Pasted"
        
        # Log all form data and files for debugging
        logger.debug("==== ADD SOURCE DEBUG ====")
        logger.debug(f"Form data keys: {list(request.form.keys())}")
        logger.debug(f"Files keys: {list(request.files.keys() if request.files else [])}")
        logger.debug(f"Form data values: {dict(request.form)}")
        
        # Check which input method was selected
        input_method = request.form.get('inputMethod', 'paste')
        logger.debug(f"Input method: {input_method}")
        
        # Get source name - this should always be present
        source_name = request.form.get('sourceName', '').strip()
        if not source_name:
            logger.error("Missing source name")
            return jsonify({"status": "error", "error": "Please provide a source name"}), 400
        
        logger.debug(f"Source name: {source_name}")
        
        # Check if code was uploaded as file
        if input_method == 'file' and 'sourceFile' in request.files and request.files['sourceFile'].filename:
            file = request.files['sourceFile']
            logger.debug(f"Processing uploaded file: {file.filename}")
            try:
                cobol_code = file.read().decode('utf-8')
                # Keep the user-provided source name
                input_source = "External Input"
                logger.debug(f"File content length: {len(cobol_code)}")
            except UnicodeDecodeError:
                logger.error("File encoding error")
                return jsonify({"status": "error", "error": "The uploaded file contains invalid characters. Please ensure it's a text file with UTF-8 encoding."}), 400
        # Check if code was pasted
        elif input_method == 'paste' and 'sourceCode' in request.form and request.form['sourceCode'].strip():
            cobol_code = request.form['sourceCode']
            logger.debug(f"Processing pasted code, length: {len(cobol_code)}")
            input_source = "Manual Pasted"
        else:
            # Check what's missing
            if input_method == 'file' and ('sourceFile' not in request.files or not request.files['sourceFile'].filename):
                logger.error("Missing file upload")
                return jsonify({"status": "error", "error": "Please select a file to upload"}), 400
            elif input_method == 'paste' and ('sourceCode' not in request.form or not request.form['sourceCode'].strip()):
                logger.error("Missing pasted code")
                return jsonify({"status": "error", "error": "Please enter source code in the text area"}), 400
            else:
                logger.error(f"Unknown input configuration: method={input_method}")
                return jsonify({"status": "error", "error": "No source code provided"}), 400
        
        # Get the provided source language
        source_language = request.form.get('sourceLanguage', 'COBOL')
        if not source_language:
            source_language = 'COBOL'
        
        # Detect language from content and/or filename if possible
        filename = None
        if input_method == 'file' and 'sourceFile' in request.files and request.files['sourceFile'].filename:
            filename = request.files['sourceFile'].filename
            
        detected_language = detect_language_from_code(cobol_code, filename)
        if detected_language and detected_language != source_language:
            logger.info(f"Language auto-detected as {detected_language} (was {source_language})")
            source_language = detected_language
        
        logger.debug(f"Adding to ledger: {source_name}, language: {source_language}, input_source: {input_source}")
        
        # Add to ledger
        source_id = LedgerManager.add_source_code(
            content=cobol_code,
            source_name=source_name,
            source_language=source_language,
            input_source=input_source,
            user_id=current_user.id
        )
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Store the source_id in session for processing references
        session['current_source_id'] = source_id
        session['job_id'] = job_id
        
        logger.debug(f"Source added successfully: {source_id}")
        return jsonify({
            "status": "success", 
            "message": "Source code added to ledger", 
            "source_id": source_id,
            "job_id": job_id
        })
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error adding source code to ledger: {error_msg}")
        logger.error(f"Request form data: {request.form}")
        logger.error(f"Request files: {request.files}")
        traceback.print_exc()
        return jsonify({
            "status": "error", 
            "error": error_msg,
            "details": "Please check server logs for more information"
        }), 500

@app.route("/api/ledger/update-source-status", methods=["POST"])
@login_required
def update_source_status():
    """
    Update the status of a source code entry
    """
    from utils.ledger_manager import LedgerManager
    
    try:
        data = request.json
        source_id = data.get('source_id')
        status = data.get('status')
        
        if not source_id or not status:
            return jsonify({"error": "Missing source_id or status"}), 400
        
        success = LedgerManager.update_source_status(source_id, status)
        
        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to update source status"}), 500
        
    except Exception as e:
        logger.error(f"Error updating source status: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/ledger/delete-source", methods=["POST"])
@login_required
def delete_source():
    """
    Delete a source code entry and its associated documents
    """
    from utils.ledger_manager import LedgerManager
    
    try:
        data = request.json
        source_id = data.get('source_id')
        
        if not source_id:
            return jsonify({"error": "Missing source_id"}), 400
        
        # Check if source exists and belongs to current user
        source = SourceCodeQueue.query.filter_by(source_id=source_id, user_id=current_user.id).first()
        if not source:
            return jsonify({"error": "Source not found or you do not have permission to delete it"}), 404
        
        # First delete associated documents
        docs = DocGenerated.query.filter_by(doc_source_code_id=source_id).all()
        for doc in docs:
            db.session.delete(doc)
        
        # Delete source content
        if source.content:
            db.session.delete(source.content)
        
        # Delete source
        db.session.delete(source)
        db.session.commit()
        
        return jsonify({"success": True})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting source: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/ledger/get-source", methods=["GET"])
@login_required
def get_source_code():
    """
    Get source code content from the ledger
    """
    from utils.ledger_manager import LedgerManager
    import traceback
    
    try:
        source_id = request.args.get('source_id')
        
        if not source_id:
            logger.error("Missing source_id in request")
            return jsonify({"success": False, "error": "Missing source_id"}), 400
        
        logger.debug(f"Getting source code for id: {source_id}")
        source_data = LedgerManager.get_source_code(source_id)
        
        if source_data:
            # Log success but don't log content which could be large
            logger.debug(f"Successfully retrieved source code for id: {source_id}, content length: {len(source_data.get('content', '')) if 'content' in source_data else 'N/A'}")
            return jsonify({"success": True, "source_data": source_data})
        else:
            logger.error(f"Source not found for id: {source_id}")
            return jsonify({"success": False, "error": "Source not found"}), 404
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error getting source code: {error_message}")
        logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": f"Error retrieving source code: {error_message}"}), 500

@app.route("/api/ledger/process-source", methods=["POST"])
@login_required
def process_ledger_source():
    """
    Process a source code from the ledger and generate documentation
    """
    from utils.ledger_manager import LedgerManager
    from utils.agent import COBOLDocumentationAgent
    
    try:
        data = request.json
        source_id = data.get('source_id')
        preferences = data.get('preferences', {})
        generate_doc = data.get('generate_doc', True)  # Default to True
        
        if not source_id:
            return jsonify({"error": "Missing source_id"}), 400
        
        # Get source code from ledger
        source_data = LedgerManager.get_source_code(source_id)
        
        if not source_data:
            return jsonify({"error": f"Source code not found for ID: {source_id}"}), 404
        
        # Update source status to Processing
        LedgerManager.update_source_status(source_id, "Processing")
        
        # Create a placeholder for the doc_id
        doc_id = None
        
        # Create agent and process the code
        agent = COBOLDocumentationAgent(session_id=str(uuid.uuid4()), user_id=current_user.id)
        
        # Set agent preferences
        for key, value in preferences.items():
            agent.set_user_preference(key, value)
        
        try:
            # First analyze the structure
            cobol_code = source_data['content']
            structured_data = agent.analyze_cobol_structure(cobol_code)
            
            # Generate a timestamp for the document
            doc_timestamp = time.strftime("%y%m%d_%H%M%S", time.gmtime())
            
            # If generate_doc is True, create a document in "In Process" status first
            if generate_doc:
                # Create a placeholder document with "In Process" status
                # Get language from source_data - check both 'language' and 'source_language' to handle both ORM and SQL
                source_language = source_data.get('language', source_data.get('source_language', 'COBOL'))
                doc_id = LedgerManager.add_documentation(
                    source_id=source_id,
                    doc_content="Documentation generation in progress...",
                    doc_status='In Process',
                    in_language=source_language,
                    user_id=current_user.id
                )
                logger.debug(f"Created documentation entry with 'In Process' status, ID: {doc_id}")
            
            # Then generate documentation
            documentation = agent.generate_documentation(structured_data)
            
            # If we're generating documentation, update the existing doc or create a new one
            if generate_doc:
                if doc_id:
                    # Update the existing document with the generated content and "Pending" status
                    LedgerManager.update_documentation(
                        doc_id=doc_id,
                        doc_content=documentation,
                        doc_status='Pending',
                        user_id=current_user.id
                    )
                    logger.debug(f"Updated documentation to 'Pending' status, ID: {doc_id}")
                else:
                    # Create a new document with "Pending" status
                    doc_id = LedgerManager.add_documentation(
                        source_id=source_id,
                        doc_content=documentation,
                        doc_status='Pending',
                        in_language=source_language,  # Using the previously defined source_language variable
                        user_id=current_user.id
                    )
                    logger.debug(f"Created new documentation with 'Pending' status, ID: {doc_id}")
            
            # Update source status to completed
            LedgerManager.update_source_status(source_id, "Completed")
            
            # Process the documentation for display
            import markdown
            from utils.mermaid_viewer import enhance_markdown_with_tabs
            
            # Enhance documentation with tabbed diagram views if needed
            if '```mermaid' in documentation and '<div class="mermaid-container">' not in documentation:
                try:
                    documentation = enhance_markdown_with_tabs(documentation)
                    logger.debug("Enhanced documentation with tabbed diagram views")
                except Exception as e:
                    logger.warning(f"Could not enhance documentation with tabs: {str(e)}")
            
            # Convert Markdown to HTML
            md = markdown.Markdown(
                extensions=[
                    'markdown.extensions.extra',
                    'markdown.extensions.codehilite',
                    'markdown.extensions.tables',
                    'markdown.extensions.toc'
                ]
            )
            
            try:
                # Process mermaid blocks
                mermaid_processed = documentation
                mermaid_blocks = re.findall(r'```mermaid([\s\S]*?)```', mermaid_processed)
                
                for i, block in enumerate(mermaid_blocks):
                    mermaid_processed = mermaid_processed.replace(
                        f"```mermaid{block}```",
                        f'<div class="mermaid">{block.strip()}</div>',
                        1
                    )
                
                # Convert to HTML
                html_content = md.convert(mermaid_processed)
                
                return jsonify({
                    "success": True,
                    "documentation": html_content,
                    "format": "html",
                    "doc_id": doc_id,
                    "source_id": source_id,
                    "status": "success"
                })
                
            except Exception as md_error:
                logger.error(f"Error converting markdown to HTML: {str(md_error)}")
                # Fall back to raw markdown
                return jsonify({
                    "success": True,
                    "documentation": documentation,
                    "format": "markdown",
                    "doc_id": doc_id,
                    "source_id": source_id,
                    "status": "success"
                })
                
        except Exception as agent_error:
            # Update source status to error
            LedgerManager.update_source_status(source_id, "Error")
            
            # If we created a document, mark it as error
            if doc_id:
                LedgerManager.update_documentation(
                    doc_id=doc_id,
                    doc_status='Error',
                    user_id=current_user.id
                )
            
            logger.error(f"Agent error: {str(agent_error)}")
            return jsonify({"error": f"Agent processing error: {str(agent_error)}", "success": False}), 500
        
    except Exception as e:
        logger.error(f"Error processing source code: {str(e)}")
        return jsonify({"error": str(e), "success": False}), 500

@app.route("/api/ledger/get-doc", methods=["GET"])
@login_required
def get_documentation():
    """
    Get documentation content from the ledger
    """
    from utils.ledger_manager import LedgerManager
    
    try:
        doc_id = request.args.get('doc_id')
        
        if not doc_id:
            return jsonify({"error": "Missing doc_id"}), 400
        
        doc_data = LedgerManager.get_documentation(doc_id)
        
        if doc_data:
            return jsonify({"success": True, "doc_data": doc_data})
        else:
            return jsonify({"error": "Documentation not found"}), 404
        
    except Exception as e:
        logger.error(f"Error getting documentation: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/ledger/update-doc-status", methods=["POST"])
@login_required
def update_doc_status():
    """
    Update the status of a documentation entry
    """
    from utils.ledger_manager import LedgerManager
    
    try:
        data = request.json
        doc_id = data.get('doc_id')
        status = data.get('status')
        doc_status = data.get('doc_status')
        
        if not doc_id or not status:
            return jsonify({"error": "Missing doc_id or status"}), 400
        
        success = LedgerManager.update_doc_status(doc_id, status, doc_status)
        
        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to update documentation status"}), 500
        
    except Exception as e:
        logger.error(f"Error updating documentation status: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/ledger/get-source-queue", methods=["GET"])
@login_required
def get_source_queue():
    """
    Get source code queue entries for API usage
    """
    from utils.ledger_manager import LedgerManager
    
    try:
        # Get query parameters
        user_id = request.args.get('user_id')
        status = request.args.get('status')
        limit = request.args.get('limit', default=50, type=int)
        search = request.args.get('search')
        
        logger.debug(f"Getting source queue: user_id={user_id}, status={status}, limit={limit}")
        
        # Default to current user if no user_id provided
        if not user_id and current_user and current_user.is_authenticated:
            user_id = current_user.id
            logger.debug(f"Using current user ID: {user_id}")
        
        # Get queue entries
        queue_entries = LedgerManager.get_source_queue(user_id=user_id, status=status, limit=limit)
        
        # Ensure queue_entries is a list
        if queue_entries is None:
            queue_entries = []
            logger.warning("queue_entries was None, using empty list instead")
        
        # Filter by search term if provided
        if search and search.strip():
            search = search.lower()
            filtered_entries = []
            for entry in queue_entries:
                if (search in entry.get('source_id', '').lower() or 
                    search in entry.get('source_name', '').lower()):
                    filtered_entries.append(entry)
            queue_entries = filtered_entries
        
        logger.debug(f"Returning {len(queue_entries)} source queue entries")
        return jsonify({"success": True, "queue_entries": queue_entries})
        
    except Exception as e:
        logger.error(f"Error getting source queue: {str(e)}")
        # Return an empty list instead of error to allow the UI to handle it gracefully
        return jsonify({"success": False, "error": str(e), "queue_entries": []})

@app.route("/api/ledger/get-doc-queue", methods=["GET"])
@login_required
def get_doc_queue():
    """
    Get documentation queue entries for API usage
    """
    from utils.ledger_manager import LedgerManager
    
    try:
        # Get query parameters
        user_id = request.args.get('user_id')
        status = request.args.get('status')
        limit = request.args.get('limit', default=50, type=int)
        search = request.args.get('search')
        
        logger.debug(f"Getting doc queue: user_id={user_id}, status={status}, limit={limit}")
        
        # Default to current user if no user_id provided
        if not user_id and current_user and current_user.is_authenticated:
            user_id = current_user.id
            logger.debug(f"Using current user ID: {user_id}")
        
        # Get queue entries
        queue_entries = LedgerManager.get_doc_queue(user_id=user_id, status=status, limit=limit)
        
        # Ensure queue_entries is a list
        if queue_entries is None:
            queue_entries = []
            logger.warning("queue_entries was None, using empty list instead")
        
        # Filter by search term if provided
        if search and search.strip():
            search = search.lower()
            filtered_entries = []
            for entry in queue_entries:
                if (search in entry.get('result_doc_id', '').lower() or 
                    search in entry.get('doc_source_code_id', '').lower()):
                    filtered_entries.append(entry)
            queue_entries = filtered_entries
        
        logger.debug(f"Returning {len(queue_entries)} doc queue entries")
        return jsonify({"success": True, "queue_entries": queue_entries})
        
    except Exception as e:
        logger.error(f"Error getting doc queue: {str(e)}")
        # Return an empty list instead of error to allow the UI to handle it gracefully
        return jsonify({"success": False, "error": str(e), "queue_entries": []})

@app.route("/api/ledger/download-doc", methods=["GET"])
@login_required
def download_ledger_doc():
    """
    Download documentation content as a Markdown file
    """
    from utils.ledger_manager import LedgerManager
    import time
    import os
    
    try:
        doc_id = request.args.get('doc_id')
        
        if not doc_id:
            return jsonify({"error": "Missing doc_id"}), 400
        
        doc_data = LedgerManager.get_documentation(doc_id)
        
        if not doc_data:
            return jsonify({"error": "Documentation not found"}), 404
        
        # Get source details for filename
        source_id = doc_data['doc_source_code_id']
        source_data = LedgerManager.get_source_code(source_id)
        
        # Generate timestamp for filename
        timestamp = time.strftime("%y%m%d_%H%M%S", time.gmtime())
        
        # Create filename based on source name or doc ID
        if source_data and 'source_name' in source_data:
            base_name = os.path.splitext(source_data['source_name'])[0]
            filename = f"{timestamp}_{base_name}_documentation.md"
        else:
            filename = f"{timestamp}_documentation_{doc_id[-8:]}.md"
        
        # Create a temporary file to serve
        import tempfile
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.md') as temp:
            temp.write(doc_data['doc_content'])
            temp_path = temp.name
        
        return send_file(
            temp_path,
            as_attachment=True,
            download_name=filename,
            mimetype='text/markdown'
        )
        
    except Exception as e:
        logger.error(f"Error downloading documentation: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
