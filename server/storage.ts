import { 
  users, programs, dataElements, programRelationships, uploadSessions,
  repositories, codeFiles, documentation, diagrams, businessLogic, dependencies,
  type User, type InsertUser, type Program, type InsertProgram,
  type DataElement, type InsertDataElement, type ProgramRelationship,
  type InsertProgramRelationship, type UploadSession, type InsertUploadSession,
  type Repository, type InsertRepository, type CodeFile, type InsertCodeFile,
  type Documentation, type InsertDocumentation, type Diagram, type InsertDiagram,
  type BusinessLogic, type InsertBusinessLogic, type Dependency, type InsertDependency,
  type Statistics
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, count, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Program methods
  getProgram(id: number): Promise<Program | undefined>;
  getAllPrograms(): Promise<Program[]>;
  getProgramByName(name: string): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: number, updates: Partial<Program>): Promise<Program>;
  deleteProgram(id: number): Promise<void>;
  searchPrograms(query: string): Promise<Program[]>;

  // Data element methods
  getDataElementsByProgramId(programId: number): Promise<DataElement[]>;
  getAllDataElements(): Promise<DataElement[]>;
  createDataElement(dataElement: InsertDataElement): Promise<DataElement>;
  searchDataElements(query: string): Promise<DataElement[]>;

  // Program relationship methods
  getProgramRelationships(programId: number): Promise<ProgramRelationship[]>;
  createProgramRelationship(relationship: InsertProgramRelationship): Promise<ProgramRelationship>;

  // Upload session methods
  getUploadSession(id: number): Promise<UploadSession | undefined>;
  getAllUploadSessions(): Promise<UploadSession[]>;
  createUploadSession(session: InsertUploadSession): Promise<UploadSession>;
  updateUploadSession(id: number, updates: Partial<UploadSession>): Promise<UploadSession>;

  // Statistics
  getStatistics(): Promise<Statistics>;

  // Repository methods
  getRepository(id: number): Promise<Repository | undefined>;
  getAllRepositories(): Promise<Repository[]>;
  getRepositoriesByUser(userId: number): Promise<Repository[]>;
  createRepository(repository: InsertRepository): Promise<Repository>;
  updateRepository(id: number, updates: Partial<Repository>): Promise<Repository>;
  deleteRepository(id: number): Promise<void>;

  // Code file methods
  getCodeFile(id: number): Promise<CodeFile | undefined>;
  getCodeFilesByRepository(repositoryId: number): Promise<CodeFile[]>;
  createCodeFile(codeFile: InsertCodeFile): Promise<CodeFile>;
  updateCodeFile(id: number, updates: Partial<CodeFile>): Promise<CodeFile>;
  deleteCodeFilesByRepository(repositoryId: number): Promise<void>;

  // Documentation methods
  getDocumentation(programId: number, type: string): Promise<Documentation | undefined>;
  getAllDocumentationByProgram(programId: number): Promise<Documentation[]>;
  createDocumentation(doc: InsertDocumentation): Promise<Documentation>;
  updateDocumentation(id: number, updates: Partial<Documentation>): Promise<Documentation>;

  // Diagram methods
  getDiagramsByProgram(programId: number): Promise<Diagram[]>;
  getDiagramsByDocumentation(documentationId: number): Promise<Diagram[]>;
  createDiagram(diagram: InsertDiagram): Promise<Diagram>;

  // Business logic methods
  getBusinessLogicByProgram(programId: number): Promise<BusinessLogic[]>;
  createBusinessLogic(logic: InsertBusinessLogic): Promise<BusinessLogic>;

  // Dependency methods
  getDependenciesByProgram(programId: number): Promise<Dependency[]>;
  createDependency(dependency: InsertDependency): Promise<Dependency>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getProgram(id: number): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program || undefined;
  }

  async getAllPrograms(): Promise<Program[]> {
    return await db.select().from(programs);
  }

  async getProgramByName(name: string): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.name, name));
    return program || undefined;
  }

  async createProgram(insertProgram: InsertProgram): Promise<Program> {
    const [program] = await db
      .insert(programs)
      .values([insertProgram])
      .returning();
    return program;
  }

  async updateProgram(id: number, updates: Partial<Program>): Promise<Program> {
    const [program] = await db
      .update(programs)
      .set(updates)
      .where(eq(programs.id, id))
      .returning();
    
    if (!program) {
      throw new Error(`Program with id ${id} not found`);
    }
    
    return program;
  }

  async deleteProgram(id: number): Promise<void> {
    await db.delete(programs).where(eq(programs.id, id));
    await db.delete(dataElements).where(eq(dataElements.programId, id));
    await db.delete(programRelationships).where(
      or(
        eq(programRelationships.fromProgramId, id),
        eq(programRelationships.toProgramId, id)
      )
    );
  }

  async searchPrograms(query: string): Promise<Program[]> {
    return await db
      .select()
      .from(programs)
      .where(
        or(
          ilike(programs.name, `%${query}%`),
          ilike(programs.filename, `%${query}%`),
          ilike(programs.aiSummary, `%${query}%`)
        )
      );
  }

  async getDataElementsByProgramId(programId: number): Promise<DataElement[]> {
    return await db
      .select()
      .from(dataElements)
      .where(eq(dataElements.programId, programId));
  }

  async getAllDataElements(): Promise<DataElement[]> {
    return await db.select().from(dataElements);
  }

  async createDataElement(insertDataElement: InsertDataElement): Promise<DataElement> {
    const [dataElement] = await db
      .insert(dataElements)
      .values(insertDataElement)
      .returning();
    return dataElement;
  }

  async searchDataElements(query: string): Promise<DataElement[]> {
    return await db
      .select()
      .from(dataElements)
      .where(
        or(
          ilike(dataElements.name, `%${query}%`),
          ilike(dataElements.description, `%${query}%`)
        )
      );
  }

  async getProgramRelationships(programId: number): Promise<ProgramRelationship[]> {
    return await db
      .select()
      .from(programRelationships)
      .where(
        or(
          eq(programRelationships.fromProgramId, programId),
          eq(programRelationships.toProgramId, programId)
        )
      );
  }

  async createProgramRelationship(insertRelationship: InsertProgramRelationship): Promise<ProgramRelationship> {
    const [relationship] = await db
      .insert(programRelationships)
      .values(insertRelationship)
      .returning();
    return relationship;
  }

  async getUploadSession(id: number): Promise<UploadSession | undefined> {
    const [session] = await db.select().from(uploadSessions).where(eq(uploadSessions.id, id));
    return session || undefined;
  }

  async getAllUploadSessions(): Promise<UploadSession[]> {
    return await db.select().from(uploadSessions);
  }

  async createUploadSession(insertSession: InsertUploadSession): Promise<UploadSession> {
    const [session] = await db
      .insert(uploadSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateUploadSession(id: number, updates: Partial<UploadSession>): Promise<UploadSession> {
    const [session] = await db
      .update(uploadSessions)
      .set(updates)
      .where(eq(uploadSessions.id, id))
      .returning();
    
    if (!session) {
      throw new Error(`Upload session with id ${id} not found`);
    }
    
    return session;
  }

  async getStatistics(): Promise<Statistics> {
    const [totalPrograms] = await db
      .select({ count: count() })
      .from(programs);

    const [documentedPrograms] = await db
      .select({ count: count() })
      .from(programs)
      .where(eq(programs.status, 'completed'));

    const [dataElementsCount] = await db
      .select({ count: count() })
      .from(dataElements);

    const [issuesFound] = await db
      .select({ count: count() })
      .from(programs)
      .where(eq(programs.status, 'failed'));
    
    const [repositoriesCount] = await db
      .select({ count: count() })
      .from(repositories);
    
    const [totalFilesCount] = await db
      .select({ count: count() })
      .from(codeFiles);
    
    return {
      totalPrograms: totalPrograms.count,
      documentedPrograms: documentedPrograms.count,
      dataElements: dataElementsCount.count,
      issuesFound: issuesFound.count,
      repositories: repositoriesCount.count,
      totalFiles: totalFilesCount.count,
    };
  }

  // Repository methods
  async getRepository(id: number): Promise<Repository | undefined> {
    const [repository] = await db.select().from(repositories).where(eq(repositories.id, id));
    return repository || undefined;
  }

  async getAllRepositories(): Promise<Repository[]> {
    return await db.select().from(repositories);
  }

  async getRepositoriesByUser(userId: number): Promise<Repository[]> {
    return await db.select().from(repositories).where(eq(repositories.userId, userId));
  }

  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const [repository] = await db
      .insert(repositories)
      .values([insertRepository])
      .returning();
    return repository;
  }

  async updateRepository(id: number, updates: Partial<Repository>): Promise<Repository> {
    const [repository] = await db
      .update(repositories)
      .set(updates)
      .where(eq(repositories.id, id))
      .returning();
    
    if (!repository) {
      throw new Error(`Repository with id ${id} not found`);
    }
    
    return repository;
  }

  async deleteRepository(id: number): Promise<void> {
    await db.delete(codeFiles).where(eq(codeFiles.repositoryId, id));
    await db.delete(repositories).where(eq(repositories.id, id));
  }

  // Code file methods
  async getCodeFile(id: number): Promise<CodeFile | undefined> {
    const [codeFile] = await db.select().from(codeFiles).where(eq(codeFiles.id, id));
    return codeFile || undefined;
  }

  async getCodeFilesByRepository(repositoryId: number): Promise<CodeFile[]> {
    return await db.select().from(codeFiles).where(eq(codeFiles.repositoryId, repositoryId));
  }

  async createCodeFile(insertCodeFile: InsertCodeFile): Promise<CodeFile> {
    const [codeFile] = await db
      .insert(codeFiles)
      .values([insertCodeFile])
      .returning();
    return codeFile;
  }

  async updateCodeFile(id: number, updates: Partial<CodeFile>): Promise<CodeFile> {
    const [codeFile] = await db
      .update(codeFiles)
      .set(updates)
      .where(eq(codeFiles.id, id))
      .returning();
    
    if (!codeFile) {
      throw new Error(`Code file with id ${id} not found`);
    }
    
    return codeFile;
  }

  async deleteCodeFilesByRepository(repositoryId: number): Promise<void> {
    await db.delete(codeFiles).where(eq(codeFiles.repositoryId, repositoryId));
  }

  // Documentation methods
  async getDocumentation(programId: number, type: string): Promise<Documentation | undefined> {
    const [doc] = await db
      .select()
      .from(documentation)
      .where(and(
        eq(documentation.programId, programId),
        eq(documentation.type, type)
      ));
    return doc || undefined;
  }

  async getAllDocumentationByProgram(programId: number): Promise<Documentation[]> {
    return await db.select().from(documentation).where(eq(documentation.programId, programId));
  }

  async createDocumentation(insertDoc: InsertDocumentation): Promise<Documentation> {
    const [doc] = await db
      .insert(documentation)
      .values([insertDoc])
      .returning();
    return doc;
  }

  async updateDocumentation(id: number, updates: Partial<Documentation>): Promise<Documentation> {
    const [doc] = await db
      .update(documentation)
      .set(updates)
      .where(eq(documentation.id, id))
      .returning();
    
    if (!doc) {
      throw new Error(`Documentation with id ${id} not found`);
    }
    
    return doc;
  }

  // Diagram methods
  async getDiagramsByProgram(programId: number): Promise<Diagram[]> {
    return await db.select().from(diagrams).where(eq(diagrams.programId, programId));
  }

  async getDiagramsByDocumentation(documentationId: number): Promise<Diagram[]> {
    return await db.select().from(diagrams).where(eq(diagrams.documentationId, documentationId));
  }

  async createDiagram(insertDiagram: InsertDiagram): Promise<Diagram> {
    const [diagram] = await db
      .insert(diagrams)
      .values([insertDiagram])
      .returning();
    return diagram;
  }

  // Business logic methods
  async getBusinessLogicByProgram(programId: number): Promise<BusinessLogic[]> {
    return await db.select().from(businessLogic).where(eq(businessLogic.programId, programId));
  }

  async createBusinessLogic(insertLogic: InsertBusinessLogic): Promise<BusinessLogic> {
    const [logic] = await db
      .insert(businessLogic)
      .values([insertLogic])
      .returning();
    return logic;
  }

  // Dependency methods
  async getDependenciesByProgram(programId: number): Promise<Dependency[]> {
    return await db
      .select()
      .from(dependencies)
      .where(
        or(
          eq(dependencies.fromProgramId, programId),
          eq(dependencies.toProgramId, programId)
        )
      );
  }

  async createDependency(insertDependency: InsertDependency): Promise<Dependency> {
    const [dependency] = await db
      .insert(dependencies)
      .values([insertDependency])
      .returning();
    return dependency;
  }
}

export const storage = new DatabaseStorage();
