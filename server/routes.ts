import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { CobolParser } from "./cobol-parser";
import { generateProgramSummary, extractBusinessRules, generateDataElementDescriptions, generateSystemExplanation, generateMermaidDiagram } from "./openai";
import { COBOLDocumentationAgent } from "./autonomous-agent";
import { observabilityTracker } from "./observability";
import { insertProgramSchema, insertUploadSessionSchema } from "@shared/schema";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.cbl', '.cob', '.cpy', '.jcl'];
    const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .cbl, .cob, .cpy, .jcl files are allowed.'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

const cobolParser = new CobolParser();

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all programs
  app.get("/api/programs", async (req, res) => {
    try {
      const programs = await storage.getAllPrograms();
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  // Get single program
  app.get("/api/programs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const program = await storage.getProgram(id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });

  // Search programs
  app.get("/api/programs/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      const programs = await storage.searchPrograms(query);
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to search programs" });
    }
  });

  // Get data elements for a program
  app.get("/api/programs/:id/data-elements", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const dataElements = await storage.getDataElementsByProgramId(programId);
      res.json(dataElements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch data elements" });
    }
  });

  // Get all data elements
  app.get("/api/data-elements", async (req, res) => {
    try {
      const dataElements = await storage.getAllDataElements();
      res.json(dataElements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch data elements" });
    }
  });

  // Search data elements
  app.get("/api/data-elements/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      const dataElements = await storage.searchDataElements(query);
      res.json(dataElements);
    } catch (error) {
      res.status(500).json({ message: "Failed to search data elements" });
    }
  });

  // Get program relationships
  app.get("/api/programs/:id/relationships", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const relationships = await storage.getProgramRelationships(programId);
      res.json(relationships);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program relationships" });
    }
  });

  // Get statistics
  app.get("/api/statistics", async (req, res) => {
    try {
      const stats = await storage.getStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Upload and parse COBOL files
  app.post("/api/upload", upload.array('files'), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const results = [];

      for (const file of req.files) {
        // Create upload session
        const uploadSession = await storage.createUploadSession({
          filename: file.originalname,
          size: file.size,
          status: "processing",
        });

        try {
          const sourceCode = file.buffer.toString('utf-8');
          
          // Parse COBOL code
          const parsedProgram = cobolParser.parse(sourceCode);
          
          // Create program record
          const program = await storage.createProgram({
            name: parsedProgram.name,
            filename: file.originalname,
            sourceCode,
            linesOfCode: parsedProgram.linesOfCode,
            status: "processing",
            structure: {
              divisions: parsedProgram.divisions
            },
          });

          // Process in background (simplified for demo)
          setImmediate(async () => {
            try {
              // Generate AI summary
              const summary = await generateProgramSummary(parsedProgram.name, sourceCode);
              
              // Extract business rules
              const businessRules = await extractBusinessRules(parsedProgram.name, sourceCode);
              
              // Generate system explanation in plain English
              const systemExplanation = await generateSystemExplanation(parsedProgram.name, sourceCode, businessRules);
              
              // Generate Mermaid diagram
              const mermaidDiagram = await generateMermaidDiagram(parsedProgram.name, sourceCode, parsedProgram.relationships);
              
              // Update program with AI analysis
              await storage.updateProgram(program.id, {
                aiSummary: summary.summary,
                complexity: summary.complexity,
                businessRules,
                systemExplanation,
                mermaidDiagram,
                status: "completed",
              });

              // Create data elements
              for (const element of parsedProgram.dataElements) {
                await storage.createDataElement({
                  programId: program.id,
                  name: element.name,
                  level: element.level,
                  picture: element.picture,
                  usage: element.usage,
                  parentElement: element.parentElement,
                  usedInPrograms: [parsedProgram.name],
                });
              }

              // Generate data element descriptions using AI
              if (parsedProgram.dataElements.length > 0) {
                const descriptions = await generateDataElementDescriptions(parsedProgram.dataElements);
                const dataElements = await storage.getDataElementsByProgramId(program.id);
                
                for (const description of descriptions) {
                  const matchingElement = dataElements.find(el => el.name === description.name);
                  if (matchingElement) {
                    // Update with AI-generated description (would need updateDataElement method)
                    // For now, we'll skip this update
                  }
                }
              }

              // Create program relationships
              for (const relationship of parsedProgram.relationships) {
                await storage.createProgramRelationship({
                  fromProgramId: program.id,
                  toProgramId: 0, // Would need to resolve target program ID
                  relationshipType: relationship.type.toLowerCase(),
                  location: relationship.location,
                });
              }

              // Update upload session
              await storage.updateUploadSession(uploadSession.id, {
                status: "completed",
              });

            } catch (error) {
              console.error("Background processing failed:", error);
              await storage.updateProgram(program.id, {
                status: "failed",
              });
              await storage.updateUploadSession(uploadSession.id, {
                status: "failed",
                errorMessage: (error as Error).message,
              });
            }
          });

          results.push({
            filename: file.originalname,
            programId: program.id,
            uploadSessionId: uploadSession.id,
            status: "processing",
          });

        } catch (error) {
          await storage.updateUploadSession(uploadSession.id, {
            status: "failed",
            errorMessage: (error as Error).message,
          });

          results.push({
            filename: file.originalname,
            uploadSessionId: uploadSession.id,
            status: "failed",
            error: (error as Error).message,
          });
        }
      }

      res.json({ results });
    } catch (error) {
      res.status(500).json({ message: "Upload failed: " + (error as Error).message });
    }
  });

  // Get upload sessions
  app.get("/api/upload-sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllUploadSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upload sessions" });
    }
  });

  // Global search endpoint
  app.get("/api/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      const [programs, dataElements] = await Promise.all([
        storage.searchPrograms(query),
        storage.searchDataElements(query),
      ]);

      res.json({
        programs,
        dataElements,
        totalResults: programs.length + dataElements.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
