# COBOL Documentation Generator - Setup Guide

## Prerequisites

- Python 3.8 or higher
- PostgreSQL database
- Required API keys:
  - MCP_API_KEY (for Model Context Protocol integration)
  - PERPLEXITY_API_KEY (for AI-powered documentation generation)
  - Optional: OPENAI_API_KEY (alternative AI provider)

## Environment Setup

1. Clone the repository to your local machine or start a new Replit project

2. Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/cobol_docs
   FLASK_SECRET_KEY=your_secret_key
   MCP_API_KEY=your_mcp_api_key
   PERPLEXITY_API_KEY=your_perplexity_api_key
   ```

3. Install the required Python packages:
   ```
   pip install flask flask-sqlalchemy gunicorn email-validator markdown openai psycopg2-binary python-dotenv requests werkzeug
   ```

## Database Setup

1. Create a PostgreSQL database
   ```
   createdb cobol_docs
   ```

2. The application will automatically create the necessary tables when it's first run

## Running the Application

1. Start the application server:
   ```
   gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app
   ```

2. Access the application in your web browser at `http://localhost:5000`

## Using the Application

1. Register a new user account or log in with existing credentials

2. Create a new project and upload COBOL files for documentation

3. The system will automatically analyze the COBOL structure and generate comprehensive documentation

4. You can translate the documentation to different languages or download it in various formats

## Troubleshooting

- If you encounter errors with the Perplexity API, ensure your API key is correct
- For database connection issues, verify the DATABASE_URL environment variable
- Check if JavaScript is enabled in your browser for the best user experience

## Additional Resources

- COBOL Programming Guide
- Perplexity API Documentation
- Model Context Protocol Documentation