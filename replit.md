# COBOL ClarityEngine - Project Documentation

## Overview
A modern web application for analyzing and documenting legacy COBOL systems. The platform uses AI to transform complex COBOL code into clear, understandable documentation with visualizations and business rule extraction.

## Project Architecture
- **Frontend**: React with Vite, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Design System**: Dark theme with green and white color scheme, inspired by modern developer tools
- **AI Integration**: Anthropic Claude and Google Gemini for code analysis

## Recent Changes
- **2025-01-08**: Migrated from Replit Agent to standard Replit environment
- **2025-01-08**: Completely redesigned UI with modern dark interface using green/white theme
- **2025-01-08**: Implemented glass-card design system with backdrop blur effects
- **2025-01-08**: Enhanced sidebar with 320px width and improved navigation
- **2025-01-08**: Updated header with quick stats and search functionality
- **2025-01-09**: Implemented comprehensive GitHub integration for repository management
- **2025-01-09**: Added new database tables for repositories, code files, documentation, and dependencies
- **2025-01-09**: Created repository connection and sync functionality
- **2025-01-09**: Expanded schema to support business logic extraction and enhanced documentation

## User Preferences
- **Design Style**: Modern dark interface with green (#00D26A) and white color scheme
- **UI Inspiration**: Autodocs-style interface with glass cards and subtle animations
- **Layout**: Sidebar navigation with main content area
- **Theme**: Always dark mode with consistent color variables

## Technical Stack
- **Node.js 20** with TypeScript
- **React 18** with Wouter for routing
- **TanStack Query** for data fetching
- **Tailwind CSS** with custom design tokens
- **Drizzle ORM** for database operations
- **Express.js** for backend API

## Key Features
1. **GitHub Repository Integration**
   - Connect to GitHub repositories
   - Automatic COBOL file discovery
   - Branch management
   - Webhook support for auto-updates
2. **COBOL File Upload & Analysis**
3. **AI-Powered Code Documentation**
   - Overview documentation
   - Book-style extensive explanations
   - Member file with decision trees
   - Architecture analysis
4. **Business Rules Extraction**
   - Automated rule identification
   - Decision tree generation
   - Input/output mapping
5. **Data Dictionary Generation**
6. **System Visualizations (Mermaid diagrams)**
   - Flowcharts
   - Architecture diagrams
   - Dependency graphs
7. **Program Relationship Mapping**
8. **Continuous Documentation Updates**

## Database Schema
Core entities: users, programs, dataElements, programRelationships, uploadSessions
All schemas defined in `shared/schema.ts` with proper TypeScript types.

## Development Environment
- Database: PostgreSQL (provisioned and configured)
- Server runs on port 5000 with both API and frontend
- Hot reload enabled for development
- All dependencies properly installed and configured

## Migration Status
✅ Replit Agent → Standard Replit migration completed successfully
✅ Database provisioned and schema deployed
✅ Modern UI design implemented
✅ Application running and functional