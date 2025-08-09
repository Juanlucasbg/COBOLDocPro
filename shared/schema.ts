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
  complexity: text("complexity"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  lastModified: timestamp("last_modified"),
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
  programId: integer("program_id").notNull(),
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
  toProgramId: integer("to_program_id").notNull(),
  relationshipType: text("relationship_type").notNull(), // calls, includes, references
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

// Statistics type
export type Statistics = {
  totalPrograms: number;
  documentedPrograms: number;
  dataElements: number;
  issuesFound: number;
  repositories: number;
  totalFiles: number;
};
