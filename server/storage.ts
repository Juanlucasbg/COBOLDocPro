import { 
  users, programs, dataElements, programRelationships, uploadSessions,
  repositories, codeFiles, documentation, diagrams, businessLogic, dependencies,
  qualityIssues, codeMetrics, businessRuleCandidates, controlFlowGraphs, jclJobs,
  copybookRegistry, transformationReadiness,
  type User, type InsertUser, type Program, type InsertProgram,
  type DataElement, type InsertDataElement, type ProgramRelationship,
  type InsertProgramRelationship, type UploadSession, type InsertUploadSession,
  type Repository, type InsertRepository, type CodeFile, type InsertCodeFile,
  type Documentation, type InsertDocumentation, type Diagram, type InsertDiagram,
  type BusinessLogic, type InsertBusinessLogic, type Dependency, type InsertDependency,
  type QualityIssue, type InsertQualityIssue, type CodeMetrics, type InsertCodeMetrics,
  type BusinessRuleCandidate, type InsertBusinessRuleCandidate, type ControlFlowGraph,
  type InsertControlFlowGraph, type JclJob, type InsertJclJob, type CopybookRegistry,
  type InsertCopybookRegistry, type TransformationReadiness, type InsertTransformationReadiness,
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
  getAllDependencies(): Promise<Dependency[]>;

  // Quality issue methods
  getQualityIssuesByProgram(programId: number): Promise<QualityIssue[]>;
  createQualityIssue(issue: InsertQualityIssue): Promise<QualityIssue>;
  updateQualityIssue(id: number, updates: Partial<QualityIssue>): Promise<QualityIssue>;
  getQualityIssuesByRule(rule: string): Promise<QualityIssue[]>;

  // Code metrics methods
  getCodeMetricsByProgram(programId: number): Promise<CodeMetrics | undefined>;
  createCodeMetrics(metrics: InsertCodeMetrics): Promise<CodeMetrics>;
  updateCodeMetrics(programId: number, updates: Partial<CodeMetrics>): Promise<CodeMetrics>;

  // Business rule candidate methods
  getBusinessRuleCandidatesByProgram(programId: number): Promise<BusinessRuleCandidate[]>;
  getBusinessRuleCandidate(id: string): Promise<BusinessRuleCandidate | undefined>;
  updateBusinessRuleCandidate(id: string, updates: Partial<BusinessRuleCandidate>): Promise<BusinessRuleCandidate>;
  
  // Control flow graph methods
  getControlFlowGraphByProgram(programId: number): Promise<ControlFlowGraph | undefined>;
  createControlFlowGraph(cfg: InsertControlFlowGraph): Promise<ControlFlowGraph>;

  // JCL job methods
  getJclJobsByRepository(repositoryId: number): Promise<JclJob[]>;
  createJclJob(job: InsertJclJob): Promise<JclJob>;

  // Copybook registry methods
  getCopybookByName(name: string): Promise<CopybookRegistry | undefined>;
  createCopybook(copybook: InsertCopybookRegistry): Promise<CopybookRegistry>;
  getCopybooksByProgram(programId: number): Promise<CopybookRegistry[]>;

  // Transformation readiness methods
  getTransformationReadinessByProgram(programId: number): Promise<TransformationReadiness | undefined>;
  createTransformationReadiness(readiness: InsertTransformationReadiness): Promise<TransformationReadiness>;
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

    const [qualityIssuesCount] = await db
      .select({ count: count() })
      .from(qualityIssues);

    const [businessRulesCount] = await db
      .select({ count: count() })
      .from(businessRuleCandidates)
      .where(eq(businessRuleCandidates.status, 'confirmed'));

    const [copybooksCount] = await db
      .select({ count: count() })
      .from(copybookRegistry);

    // Calculate average complexity - simplified for now
    const avgComplexity = 5; // Placeholder
    
    return {
      totalPrograms: totalPrograms.count,
      documentedPrograms: documentedPrograms.count,
      dataElements: dataElementsCount.count,
      issuesFound: issuesFound.count,
      repositories: repositoriesCount.count,
      totalFiles: totalFilesCount.count,
      qualityIssues: qualityIssuesCount.count,
      businessRules: businessRulesCount.count,
      copybooksManaged: copybooksCount.count,
      averageComplexity: avgComplexity,
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

  async getAllDependencies(): Promise<Dependency[]> {
    return await db.select().from(dependencies);
  }

  // Quality issue methods
  async getQualityIssuesByProgram(programId: number): Promise<QualityIssue[]> {
    return await db.select().from(qualityIssues).where(eq(qualityIssues.programId, programId));
  }

  async createQualityIssue(insertIssue: InsertQualityIssue): Promise<QualityIssue> {
    const [issue] = await db
      .insert(qualityIssues)
      .values([insertIssue])
      .returning();
    return issue;
  }

  async updateQualityIssue(id: number, updates: Partial<QualityIssue>): Promise<QualityIssue> {
    const [issue] = await db
      .update(qualityIssues)
      .set(updates)
      .where(eq(qualityIssues.id, id))
      .returning();
    
    if (!issue) {
      throw new Error(`Quality issue with id ${id} not found`);
    }
    
    return issue;
  }

  async getQualityIssuesByRule(rule: string): Promise<QualityIssue[]> {
    return await db.select().from(qualityIssues).where(eq(qualityIssues.rule, rule));
  }

  // Code metrics methods
  async getCodeMetricsByProgram(programId: number): Promise<CodeMetrics | undefined> {
    const [metrics] = await db.select().from(codeMetrics).where(eq(codeMetrics.programId, programId));
    return metrics || undefined;
  }

  async createCodeMetrics(insertMetrics: InsertCodeMetrics): Promise<CodeMetrics> {
    const [metrics] = await db
      .insert(codeMetrics)
      .values([insertMetrics])
      .returning();
    return metrics;
  }

  async updateCodeMetrics(programId: number, updates: Partial<CodeMetrics>): Promise<CodeMetrics> {
    const [metrics] = await db
      .update(codeMetrics)
      .set(updates)
      .where(eq(codeMetrics.programId, programId))
      .returning();
    
    if (!metrics) {
      throw new Error(`Code metrics for program ${programId} not found`);
    }
    
    return metrics;
  }

  // Business rule candidate methods
  async getBusinessRuleCandidatesByProgram(programId: number): Promise<BusinessRuleCandidate[]> {
    return await db.select().from(businessRuleCandidates).where(eq(businessRuleCandidates.programId, programId));
  }

  async getBusinessRuleCandidate(id: string): Promise<BusinessRuleCandidate | undefined> {
    const [candidate] = await db.select().from(businessRuleCandidates).where(eq(businessRuleCandidates.id, parseInt(id)));
    return candidate || undefined;
  }

  async updateBusinessRuleCandidate(id: string, updates: Partial<BusinessRuleCandidate>): Promise<BusinessRuleCandidate> {
    const [candidate] = await db
      .update(businessRuleCandidates)
      .set(updates)
      .where(eq(businessRuleCandidates.id, parseInt(id)))
      .returning();
    
    if (!candidate) {
      throw new Error(`Business rule candidate with id ${id} not found`);
    }
    
    return candidate;
  }

  // Control flow graph methods
  async getControlFlowGraphByProgram(programId: number): Promise<ControlFlowGraph | undefined> {
    const [cfg] = await db.select().from(controlFlowGraphs).where(eq(controlFlowGraphs.programId, programId));
    return cfg || undefined;
  }

  async createControlFlowGraph(insertCfg: InsertControlFlowGraph): Promise<ControlFlowGraph> {
    const [cfg] = await db
      .insert(controlFlowGraphs)
      .values([insertCfg])
      .returning();
    return cfg;
  }

  // JCL job methods
  async getJclJobsByRepository(repositoryId: number): Promise<JclJob[]> {
    return await db.select().from(jclJobs).where(eq(jclJobs.repositoryId, repositoryId));
  }

  async createJclJob(insertJob: InsertJclJob): Promise<JclJob> {
    const [job] = await db
      .insert(jclJobs)
      .values([insertJob])
      .returning();
    return job;
  }

  // Copybook registry methods
  async getCopybookByName(name: string): Promise<CopybookRegistry | undefined> {
    const [copybook] = await db.select().from(copybookRegistry).where(eq(copybookRegistry.name, name));
    return copybook || undefined;
  }

  async createCopybook(insertCopybook: InsertCopybookRegistry): Promise<CopybookRegistry> {
    const [copybook] = await db
      .insert(copybookRegistry)
      .values([insertCopybook])
      .returning();
    return copybook;
  }

  async getCopybooksByProgram(programId: number): Promise<CopybookRegistry[]> {
    return await db
      .select()
      .from(copybookRegistry)
      .where(eq(copybookRegistry.usedByPrograms, [programId]));
  }

  // Transformation readiness methods
  async getTransformationReadinessByProgram(programId: number): Promise<TransformationReadiness | undefined> {
    const [readiness] = await db.select().from(transformationReadiness).where(eq(transformationReadiness.programId, programId));
    return readiness || undefined;
  }

  async createTransformationReadiness(insertReadiness: InsertTransformationReadiness): Promise<TransformationReadiness> {
    const [readiness] = await db
      .insert(transformationReadiness)
      .values([insertReadiness])
      .returning();
    return readiness;
  }
}

export const storage = new DatabaseStorage();
