# COBOL Documentation Generator

## Overview

This project is an AI-powered COBOL code documentation generator that automatically analyzes COBOL source code and produces comprehensive, structured documentation with diagrams and plain-English explanations. It features an agentic system with observability capabilities and uses the Model Context Protocol (MCP) to enrich documentation with external knowledge.

![COBOL Documentation Generator](static/img/preview.png)

## Key Features

- **Automated COBOL Analysis**: Parses and analyzes COBOL code structure, identifying divisions, sections, and key elements
- **AI-Powered Documentation**: Generates comprehensive documentation using Perplexity API
- **Visual Elements**: Creates diagrams and flowcharts to visualize program flow and relationships
- **Multi-Context Prompting**: Uses MCP to provide context-rich explanations for technical and non-technical users
- **Agentic System**: Employs an autonomous agent with observability to optimize documentation quality
- **Multiple Languages**: Supports translation of documentation to various languages
- **Modern UI**: Features a black futuristic theme with IBM Plex Sans font

## Technology Stack

- **Backend**: Flask (Python)
- **Database**: PostgreSQL
- **AI Integration**: Perplexity API, OpenAI API (optional)
- **Observability**: Arize Phoenix, Senso API
- **External Knowledge**: Model Context Protocol (MCP)
- **Frontend**: Vanilla JavaScript, HTML, CSS

## Documentation

For detailed information on setting up and using this application, please refer to:

- [Quick Start Guide](QUICK_START.md) - Get started quickly on Replit
- [Step-by-Step Guide](STEP_BY_STEP_GUIDE.md) - Detailed instructions for using the application
- [Setup Guide](SETUP_GUIDE.md) - Complete setup instructions for local development

## Prerequisites

- Python 3.8 or higher
- PostgreSQL database
- Required API keys:
  - MCP_API_KEY
  - PERPLEXITY_API_KEY
  - (Optional) OPENAI_API_KEY

## License

This project is licensed under the MIT License - see the LICENSE file for details.