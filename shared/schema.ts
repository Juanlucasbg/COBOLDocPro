import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  githubToken: text("github_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New table for GitHub repositories
export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  githubUrl: text("github_url").notNull(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  branch: text("branch").notNull().default("main"),
  lastSyncedCommit: text("last_synced_commit"),
  syncStatus: text("sync_status").notNull().default("pending"), // pending, syncing, completed, failed
  webhookId: text("webhook_id"),
  accessToken: text("access_token"), // encrypted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Table for code files from repositories
export const codeFiles = pgTable("code_files", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(),
  programId: integer("program_id"), // Link to existing programs table
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull().default("COBOL"), // COBOL, JCL, COPYBOOK
  version: text("version").notNull(),
  hash: text("hash").notNull(),
  size: integer("size").notNull(),
  lastModified: timestamp("last_modified").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  sourceCode: text("source_code").notNull(),
  aiSummary: text("ai_summary"),
  linesOfCode: integer("lines_of_code").notNull(),
  complexity: integer("complexity"), // Changed to integer for cyclomatic complexity
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  lastModified: timestamp("last_modified"),
  // Enhanced fields from RobustCOBOLParser
  author: text("author"),
  dateWritten: text("date_written"),
  description: text("description"),
  totalStatements: integer("total_statements"),
  businessRules: jsonb("business_rules").$type<Array<{
    rule: string;
    condition: string;
    action: string;
    codeLocation: string;
  }>>(),
  structure: jsonb("structure").$type<{
    divisions: Array<{
      name: string;
      sections: Array<{
        name: string;
        paragraphs?: string[];
      }>;
    }>;
  }>(),
  systemExplanation: jsonb("system_explanation").$type<{
    plainEnglishSummary: string;
    keyBusinessProcesses: string[];
    dataFlow: string;
    userImpact: string;
    technicalComplexity: string;
  }>(),
  mermaidDiagram: jsonb("mermaid_diagram").$type<{
    type: "flowchart" | "sequenceDiagram" | "classDiagram" | "erDiagram";
    title: string;
    description: string;
    mermaidCode: string;
  }>(),
});

export const dataElements = pgTable("data_elements", {
  id: serial("id").primaryKey(),
  programId: integer("program_id"), // Made nullable for repository analysis
  name: text("name").notNull(),
  picture: text("picture"),
  level: text("level"),
  usage: text("usage"),
  description: text("description"),
  parentElement: text("parent_element"),
  usedInPrograms: text("used_in_programs").array(),
});

export const programRelationships = pgTable("program_relationships", {
  id: serial("id").primaryKey(),
  fromProgramId: integer("from_program_id").notNull(),
  toProgramId: integer("to_program_id"),
  relationshipType: text("relationship_type").notNull(), // CALL, PERFORM, INCLUDE, GO_TO
  details: text("details"), // target program/paragraph name
  location: text("location"), // where in the code this relationship occurs
});

export const uploadSessions = pgTable("upload_sessions", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  status: text("status").notNull().default("uploaded"), // uploaded, processing, completed, failed
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  errorMessage: text("error_message"),
});

