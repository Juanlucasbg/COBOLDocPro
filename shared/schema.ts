import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type DataElement = typeof dataElements.$inferSelect;
export type InsertDataElement = z.infer<typeof insertDataElementSchema>;
export type ProgramRelationship = typeof programRelationships.$inferSelect;
export type InsertProgramRelationship = z.infer<typeof insertProgramRelationshipSchema>;
export type UploadSession = typeof uploadSessions.$inferSelect;
export type InsertUploadSession = z.infer<typeof insertUploadSessionSchema>;
