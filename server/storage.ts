import { 
  users, programs, dataElements, programRelationships, uploadSessions,
  type User, type InsertUser, type Program, type InsertProgram,
  type DataElement, type InsertDataElement, type ProgramRelationship,
  type InsertProgramRelationship, type UploadSession, type InsertUploadSession,
  type Statistics
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, count } from "drizzle-orm";

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
    
    return {
      totalPrograms: totalPrograms.count,
      documentedPrograms: documentedPrograms.count,
      dataElements: dataElementsCount.count,
      issuesFound: issuesFound.count,
    };
  }
}

export const storage = new DatabaseStorage();
