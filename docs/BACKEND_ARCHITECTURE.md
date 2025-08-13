### Backend Architecture

This document describes the backend architecture for the COBOL documentation platform. It covers runtime, modules, data flow, APIs, persistence, observability, error handling, AI integrations, and configuration.

### Overview

```mermaid
graph TD
  subgraph Client
    UI[React App]
  end

  subgraph Server (Node.js + Express)
    RT[HTTP Router]
    UP[Upload & Parse]
    AG[Autonomous Agent]
    AI[AI Providers]
    OBS[Observability]
    ERR[Error Handler]
  end

  subgraph Data
    DB[(PostgreSQL via Neon)]
  end

  UI -->|HTTP /api| RT
  RT --> UP
  RT --> AG
  UP --> AI
  AG --> AI
  UP -->|CRUD| DB
  AG -->|CRUD| DB
  AI -.calls.- Anthropic
  AI -.calls.- Gemini
  RT --> OBS
  RT --> ERR
```

### Runtime and Entry Point

- Express app boots in `server/index.ts`.
- JSON body parsing and URL-encoded parsing are enabled.
- Requests under `/api` are logged with duration and (truncated) JSON body via `vite.log` helper.
- Vite middleware serves the client in development; static assets served in production.
- Server listens on port 5000 (`0.0.0.0`).

### Routing Composition

Routes are registered in `server/routes.ts` and grouped as follows:

- Repository routes: `registerRepositoryRoutes(app)`
- Documentation routes: `registerDocumentationRoutes(app)`
- Analysis routes: `registerAnalysisRoutes(app)`
- AI documentation routes: `setupAIDocumentationRoutes(app)`
- Workflow routes: `setupWorkflowRoutes(app)`

Core REST endpoints provided directly in `routes.ts` (selected):

- Programs
  - `GET /api/programs` — list programs
  - `GET /api/programs/:id` — program by id
  - `GET /api/programs/search/:query` — search
  - `POST /api/programs/:id/enhanced-analysis` — run autonomous agent analysis
- Data Elements
  - `GET /api/programs/:id/data-elements`
  - `GET /api/data-elements`
  - `GET /api/data-elements/search/:query`
- Relationships & Stats
  - `GET /api/programs/:id/relationships`
  - `GET /api/statistics`
- Uploads
  - `POST /api/upload` — accepts `.cbl`, `.cob`, `.cpy`, `.jcl` (multer memory storage, 100MB limit)
  - `GET /api/upload-sessions` — list sessions
- Global Search
  - `GET /api/search/:query`
- Repository Analysis (predefined/custom)
  - `GET /api/predefined-repositories`
  - `POST /api/analyze-repository`
  - `POST /api/analyze-custom-repository`
  - `GET /api/analysis-jobs/:jobId`
  - `GET /api/analysis-jobs`
  - `DELETE /api/analysis-jobs/:jobId`

All routes terminate with the shared Express error middleware `errorHandler`.

### Upload and Processing Pipeline

1. `POST /api/upload` receives files via `multer` (memory storage, extension allowlist, 100MB limit).
2. For each file:
   - An `uploadSessions` row is inserted with status `processing`.
   - Source is parsed by `CobolParser` (division/sections, data elements, relationships, LOC).
   - A `programs` row is created with initial status `processing` and `structure` JSON.
3. Background task (via `setImmediate`) performs AI work:
   - Program summary (Anthropic Claude)
   - Business rules (Claude)
   - System explanation (Claude)
   - Mermaid diagram (Claude)
   - Data elements are persisted (`data_elements`); relationships are recorded (`program_relationships`).
   - Program status is updated to `completed` or `failed`.
   - `uploadSessions` is updated accordingly.

### COBOL Parsing Layer

- `server/cobol-parser.ts` provides a lightweight, heuristic parser:
  - Extracts `PROGRAM-ID`.
  - Detects divisions (IDENTIFICATION, ENVIRONMENT, DATA, PROCEDURE).
  - Parses DATA sections and WORKING-STORAGE items into `data_elements`-like structures.
  - Extracts relationships from `CALL`, `PERFORM`, and `COPY` statements.

### AI Integration Layer

- Anthropic Claude: `server/anthropic-claude.ts`
  - Functions: program summary, business rules, system explanation, Mermaid diagram, data element descriptions.
  - Enforces JSON-only responses with `safeParseJSON` and `retryOperation` wrappers.
- Google Gemini: `server/gemini.ts` and `server/enhanced-gemini.ts`
  - Similar JSON contracts and fallback handling.

### Autonomous Agent

- `server/autonomous-agent.ts` encapsulates an analysis workflow that:
  - Starts an observability session.
  - Parses code, identifies focus areas, builds prompts.
  - Calls Claude to generate summary, explanation, and diagrams.
  - Evaluates documentation quality and returns metrics.

### Persistence and Data Access

- Database: PostgreSQL (Neon serverless) via `@neondatabase/serverless` websocket and Drizzle ORM.
- Connection: `server/db.ts` validates `DATABASE_URL` and exports `db`.
- Schema: `shared/schema.ts` defines all tables and Zod insert schemas, including:
  - `programs`, `data_elements`, `program_relationships`, `upload_sessions`
  - `documentation`, `diagrams`, `business_logic`, `dependencies`
  - `quality_issues`, `code_metrics`, `business_rule_candidates`
  - `repositories`, `code_files`, `jcl_jobs`, `copybook_registry`, `control_flow_graphs`, `transformation_readiness`
- Storage service: `server/storage.ts` implements `IStorage` using Drizzle queries and returns typed models.

### Observability

- `server/observability.ts` implements in-memory session spans and agent decision logs:
  - `ObservabilityTracker` tracks sessions, spans, decisions, results, and errors.
  - `AgentMonitor` helper logs decisions, errors, and performance metrics.
  - Used in upload BG tasks and autonomous agent flows.

### Error Handling

- Centralized helpers in `server/error-handler.ts`:
  - `safeParseJSON` cleans and parses LLM JSON.
  - `retryOperation` provides configurable retries with backoff.
  - Custom `COBOLProcessingError` and REST `errorHandler` middleware standardize API errors.

### Security and Limits

- Upload validation: extension allowlist and 100MB per file cap.
- JSON body parsing with Express defaults.
- Database URL required at boot; process exits if missing.
- Production serves static build only; dev uses Vite HMR middleware.

### Configuration

Environment variables used by the backend:

- `DATABASE_URL` — required; Postgres connection string (Neon).
- `ANTHROPIC_API_KEY` — required to call Anthropic endpoints.
- `GEMINI_API_KEY` — required to call Gemini endpoints.
- `NODE_ENV` — `development` enables Vite middleware; otherwise static serve.

### Build and Run

Defined in root `package.json`:

- `pnpm run dev` or `npm run dev` — start Express with tsx, Vite middleware in dev.
- `pnpm run build` — build React client (Vite) and bundle server with esbuild to `dist`.
- `pnpm start` — run production server from `dist`.

Server binds `0.0.0.0:5000` and serves both API and client.

### Key Files

- Server runtime: `server/index.ts`, `server/vite.ts`
- HTTP composition: `server/routes.ts`
- Persistence: `server/db.ts`, `server/storage.ts`, `shared/schema.ts`
- AI: `server/anthropic-claude.ts`, `server/gemini.ts`, `server/enhanced-gemini.ts`
- Parsing: `server/cobol-parser.ts`
- Agent & Observability: `server/autonomous-agent.ts`, `server/observability.ts`
- Errors: `server/error-handler.ts`


