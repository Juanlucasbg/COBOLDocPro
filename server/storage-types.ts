import type {
  User, InsertUser,
  Program, InsertProgram,
  DataElement, InsertDataElement,
  ProgramRelationship, InsertProgramRelationship,
  UploadSession, InsertUploadSession,
  Repository, InsertRepository,
  CodeFile, InsertCodeFile,
  Documentation, InsertDocumentation,
  Diagram, InsertDiagram,
  BusinessLogic, InsertBusinessLogic,
  Dependency, InsertDependency,
  QualityIssue, InsertQualityIssue,
  CodeMetrics, InsertCodeMetrics,
  BusinessRuleCandidate,
  ControlFlowGraph, InsertControlFlowGraph,
  JclJob, InsertJclJob,
  CopybookRegistry, InsertCopybookRegistry,
  TransformationReadiness, InsertTransformationReadiness,
  Statistics,
} from "@shared/schema";

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


