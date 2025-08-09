import { cobolPrograms, type CobolProgram, type InsertCobolProgram } from "@shared/schema";

export interface IStorage {
  getProgram(id: number): Promise<CobolProgram | undefined>;
  getAllPrograms(): Promise<CobolProgram[]>;
  createProgram(program: InsertCobolProgram): Promise<CobolProgram>;
  updateProgram(id: number, updates: Partial<CobolProgram>): Promise<CobolProgram | undefined>;
  deleteProgram(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private programs: Map<number, CobolProgram>;
  private currentId: number;

  constructor() {
    this.programs = new Map();
    this.currentId = 1;
  }

  async getProgram(id: number): Promise<CobolProgram | undefined> {
    return this.programs.get(id);
  }

  async getAllPrograms(): Promise<CobolProgram[]> {
    return Array.from(this.programs.values()).sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async createProgram(insertProgram: InsertCobolProgram): Promise<CobolProgram> {
    const id = this.currentId++;
    const program: CobolProgram = {
      id,
      filename: insertProgram.filename,
      originalContent: insertProgram.originalContent,
      size: insertProgram.size,
      status: insertProgram.status || "uploaded",
      generatedDocumentation: insertProgram.generatedDocumentation || null,
      programStructure: insertProgram.programStructure || null,
      businessRules: insertProgram.businessRules || null,
      diagrams: insertProgram.diagrams || null,
      errorMessage: insertProgram.errorMessage || null,
      uploadedAt: new Date(),
      processedAt: null,
    };
    this.programs.set(id, program);
    return program;
  }

  async updateProgram(id: number, updates: Partial<CobolProgram>): Promise<CobolProgram | undefined> {
    const existing = this.programs.get(id);
    if (!existing) return undefined;

    const updated: CobolProgram = {
      ...existing,
      ...updates,
      processedAt: updates.status === 'processed' ? new Date() : existing.processedAt,
    };
    
    this.programs.set(id, updated);
    return updated;
  }

  async deleteProgram(id: number): Promise<boolean> {
    return this.programs.delete(id);
  }
}

export const storage = new MemStorage();
