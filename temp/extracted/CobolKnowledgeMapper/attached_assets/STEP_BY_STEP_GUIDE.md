# COBOL Documentation Generator - Step-by-Step Guide

This guide provides detailed step-by-step instructions for setting up and using the COBOL Documentation Generator application.

## Step 1: Environment Setup

1. Ensure you have the following installed:
   - Python 3.8+
   - PostgreSQL database
   - Git (for cloning the repository)

2. Set up your environment variables by creating a `.env` file with:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/cobol_docs
   FLASK_SECRET_KEY=your_secret_key
   MCP_API_KEY=your_mcp_api_key
   PERPLEXITY_API_KEY=your_perplexity_api_key
   ```

## Step 2: Database Initialization

1. Ensure your PostgreSQL server is running
2. Create a new database:
   ```
   createdb cobol_docs
   ```
3. The application will automatically create the necessary tables on startup

## Step 3: Starting the Application

1. Start the application server using gunicorn:
   ```
   gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app
   ```
2. Access the web interface by navigating to `http://localhost:5000` in your browser

## Step 4: User Registration and Login

1. Click the "Register" button on the homepage
2. Fill in your username, email, and password
3. Submit the registration form
4. Log in with your newly created credentials

## Step 5: Creating a New Project

1. Navigate to the dashboard
2. Click "Create New Project"
3. Enter a project name and description
4. Click "Create" to initialize your project

## Step 6: Uploading COBOL Files

1. Select your project from the dashboard
2. Click "Upload COBOL File"
3. Select a COBOL file from your computer or paste the code directly
4. Click "Upload" to add the file to your project

## Step 7: Generating Documentation

1. From the project view, select the COBOL file you want to document
2. Click "Generate Documentation"
3. Wait for the AI to analyze the code and generate comprehensive documentation
4. Review the generated documentation with diagrams and explanations

## Step 8: Translating Documentation (Optional)

1. View the documentation for a COBOL file
2. Select the target language from the dropdown menu
3. Click "Translate" to generate documentation in the selected language
4. The translated documentation will be displayed

## Step 9: Downloading Documentation

1. View the documentation for a COBOL file
2. Click "Download" to save the documentation
3. Choose your preferred format (Markdown, PDF, HTML)
4. Save the file to your computer

## Step 10: Managing Projects

1. Return to the dashboard to see all your projects
2. Use the "Edit" button to modify project details
3. Use the "Delete" button to remove projects you no longer need

## Troubleshooting

- **API Error**: Check that your API keys are correctly set in the `.env` file
- **Database Connection Error**: Verify your PostgreSQL server is running and the DATABASE_URL is correct
- **File Upload Issues**: Ensure your COBOL files are properly formatted and not too large

For additional help, refer to the SETUP_GUIDE.md file or contact support.