import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const cobolPrograms = pgTable("cobol_programs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalContent: text("original_content").notNull(),
  size: integer("size").notNull(),
  status: text("status").notNull().default("uploaded"), // uploaded, processing, processed, error
  generatedDocumentation: text("generated_documentation"),
  programStructure: text("program_structure"), // JSON string
  businessRules: text("business_rules"), // JSON string
  diagrams: text("diagrams"), // JSON string
  errorMessage: text("error_message"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const insertCobolProgramSchema = createInsertSchema(cobolPrograms).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export type InsertCobolProgram = z.infer<typeof insertCobolProgramSchema>;
export type CobolProgram = typeof cobolPrograms.$inferSelect;

// Types for parsed COBOL structure
export interface CobolStructure {
  identification: {
    programId: string;
    author?: string;
    dateWritten?: string;
    installation?: string;
  };
  environment?: {
    configuration?: string[];
    inputOutput?: string[];
  };
  data: {
    workingStorage: CobolDataItem[];
    fileSection: CobolFileDescription[];
    linkageSection?: CobolDataItem[];
  };
  procedure: {
    paragraphs: CobolParagraph[];
    sections: CobolSection[];
  };
}

export interface CobolDataItem {
  level: number;
  name: string;
  picture?: string;
  value?: string;
  occurs?: number;
  redefines?: string;
  usage?: string;
  description?: string;
}

export interface CobolFileDescription {
  name: string;
  selectClause: string;
  record: CobolDataItem[];
  description?: string;
}

export interface CobolParagraph {
  name: string;
  statements: string[];
  description?: string;
  calls?: string[];
  calledBy?: string[];
}

export interface CobolSection {
  name: string;
  paragraphs: string[];
  description?: string;
}

// Business Rules types
export interface BusinessRule {
  id: string;
  type: 'calculation' | 'validation' | 'decision' | 'process' | 'data-flow';
  title: string;
  description: string;
  conditions?: string[];
  actions?: string[];
  location: {
    division: string;
    section?: string;
    paragraph?: string;
  };
  relatedItems?: string[];
}

// Diagram types
export interface DiagramData {
  flowchart: string; // Mermaid syntax
  dataStructure: string; // Mermaid syntax
  businessRules: string; // Mermaid syntax
  programStructure: string; // Mermaid syntax
}
