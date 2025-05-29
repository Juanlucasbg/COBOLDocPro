import { 
  users, programs, dataElements, programRelationships, uploadSessions,
  type User, type InsertUser, type Program, type InsertProgram,
  type DataElement, type InsertDataElement, type ProgramRelationship,
  type InsertProgramRelationship, type UploadSession, type InsertUploadSession
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
  getStatistics(): Promise<{
    totalPrograms: number;
    documentedPrograms: number;
    dataElements: number;
    issuesFound: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private programs: Map<number, Program>;
  private dataElements: Map<number, DataElement>;
  private programRelationships: Map<number, ProgramRelationship>;
  private uploadSessions: Map<number, UploadSession>;
  private currentUserId: number;
  private currentProgramId: number;
  private currentDataElementId: number;
  private currentRelationshipId: number;
  private currentUploadSessionId: number;

  constructor() {
    this.users = new Map();
    this.programs = new Map();
    this.dataElements = new Map();
    this.programRelationships = new Map();
    this.uploadSessions = new Map();
    this.currentUserId = 1;
    this.currentProgramId = 1;
    this.currentDataElementId = 1;
    this.currentRelationshipId = 1;
    this.currentUploadSessionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProgram(id: number): Promise<Program | undefined> {
    return this.programs.get(id);
  }

  async getAllPrograms(): Promise<Program[]> {
    return Array.from(this.programs.values()).sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async getProgramByName(name: string): Promise<Program | undefined> {
    return Array.from(this.programs.values()).find(program => program.name === name);
  }

  async createProgram(insertProgram: InsertProgram): Promise<Program> {
    const id = this.currentProgramId++;
    const program: Program = {
      ...insertProgram,
      id,
      uploadedAt: new Date(),
    };
    this.programs.set(id, program);
    return program;
  }

  async updateProgram(id: number, updates: Partial<Program>): Promise<Program> {
    const existingProgram = this.programs.get(id);
    if (!existingProgram) {
      throw new Error(`Program with id ${id} not found`);
    }
    const updatedProgram = { ...existingProgram, ...updates };
    this.programs.set(id, updatedProgram);
    return updatedProgram;
  }

  async deleteProgram(id: number): Promise<void> {
    this.programs.delete(id);
    // Also delete related data elements and relationships
    for (const [elementId, element] of this.dataElements.entries()) {
      if (element.programId === id) {
        this.dataElements.delete(elementId);
      }
    }
    for (const [relId, rel] of this.programRelationships.entries()) {
      if (rel.fromProgramId === id || rel.toProgramId === id) {
        this.programRelationships.delete(relId);
      }
    }
  }

  async searchPrograms(query: string): Promise<Program[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.programs.values()).filter(program => 
      program.name.toLowerCase().includes(lowerQuery) ||
      program.filename.toLowerCase().includes(lowerQuery) ||
      (program.aiSummary && program.aiSummary.toLowerCase().includes(lowerQuery))
    );
  }

  async getDataElementsByProgramId(programId: number): Promise<DataElement[]> {
    return Array.from(this.dataElements.values()).filter(element => 
      element.programId === programId
    );
  }

  async getAllDataElements(): Promise<DataElement[]> {
    return Array.from(this.dataElements.values());
  }

  async createDataElement(insertDataElement: InsertDataElement): Promise<DataElement> {
    const id = this.currentDataElementId++;
    const dataElement: DataElement = { ...insertDataElement, id };
    this.dataElements.set(id, dataElement);
    return dataElement;
  }

  async searchDataElements(query: string): Promise<DataElement[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.dataElements.values()).filter(element =>
      element.name.toLowerCase().includes(lowerQuery) ||
      (element.description && element.description.toLowerCase().includes(lowerQuery))
    );
  }

  async getProgramRelationships(programId: number): Promise<ProgramRelationship[]> {
    return Array.from(this.programRelationships.values()).filter(rel =>
      rel.fromProgramId === programId || rel.toProgramId === programId
    );
  }

  async createProgramRelationship(insertRelationship: InsertProgramRelationship): Promise<ProgramRelationship> {
    const id = this.currentRelationshipId++;
    const relationship: ProgramRelationship = { ...insertRelationship, id };
    this.programRelationships.set(id, relationship);
    return relationship;
  }

  async getUploadSession(id: number): Promise<UploadSession | undefined> {
    return this.uploadSessions.get(id);
  }

  async getAllUploadSessions(): Promise<UploadSession[]> {
    return Array.from(this.uploadSessions.values()).sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async createUploadSession(insertSession: InsertUploadSession): Promise<UploadSession> {
    const id = this.currentUploadSessionId++;
    const session: UploadSession = {
      ...insertSession,
      id,
      uploadedAt: new Date(),
    };
    this.uploadSessions.set(id, session);
    return session;
  }

  async updateUploadSession(id: number, updates: Partial<UploadSession>): Promise<UploadSession> {
    const existingSession = this.uploadSessions.get(id);
    if (!existingSession) {
      throw new Error(`Upload session with id ${id} not found`);
    }
    const updatedSession = { ...existingSession, ...updates };
    this.uploadSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getStatistics(): Promise<{
    totalPrograms: number;
    documentedPrograms: number;
    dataElements: number;
    issuesFound: number;
  }> {
    const allPrograms = Array.from(this.programs.values());
    const totalPrograms = allPrograms.length;
    const documentedPrograms = allPrograms.filter(p => p.status === "completed").length;
    const dataElements = this.dataElements.size;
    const issuesFound = allPrograms.filter(p => p.status === "failed").length;

    return {
      totalPrograms,
      documentedPrograms,
      dataElements,
      issuesFound,
    };
  }
}

export const storage = new MemStorage();
