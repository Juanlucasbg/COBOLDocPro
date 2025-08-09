import { 
  users, projects, cobolPrograms, dependencies, documentation, annotations,
  tutorialModules, userProgress, searchHistory, exports,
  type User, type InsertUser, type Project, type InsertProject,
  type CobolProgram, type InsertCobolProgram, type Dependency, type InsertDependency,
  type Documentation, type InsertDocumentation, type Annotation, type InsertAnnotation,
  type TutorialModule, type InsertTutorialModule, type UserProgress, type InsertUserProgress,
  type SearchHistory, type InsertSearchHistory, type Export, type InsertExport
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, or, and, sql } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project management
  getProjects(ownerId?: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  
  // COBOL Program management
  getPrograms(projectId?: number): Promise<CobolProgram[]>;
  getProgram(id: number): Promise<CobolProgram | undefined>;
  getProgramByName(name: string, projectId?: number): Promise<CobolProgram | undefined>;
  createProgram(program: InsertCobolProgram): Promise<CobolProgram>;
  updateProgram(id: number, updates: Partial<InsertCobolProgram>): Promise<CobolProgram | undefined>;
  deleteProgram(id: number): Promise<boolean>;
  
  // Dependency management
  getDependencies(programId?: number): Promise<Dependency[]>;
  getDependency(id: number): Promise<Dependency | undefined>;
  createDependency(dependency: InsertDependency): Promise<Dependency>;
  deleteDependency(id: number): Promise<boolean>;
  
  // Documentation management
  getDocumentation(programId?: number): Promise<Documentation[]>;
  getDocumentationById(id: number): Promise<Documentation | undefined>;
  createDocumentation(doc: InsertDocumentation): Promise<Documentation>;
  updateDocumentation(id: number, updates: Partial<InsertDocumentation>): Promise<Documentation | undefined>;
  deleteDocumentation(id: number): Promise<boolean>;
  
  // Annotation management
  getAnnotations(programId?: number, userId?: number): Promise<Annotation[]>;
  getAnnotation(id: number): Promise<Annotation | undefined>;
  createAnnotation(annotation: InsertAnnotation): Promise<Annotation>;
  updateAnnotation(id: number, updates: Partial<InsertAnnotation>): Promise<Annotation | undefined>;
  deleteAnnotation(id: number): Promise<boolean>;
  
  // Tutorial management
  getTutorialModules(): Promise<TutorialModule[]>;
  getTutorialModule(id: number): Promise<TutorialModule | undefined>;
  createTutorialModule(module: InsertTutorialModule): Promise<TutorialModule>;
  
  // User progress
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getUserModuleProgress(userId: number, moduleId: number): Promise<UserProgress | undefined>;
  updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  
  // Search functionality
  searchPrograms(query: string, projectId?: number): Promise<CobolProgram[]>;
  searchDocumentation(query: string): Promise<Documentation[]>;
  addSearchHistory(search: InsertSearchHistory): Promise<SearchHistory>;
  getUserSearchHistory(userId: number): Promise<SearchHistory[]>;
  
  // Export functionality
  getExports(userId?: number): Promise<Export[]>;
  createExport(exportData: InsertExport): Promise<Export>;
  updateExport(id: number, updates: Partial<InsertExport>): Promise<Export | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Project management
  async getProjects(ownerId?: number): Promise<Project[]> {
    if (ownerId) {
      return await db.select().from(projects).where(eq(projects.ownerId, ownerId));
    }
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  // COBOL Program management
  async getPrograms(projectId?: number): Promise<CobolProgram[]> {
    if (projectId) {
      return await db.select().from(cobolPrograms)
        .where(eq(cobolPrograms.projectId, projectId));
    }
    return await db.select().from(cobolPrograms);
  }

  async getProgram(id: number): Promise<CobolProgram | undefined> {
    const [program] = await db.select().from(cobolPrograms).where(eq(cobolPrograms.id, id));
    return program || undefined;
  }

  async getProgramByName(name: string, projectId?: number): Promise<CobolProgram | undefined> {
    const whereClause = projectId 
      ? and(eq(cobolPrograms.name, name), eq(cobolPrograms.projectId, projectId))
      : eq(cobolPrograms.name, name);
      
    const [program] = await db.select().from(cobolPrograms).where(whereClause);
    return program || undefined;
  }

  async createProgram(program: InsertCobolProgram): Promise<CobolProgram> {
    const [newProgram] = await db.insert(cobolPrograms).values(program).returning();
    return newProgram;
  }

  async updateProgram(id: number, updates: Partial<InsertCobolProgram>): Promise<CobolProgram | undefined> {
    const [updated] = await db.update(cobolPrograms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cobolPrograms.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProgram(id: number): Promise<boolean> {
    const result = await db.delete(cobolPrograms).where(eq(cobolPrograms.id, id));
    return result.rowCount > 0;
  }

  // Dependency management
  async getDependencies(programId?: number): Promise<Dependency[]> {
    if (programId) {
      return await db.select().from(dependencies)
        .where(or(
          eq(dependencies.fromProgramId, programId),
          eq(dependencies.toProgramId, programId)
        ));
    }
    return await db.select().from(dependencies);
  }

  async getDependency(id: number): Promise<Dependency | undefined> {
    const [dependency] = await db.select().from(dependencies).where(eq(dependencies.id, id));
    return dependency || undefined;
  }

  async createDependency(dependency: InsertDependency): Promise<Dependency> {
    const [newDependency] = await db.insert(dependencies).values(dependency).returning();
    return newDependency;
  }

  async deleteDependency(id: number): Promise<boolean> {
    const result = await db.delete(dependencies).where(eq(dependencies.id, id));
    return result.rowCount > 0;
  }

  // Documentation management
  async getDocumentation(programId?: number): Promise<Documentation[]> {
    if (programId) {
      return await db.select().from(documentation)
        .where(eq(documentation.programId, programId))
        .orderBy(desc(documentation.updatedAt));
    }
    return await db.select().from(documentation).orderBy(desc(documentation.updatedAt));
  }

  async getDocumentationById(id: number): Promise<Documentation | undefined> {
    const [doc] = await db.select().from(documentation).where(eq(documentation.id, id));
    return doc || undefined;
  }

  async createDocumentation(doc: InsertDocumentation): Promise<Documentation> {
    const [newDoc] = await db.insert(documentation).values(doc).returning();
    return newDoc;
  }

  async updateDocumentation(id: number, updates: Partial<InsertDocumentation>): Promise<Documentation | undefined> {
    const [updated] = await db.update(documentation)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documentation.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDocumentation(id: number): Promise<boolean> {
    const result = await db.delete(documentation).where(eq(documentation.id, id));
    return result.rowCount > 0;
  }

  // Annotation management
  async getAnnotations(programId?: number, userId?: number): Promise<Annotation[]> {
    let whereClause = undefined;
    if (programId && userId) {
      whereClause = and(eq(annotations.programId, programId), eq(annotations.userId, userId));
    } else if (programId) {
      whereClause = eq(annotations.programId, programId);
    } else if (userId) {
      whereClause = eq(annotations.userId, userId);
    }

    return await db.select().from(annotations)
      .where(whereClause)
      .orderBy(desc(annotations.createdAt));
  }

  async getAnnotation(id: number): Promise<Annotation | undefined> {
    const [annotation] = await db.select().from(annotations).where(eq(annotations.id, id));
    return annotation || undefined;
  }

  async createAnnotation(annotation: InsertAnnotation): Promise<Annotation> {
    const [newAnnotation] = await db.insert(annotations).values(annotation).returning();
    return newAnnotation;
  }

  async updateAnnotation(id: number, updates: Partial<InsertAnnotation>): Promise<Annotation | undefined> {
    const [updated] = await db.update(annotations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(annotations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAnnotation(id: number): Promise<boolean> {
    const result = await db.delete(annotations).where(eq(annotations.id, id));
    return result.rowCount > 0;
  }

  // Tutorial management
  async getTutorialModules(): Promise<TutorialModule[]> {
    return await db.select().from(tutorialModules)
      .where(eq(tutorialModules.isActive, true))
      .orderBy(tutorialModules.order);
  }

  async getTutorialModule(id: number): Promise<TutorialModule | undefined> {
    const [module] = await db.select().from(tutorialModules).where(eq(tutorialModules.id, id));
    return module || undefined;
  }

  async createTutorialModule(module: InsertTutorialModule): Promise<TutorialModule> {
    const [newModule] = await db.insert(tutorialModules).values(module).returning();
    return newModule;
  }

  // User progress
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return await db.select().from(userProgress)
      .where(eq(userProgress.userId, userId))
      .orderBy(desc(userProgress.lastAccessedAt));
  }

  async getUserModuleProgress(userId: number, moduleId: number): Promise<UserProgress | undefined> {
    const [progress] = await db.select().from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.moduleId, moduleId)));
    return progress || undefined;
  }

  async updateUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const existing = await this.getUserModuleProgress(progress.userId, progress.moduleId);
    
    if (existing) {
      const [updated] = await db.update(userProgress)
        .set({ 
          ...progress, 
          lastAccessedAt: new Date(),
          completedAt: progress.isCompleted ? new Date() : existing.completedAt
        })
        .where(and(
          eq(userProgress.userId, progress.userId),
          eq(userProgress.moduleId, progress.moduleId)
        ))
        .returning();
      return updated;
    } else {
      const [newProgress] = await db.insert(userProgress).values({
        ...progress,
        completedAt: progress.isCompleted ? new Date() : undefined
      }).returning();
      return newProgress;
    }
  }

  // Search functionality
  async searchPrograms(query: string, projectId?: number): Promise<CobolProgram[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    let whereClause = or(
      like(sql`LOWER(${cobolPrograms.name})`, searchPattern),
      like(sql`LOWER(${cobolPrograms.filename})`, searchPattern),
      like(sql`LOWER(${cobolPrograms.content})`, searchPattern)
    );

    if (projectId) {
      whereClause = and(whereClause, eq(cobolPrograms.projectId, projectId));
    }

    return await db.select().from(cobolPrograms).where(whereClause);
  }

  async searchDocumentation(query: string): Promise<Documentation[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    return await db.select().from(documentation)
      .where(or(
        like(sql`LOWER(${documentation.title})`, searchPattern),
        like(sql`LOWER(${documentation.content})`, searchPattern)
      ))
      .orderBy(desc(documentation.updatedAt));
  }

  async addSearchHistory(search: InsertSearchHistory): Promise<SearchHistory> {
    const [newSearch] = await db.insert(searchHistory).values(search).returning();
    return newSearch;
  }

  async getUserSearchHistory(userId: number): Promise<SearchHistory[]> {
    return await db.select().from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.createdAt))
      .limit(10);
  }

  // Export functionality
  async getExports(userId?: number): Promise<Export[]> {
    if (userId) {
      return await db.select().from(exports)
        .where(eq(exports.userId, userId))
        .orderBy(desc(exports.createdAt));
    }
    return await db.select().from(exports).orderBy(desc(exports.createdAt));
  }

  async createExport(exportData: InsertExport): Promise<Export> {
    const [newExport] = await db.insert(exports).values(exportData).returning();
    return newExport;
  }

  async updateExport(id: number, updates: Partial<InsertExport>): Promise<Export | undefined> {
    const [updated] = await db.update(exports)
      .set({ 
        ...updates, 
        completedAt: updates.status === 'completed' ? new Date() : undefined 
      })
      .where(eq(exports.id, id))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
