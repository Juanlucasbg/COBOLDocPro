import { pgTable, text, serial, integer, boolean, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").default("developer"), // developer, senior_developer, admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cobolPrograms = pgTable("cobol_programs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  programType: text("program_type").notNull(), // main, subroutine, copybook, jcl
  linesOfCode: integer("lines_of_code").default(0),
  complexity: integer("complexity").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dependencies = pgTable("dependencies", {
  id: serial("id").primaryKey(),
  fromProgramId: integer("from_program_id").references(() => cobolPrograms.id),
  toProgramId: integer("to_program_id").references(() => cobolPrograms.id),
  dependencyType: text("dependency_type").notNull(), // call, copy, data_flow, control_flow
  lineNumber: integer("line_number"),
  isCritical: boolean("is_critical").default(false),
  isCircular: boolean("is_circular").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentation = pgTable("documentation", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => cobolPrograms.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // ai_generated, manual, annotation
  authorId: integer("author_id").references(() => users.id),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const annotations = pgTable("annotations", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => cobolPrograms.id),
  userId: integer("user_id").references(() => users.id),
  lineNumber: integer("line_number").notNull(),
  content: text("content").notNull(),
  type: text("type").default("note"), // note, warning, bookmark, question
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tutorialModules = pgTable("tutorial_modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  content: json("content"), // JSON containing tutorial steps, exercises, etc.
  order: integer("order").notNull(),
  difficulty: text("difficulty").default("beginner"), // beginner, intermediate, advanced
  estimatedMinutes: integer("estimated_minutes").default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  moduleId: integer("module_id").references(() => tutorialModules.id),
  isCompleted: boolean("is_completed").default(false),
  progress: integer("progress").default(0), // 0-100
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  query: text("query").notNull(),
  resultCount: integer("result_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exports = pgTable("exports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  type: text("type").notNull(), // dependency_map, documentation, analysis_report
  filename: text("filename").notNull(),
  status: text("status").default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  documentation: many(documentation),
  annotations: many(annotations),
  progress: many(userProgress),
  searchHistory: many(searchHistory),
  exports: many(exports),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  programs: many(cobolPrograms),
  exports: many(exports),
}));

export const cobolProgramsRelations = relations(cobolPrograms, ({ one, many }) => ({
  project: one(projects, {
    fields: [cobolPrograms.projectId],
    references: [projects.id],
  }),
  fromDependencies: many(dependencies, { relationName: "fromProgram" }),
  toDependencies: many(dependencies, { relationName: "toProgram" }),
  documentation: many(documentation),
  annotations: many(annotations),
}));

export const dependenciesRelations = relations(dependencies, ({ one }) => ({
  fromProgram: one(cobolPrograms, {
    fields: [dependencies.fromProgramId],
    references: [cobolPrograms.id],
    relationName: "fromProgram",
  }),
  toProgram: one(cobolPrograms, {
    fields: [dependencies.toProgramId],
    references: [cobolPrograms.id],
    relationName: "toProgram",
  }),
}));

export const documentationRelations = relations(documentation, ({ one }) => ({
  program: one(cobolPrograms, {
    fields: [documentation.programId],
    references: [cobolPrograms.id],
  }),
  author: one(users, {
    fields: [documentation.authorId],
    references: [users.id],
  }),
}));

export const annotationsRelations = relations(annotations, ({ one }) => ({
  program: one(cobolPrograms, {
    fields: [annotations.programId],
    references: [cobolPrograms.id],
  }),
  user: one(users, {
    fields: [annotations.userId],
    references: [users.id],
  }),
}));

export const tutorialModulesRelations = relations(tutorialModules, ({ many }) => ({
  userProgress: many(userProgress),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  module: one(tutorialModules, {
    fields: [userProgress.moduleId],
    references: [tutorialModules.id],
  }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
}));

export const exportsRelations = relations(exports, ({ one }) => ({
  user: one(users, {
    fields: [exports.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [exports.projectId],
    references: [projects.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  ownerId: true,
});

export const insertCobolProgramSchema = createInsertSchema(cobolPrograms).pick({
  projectId: true,
  name: true,
  filename: true,
  content: true,
  programType: true,
  linesOfCode: true,
  complexity: true,
});

export const insertDependencySchema = createInsertSchema(dependencies).pick({
  fromProgramId: true,
  toProgramId: true,
  dependencyType: true,
  lineNumber: true,
  isCritical: true,
  isCircular: true,
});

export const insertDocumentationSchema = createInsertSchema(documentation).pick({
  programId: true,
  title: true,
  content: true,
  type: true,
  authorId: true,
  isPublic: true,
});

export const insertAnnotationSchema = createInsertSchema(annotations).pick({
  programId: true,
  userId: true,
  lineNumber: true,
  content: true,
  type: true,
});

export const insertTutorialModuleSchema = createInsertSchema(tutorialModules).pick({
  title: true,
  description: true,
  content: true,
  order: true,
  difficulty: true,
  estimatedMinutes: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).pick({
  userId: true,
  moduleId: true,
  isCompleted: true,
  progress: true,
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).pick({
  userId: true,
  query: true,
  resultCount: true,
});

export const insertExportSchema = createInsertSchema(exports).pick({
  userId: true,
  projectId: true,
  type: true,
  filename: true,
  status: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertCobolProgram = z.infer<typeof insertCobolProgramSchema>;
export type CobolProgram = typeof cobolPrograms.$inferSelect;

export type InsertDependency = z.infer<typeof insertDependencySchema>;
export type Dependency = typeof dependencies.$inferSelect;

export type InsertDocumentation = z.infer<typeof insertDocumentationSchema>;
export type Documentation = typeof documentation.$inferSelect;

export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;
export type Annotation = typeof annotations.$inferSelect;

export type InsertTutorialModule = z.infer<typeof insertTutorialModuleSchema>;
export type TutorialModule = typeof tutorialModules.$inferSelect;

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;

export type InsertExport = z.infer<typeof insertExportSchema>;
export type Export = typeof exports.$inferSelect;
