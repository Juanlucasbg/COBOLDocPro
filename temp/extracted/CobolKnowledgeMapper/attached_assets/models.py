from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin
import time

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model for storing user account information"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    projects = db.relationship('Project', backref='owner', lazy=True)
    source_codes = db.relationship('SourceCodeQueue', backref='user', lazy=True)
    documents = db.relationship('DocGenerated', backref='user', lazy=True)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Project(db.Model):
    """Project model for storing COBOL documentation projects"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    cobol_files = db.relationship('CobolFile', backref='project', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Project {self.name}>'

class CobolFile(db.Model):
    """Model for storing COBOL file information"""
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    program_id = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    documentation = db.relationship('Documentation', backref='cobol_file', lazy=True, uselist=False, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<CobolFile {self.filename}>'

class Documentation(db.Model):
    """Model for storing generated documentation"""
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(10), default='en')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cobol_file_id = db.Column(db.Integer, db.ForeignKey('cobol_file.id'), nullable=False)
    
    def __repr__(self):
        return f'<Documentation for file {self.cobol_file_id}>'

# Ledger Database Models

class SourceCodeQueue(db.Model):
    """
    SOURCE_CODE_QUEUE table for storing source code in a queue system
    to solve session size limitations
    """
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.String(15), nullable=False, index=True)  # YYMMDD_HHMMSS format
    source_language = db.Column(db.String(20), nullable=False, index=True)  # COBOL, JCL, CPY, etc.
    input_source = db.Column(db.String(50), nullable=False)  # Manual Pasted, External Input, etc.
    source_name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), nullable=False, index=True)  # On Queue, Processing, etc.
    source_id = db.Column(db.String(300), nullable=False, unique=True, index=True)  # Composite ID
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to source content
    content = db.relationship('SourceCodeContent', backref='source_queue', lazy=True, 
                             uselist=False, cascade='all, delete-orphan')
    
    # Relationship to generated documents
    documents = db.relationship('DocGenerated', backref='source_code', lazy=True)
    
    @staticmethod
    def generate_timestamp():
        """Generate a timestamp in YYMMDD_HHMMSS format"""
        return time.strftime("%y%m%d_%H%M%S", time.gmtime())
    
    @staticmethod
    def generate_source_id(timestamp, language, source_name):
        """Generate a composite source ID"""
        # Clean source name to prevent issues in the ID
        clean_name = source_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
        return f"{timestamp}_{language}_{clean_name}"
    
    def __repr__(self):
        return f'<SourceCodeQueue {self.source_id}>'

class SourceCodeContent(db.Model):
    """
    SOURCE_CODE_CONTENT table for storing the actual content of source code
    to separate metadata from large content data
    """
    id = db.Column(db.Integer, primary_key=True)
    source_id = db.Column(db.String(300), db.ForeignKey('source_code_queue.source_id'), 
                         nullable=False, unique=True, index=True)
    content = db.Column(db.Text, nullable=False)  # Source code content
    
    def __repr__(self):
        return f'<SourceCodeContent for {self.source_id}>'

class DocGenerated(db.Model):
    """
    DOC_GENERATED table for storing generated documentation
    linked to source code from the queue
    """
    id = db.Column(db.Integer, primary_key=True)
    result_doc_id = db.Column(db.String(300), nullable=False, unique=True, index=True)
    result_doc_status = db.Column(db.String(50), nullable=False, index=True)  # Pending of Review, Approved, Rejected
    doc_timestamp = db.Column(db.String(15), nullable=False, index=True)  # YYMMDD_HHMMSS format
    doc_source_code_id = db.Column(db.String(300), db.ForeignKey('source_code_queue.source_id'), 
                                 nullable=False, index=True)
    status = db.Column(db.String(50), nullable=False, index=True)  # Processing, Approval Pending, etc.
    doc_content = db.Column(db.Text, nullable=False)  # Documentation content
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    in_language = db.Column(db.String(20), nullable=False)  # Source language
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @staticmethod
    def generate_result_doc_id(doc_timestamp, source_id):
        """Generate a result document ID"""
        return f"RESULT_{doc_timestamp}_{source_id}"
    
    def __repr__(self):
        return f'<DocGenerated {self.result_doc_id}>'