// Enhanced documentation table
export const documentation = pgTable("documentation", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  type: text("type").notNull(), // overview, book, member, architecture, business-logic
  content: text("content").notNull(),
  format: text("format").notNull().default("markdown"), // markdown, html, pdf
  version: text("version").notNull(),
  metadata: jsonb("metadata").$type<{
    sections?: string[];
    pageCount?: number;
    lastReviewed?: string;
    approvedBy?: string;
  }>(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Diagrams table
export const diagrams = pgTable("diagrams", {
  id: serial("id").primaryKey(),
  documentationId: integer("documentation_id"),
  programId: integer("program_id"),
  type: text("type").notNull(), // mermaid, decision-tree, flow, architecture
  title: text("title").notNull(),
  description: text("description"),
  code: text("code").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Business logic extraction
export const businessLogic = pgTable("business_logic", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  ruleName: text("rule_name").notNull(),
  description: text("description").notNull(),
  source: text("source").notNull(), // Source code location
  purpose: text("purpose").notNull(),
  inputs: jsonb("inputs").$type<string[]>(),
  outputs: jsonb("outputs").$type<string[]>(),
  dependencies: jsonb("dependencies").$type<number[]>(),
  conditions: text("conditions"),
  actions: text("actions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced dependency tracking
export const dependencies = pgTable("dependencies", {
  id: serial("id").primaryKey(),
  fromProgramId: integer("from_program_id").notNull(),
  toProgramId: integer("to_program_id").notNull(),
  type: text("type").notNull(), // calls, includes, references, uses-data
  context: text("context"),
  strength: text("strength").notNull().default("medium"), // strong, medium, weak
  metadata: jsonb("metadata").$type<{
    lineNumbers?: number[];
    variables?: string[];
    frequency?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Control Flow Graphs
export const controlFlowGraphs = pgTable("control_flow_graphs", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  nodes: jsonb("nodes").$type<Array<{
    id: string;
    type: string;
    statement?: string;
    condition?: string;
    location: { line: number; paragraph?: string; section?: string };
    predecessors: string[];
    successors: string[];
  }>>(),
  entryNode: text("entry_node").notNull(),
  exitNodes: text("exit_nodes").array(),
  metadata: jsonb("metadata").$type<{
    complexity?: number;
    nodeCount?: number;
    edgeCount?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Quality Issues
export const qualityIssues = pgTable("quality_issues", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  rule: text("rule").notNull(),
  severity: text("severity").notNull(), // critical, major, minor, info
  category: text("category").notNull(), // bug, vulnerability, smell, performance
  message: text("message").notNull(),
  location: jsonb("location").$type<{
    line: number;
    column?: number;
    paragraph?: string;
    endLine?: number;
  }>(),
  suggestion: text("suggestion"),
  status: text("status").notNull().default("open"), // open, fixed, suppressed, false-positive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Code Metrics
export const codeMetrics = pgTable("code_metrics", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  linesOfCode: integer("lines_of_code").notNull(),
  cyclomaticComplexity: integer("cyclomatic_complexity").notNull(),
  cognitiveComplexity: integer("cognitive_complexity").notNull(),
  depthOfNesting: integer("depth_of_nesting").notNull(),
  numberOfParagraphs: integer("number_of_paragraphs").notNull(),
  numberOfSections: integer("number_of_sections").notNull(),
  halsteadMetrics: jsonb("halstead_metrics").$type<{
    vocabulary: number;
    length: number;
    difficulty: number;
    effort: number;
  }>(),
  maintainabilityIndex: integer("maintainability_index"),
  technicalDebt: integer("technical_debt_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Business Rule Candidates
export const businessRuleCandidates = pgTable("business_rule_candidates", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  type: text("type").notNull(), // condition, calculation, validation, decision
  description: text("description").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  location: jsonb("location").$type<{
    line: number;
    paragraph?: string;
    section?: string;
  }>(),
  variables: text("variables").array(),
  conditions: text("conditions").array(),
  actions: text("actions").array(),
  evidence: text("evidence").array(),
  status: text("status").notNull().default("candidate"), // candidate, confirmed, rejected
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// JCL Jobs and Steps
export const jclJobs = pgTable("jcl_jobs", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(),
  jobName: text("job_name").notNull(),
  filePath: text("file_path").notNull(),
  content: text("content").notNull(),
  steps: jsonb("steps").$type<Array<{
    stepName: string;
    program?: string;
    datasets: string[];
    conditions?: string[];
    order: number;
  }>>(),
  dependencies: jsonb("dependencies").$type<Array<{
    type: 'dataset' | 'program' | 'job';
    target: string;
    relationship: 'input' | 'output' | 'calls';
  }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Copybook Registry
export const copybookRegistry = pgTable("copybook_registry", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  library: text("library"),
  content: text("content").notNull(),
  dataElements: jsonb("data_elements").$type<Array<{
    name: string;
    level: number;
    picture?: string;
    usage?: string;
    redefines?: string;
    occurs?: number;
    dependingOn?: string;
  }>>(),
  usedByPrograms: integer("used_by_programs").array(),
  version: text("version").notNull(),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Impact Analysis Cache
export const impactAnalysisCache = pgTable("impact_analysis_cache", {
  id: serial("id").primaryKey(),
  sourceType: text("source_type").notNull(), // program, copybook, dataset
  sourceId: text("source_id").notNull(),
  impactedItems: jsonb("impacted_items").$type<Array<{
    type: string;
    id: string;
    name: string;
    relationship: string;
    severity: 'high' | 'medium' | 'low';
  }>>(),
  analysisDate: timestamp("analysis_date").notNull(),
  cacheExpiry: timestamp("cache_expiry").notNull(),
});

// Transformation Readiness
export const transformationReadiness = pgTable("transformation_readiness", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  readinessScore: integer("readiness_score").notNull(), // 0-100
  complexityFactors: jsonb("complexity_factors").$type<{
    dialectSpecific: number;
    dataStructureComplexity: number;
    businessLogicComplexity: number;
    externalDependencies: number;
  }>(),
  blockers: text("blockers").array(),
  recommendations: text("recommendations").array(),
  estimatedEffort: integer("estimated_effort_days"),
  targetPlatform: text("target_platform"),
  assessmentDate: timestamp("assessment_date").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  githubToken: true,
});

export const insertRepositorySchema = createInsertSchema(repositories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodeFileSchema = createInsertSchema(codeFiles).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentationSchema = createInsertSchema(documentation).omit({
  id: true,
  generatedAt: true,
  updatedAt: true,
});

export const insertDiagramSchema = createInsertSchema(diagrams).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessLogicSchema = createInsertSchema(businessLogic).omit({
  id: true,
  createdAt: true,
});

export const insertDependencySchema = createInsertSchema(dependencies).omit({
  id: true,
  createdAt: true,
});

export const insertControlFlowGraphSchema = createInsertSchema(controlFlowGraphs).omit({
  id: true,
  createdAt: true,
});

export const insertQualityIssueSchema = createInsertSchema(qualityIssues).omit({
  id: true,
  createdAt: true,
});

export const insertCodeMetricsSchema = createInsertSchema(codeMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessRuleCandidateSchema = createInsertSchema(businessRuleCandidates).omit({
  id: true,
  createdAt: true,
});

export const insertJclJobSchema = createInsertSchema(jclJobs).omit({
  id: true,
  createdAt: true,
});

export const insertCopybookRegistrySchema = createInsertSchema(copybookRegistry).omit({
  id: true,
  createdAt: true,
});

export const insertTransformationReadinessSchema = createInsertSchema(transformationReadiness).omit({
  id: true,
  assessmentDate: true,
});

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
  uploadedAt: true,
});

export const insertDataElementSchema = createInsertSchema(dataElements).omit({
  id: true,
});

export const insertProgramRelationshipSchema = createInsertSchema(programRelationships).omit({
  id: true,
});

export const insertUploadSessionSchema = createInsertSchema(uploadSessions).omit({
  id: true,
  uploadedAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type CodeFile = typeof codeFiles.$inferSelect;
export type InsertCodeFile = z.infer<typeof insertCodeFileSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type DataElement = typeof dataElements.$inferSelect;
export type InsertDataElement = z.infer<typeof insertDataElementSchema>;
export type ProgramRelationship = typeof programRelationships.$inferSelect;
export type InsertProgramRelationship = z.infer<typeof insertProgramRelationshipSchema>;
export type UploadSession = typeof uploadSessions.$inferSelect;
export type InsertUploadSession = z.infer<typeof insertUploadSessionSchema>;
export type Documentation = typeof documentation.$inferSelect;
export type InsertDocumentation = z.infer<typeof insertDocumentationSchema>;
export type Diagram = typeof diagrams.$inferSelect;
export type InsertDiagram = z.infer<typeof insertDiagramSchema>;
export type BusinessLogic = typeof businessLogic.$inferSelect;
export type InsertBusinessLogic = z.infer<typeof insertBusinessLogicSchema>;
export type Dependency = typeof dependencies.$inferSelect;
export type InsertDependency = z.infer<typeof insertDependencySchema>;
export type ControlFlowGraph = typeof controlFlowGraphs.$inferSelect;
export type InsertControlFlowGraph = z.infer<typeof insertControlFlowGraphSchema>;
export type QualityIssue = typeof qualityIssues.$inferSelect;
export type InsertQualityIssue = z.infer<typeof insertQualityIssueSchema>;
export type CodeMetrics = typeof codeMetrics.$inferSelect;
export type InsertCodeMetrics = z.infer<typeof insertCodeMetricsSchema>;
export type BusinessRuleCandidate = typeof businessRuleCandidates.$inferSelect;
export type InsertBusinessRuleCandidate = z.infer<typeof insertBusinessRuleCandidateSchema>;
export type JclJob = typeof jclJobs.$inferSelect;
export type InsertJclJob = z.infer<typeof insertJclJobSchema>;
export type CopybookRegistry = typeof copybookRegistry.$inferSelect;
export type InsertCopybookRegistry = z.infer<typeof insertCopybookRegistrySchema>;
export type ImpactAnalysisCache = typeof impactAnalysisCache.$inferSelect;
export type TransformationReadiness = typeof transformationReadiness.$inferSelect;
export type InsertTransformationReadiness = z.infer<typeof insertTransformationReadinessSchema>;

// Statistics type
export type Statistics = {
  totalPrograms: number;
  documentedPrograms: number;
  dataElements: number;
  issuesFound: number;
  repositories: number;
  totalFiles: number;
  qualityIssues: number;
  businessRules: number;
  copybooksManaged: number;
  averageComplexity: number;
};
