# COBOL Documentation Generator - Quick Start Guide for Replit

## Quick Start Guide

### Step 1: Fork/Clone the Replit Project
- Fork this Replit project to your account to get started immediately

### Step 2: Set Up Environment Secrets
1. Click on the "Secrets" tool in the Replit sidebar (lock icon)
2. Add the following required secrets:
   - `MCP_API_KEY` - Your Model Context Protocol API key
   - `PERPLEXITY_API_KEY` - Your Perplexity API key
   - `FLASK_SECRET_KEY` - A secure random string for Flask sessions
   - (Optional) `OPENAI_API_KEY` - If using OpenAI as a backup provider

### Step 3: Start the Application
1. The application is configured to start automatically on Replit
2. If needed, restart the application by clicking the Run button at the top
3. The application will automatically connect to the provided PostgreSQL database

### Step 4: Access the Web Interface
1. Click on the "Webview" tab to access the web interface
2. Register a new user account via the registration form
3. Log in with your newly created credentials

### Step 5: Start Using the Application
1. Create a new COBOL documentation project
2. Upload COBOL files or paste COBOL code directly
3. Generate comprehensive documentation with the built-in AI tools
4. Translate or download the documentation as needed

## Troubleshooting Replit-Specific Issues

### Database Connection
- The application automatically uses the Replit-provided PostgreSQL database
- No additional configuration is needed for database connectivity

### API Integration
- If you see API errors, verify that you've correctly added the required secrets
- Ensure the API keys have the necessary permissions and are not expired

### Application Performance
- If the application seems slow, consider:
  1. Reducing the size of COBOL files being processed
  2. Processing files one at a time
  3. Using the "Technical" documentation mode for faster generation

## Additional Resources

- For detailed instructions, refer to the STEP_BY_STEP_GUIDE.md file
- For complete setup information, see the SETUP_GUIDE.md file
- For API integration details, consult the source code in the `utils` directory