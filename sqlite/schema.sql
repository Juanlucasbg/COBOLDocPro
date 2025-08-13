-- SQLite schema for COBOLDocPro backend
-- This mirrors the table structure used by the application (JSON/arrays mapped to TEXT)
-- Usage (PowerShell): sqlite3 .\coboldocpro.db ".read .\COBOLDocPro\sqlite\schema.sql"

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- programs
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  source_code TEXT NOT NULL,
  ai_summary TEXT,
  lines_of_code INTEGER NOT NULL,
  complexity INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified TEXT,
  author TEXT,
  date_written TEXT,
  description TEXT,
  total_statements INTEGER,
  business_rules TEXT, -- JSON array
  structure TEXT,      -- JSON
  system_explanation TEXT, -- JSON
  mermaid_diagram TEXT     -- JSON
);

-- repositories
CREATE TABLE IF NOT EXISTS repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  github_url TEXT NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  last_synced_commit TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  webhook_id TEXT,
  access_token TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- documentation
CREATE TABLE IF NOT EXISTS documentation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'markdown',
  version TEXT NOT NULL,
  metadata TEXT, -- JSON
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_documentation_program_id ON documentation(program_id);

-- diagrams
CREATE TABLE IF NOT EXISTS diagrams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  documentation_id INTEGER,
  program_id INTEGER,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documentation_id) REFERENCES documentation(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_diagrams_program_id ON diagrams(program_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_documentation_id ON diagrams(documentation_id);

-- data_elements
CREATE TABLE IF NOT EXISTS data_elements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER,
  name TEXT NOT NULL,
  picture TEXT,
  level TEXT,
  usage TEXT,
  description TEXT,
  parent_element TEXT,
  used_in_programs TEXT, -- JSON array
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_data_elements_program_id ON data_elements(program_id);

-- program_relationships
CREATE TABLE IF NOT EXISTS program_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_program_id INTEGER NOT NULL,
  to_program_id INTEGER,
  relationship_type TEXT NOT NULL,
  details TEXT,
  location TEXT,
  FOREIGN KEY (from_program_id) REFERENCES programs(id) ON DELETE CASCADE,
  FOREIGN KEY (to_program_id) REFERENCES programs(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_prog_rels_from ON program_relationships(from_program_id);
CREATE INDEX IF NOT EXISTS idx_prog_rels_to ON program_relationships(to_program_id);

-- upload_sessions
CREATE TABLE IF NOT EXISTS upload_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT
);

-- business_logic
CREATE TABLE IF NOT EXISTS business_logic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL,
  purpose TEXT NOT NULL,
  inputs TEXT,       -- JSON array
  outputs TEXT,      -- JSON array
  dependencies TEXT, -- JSON array of numbers
  conditions TEXT,
  actions TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_business_logic_program_id ON business_logic(program_id);

-- dependencies
CREATE TABLE IF NOT EXISTS dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_program_id INTEGER NOT NULL,
  to_program_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  context TEXT,
  strength TEXT NOT NULL DEFAULT 'medium',
  metadata TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_program_id) REFERENCES programs(id) ON DELETE CASCADE,
  FOREIGN KEY (to_program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dependencies_from ON dependencies(from_program_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_to ON dependencies(to_program_id);

-- code_files
CREATE TABLE IF NOT EXISTS code_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repository_id INTEGER NOT NULL,
  program_id INTEGER,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'COBOL',
  version TEXT NOT NULL,
  hash TEXT NOT NULL,
  size INTEGER NOT NULL,
  last_modified TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_code_files_repo ON code_files(repository_id);
CREATE INDEX IF NOT EXISTS idx_code_files_program ON code_files(program_id);

-- code_metrics
CREATE TABLE IF NOT EXISTS code_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  lines_of_code INTEGER NOT NULL,
  cyclomatic_complexity INTEGER NOT NULL,
  cognitive_complexity INTEGER NOT NULL,
  depth_of_nesting INTEGER NOT NULL,
  number_of_paragraphs INTEGER NOT NULL,
  number_of_sections INTEGER NOT NULL,
  halstead_metrics TEXT, -- JSON
  maintainability_index INTEGER,
  technical_debt_minutes INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_code_metrics_program ON code_metrics(program_id);

-- control_flow_graphs
CREATE TABLE IF NOT EXISTS control_flow_graphs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  nodes TEXT, -- JSON
  entry_node TEXT NOT NULL,
  exit_nodes TEXT, -- JSON array
  metadata TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cfg_program ON control_flow_graphs(program_id);

-- copybook_registry
CREATE TABLE IF NOT EXISTS copybook_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  library TEXT,
  content TEXT NOT NULL,
  data_elements TEXT, -- JSON array
  used_by_programs TEXT, -- JSON array of integers
  version TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- quality_issues
CREATE TABLE IF NOT EXISTS quality_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  rule TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  location TEXT, -- JSON
  suggestion TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quality_issues_program ON quality_issues(program_id);

-- business_rule_candidates
CREATE TABLE IF NOT EXISTS business_rule_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  location TEXT, -- JSON
  variables TEXT, -- JSON array
  conditions TEXT, -- JSON array
  actions TEXT, -- JSON array
  evidence TEXT, -- JSON array
  status TEXT NOT NULL DEFAULT 'candidate',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_brc_program ON business_rule_candidates(program_id);

-- jcl_jobs
CREATE TABLE IF NOT EXISTS jcl_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repository_id INTEGER NOT NULL,
  job_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  steps TEXT, -- JSON array
  dependencies TEXT, -- JSON array
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_jcl_jobs_repo ON jcl_jobs(repository_id);

-- impact_analysis_cache
CREATE TABLE IF NOT EXISTS impact_analysis_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  impacted_items TEXT, -- JSON array
  analysis_date TEXT NOT NULL,
  cache_expiry TEXT NOT NULL
);

-- transformation_readiness
CREATE TABLE IF NOT EXISTS transformation_readiness (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  readiness_score INTEGER NOT NULL,
  complexity_factors TEXT, -- JSON
  blockers TEXT, -- JSON array
  recommendations TEXT, -- JSON array
  estimated_effort_days INTEGER,
  target_platform TEXT,
  assessment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_transformation_readiness_program ON transformation_readiness(program_id);

COMMIT;


