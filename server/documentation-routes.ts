import type { Express } from "express";
import { storage } from "./storage";
import { documentationGenerator } from "./documentation-generator";
import { z } from "zod";

export function registerDocumentationRoutes(app: Express) {
  // Generate documentation for a program
  app.post("/api/programs/:id/generate-docs", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      
      const generateSchema = z.object({
        types: z.array(z.enum(['overview', 'book', 'member', 'architecture', 'business-logic'])).optional(),
        includeVisualizations: z.boolean().optional().default(true),
        regenerate: z.boolean().optional().default(false),
      });

      const options = generateSchema.parse(req.body);
      
      // Generate documentation in background
      setTimeout(async () => {
        try {
          await documentationGenerator.generateDocumentation(programId, options);
        } catch (error) {
          console.error('Failed to generate documentation:', error);
        }
      }, 0);
      
      res.json({ 
        message: "Documentation generation started",
        programId,
        types: options.types || ['overview', 'book', 'member', 'architecture', 'business-logic']
      });
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to start documentation generation" });
    }
  });

  // Get documentation for a program
  app.get("/api/programs/:id/documentation", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const documentation = await storage.getAllDocumentationByProgram(programId);
      res.json(documentation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documentation" });
    }
  });

  // Get specific documentation type
  app.get("/api/programs/:id/documentation/:type", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const type = req.params.type;
      
      const doc = await storage.getDocumentation(programId, type);
      if (!doc) {
        return res.status(404).json({ message: "Documentation not found" });
      }
      
      res.json(doc);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documentation" });
    }
  });

  // Get diagrams for a program
  app.get("/api/programs/:id/diagrams", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const diagrams = await storage.getDiagramsByProgram(programId);
      res.json(diagrams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch diagrams" });
    }
  });

  // Get business logic for a program
  app.get("/api/programs/:id/business-logic", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const businessLogic = await storage.getBusinessLogicByProgram(programId);
      res.json(businessLogic);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business logic" });
    }
  });

  // Get dependencies for a program
  app.get("/api/programs/:id/dependencies", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const dependencies = await storage.getDependenciesByProgram(programId);
      res.json(dependencies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dependencies" });
    }
  });

  // Export documentation
  app.get("/api/programs/:id/export", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const format = (req.query.format as string) || 'markdown';
      
      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      const documentation = await storage.getAllDocumentationByProgram(programId);
      
      if (format === 'markdown') {
        // Combine all documentation into one markdown file
        const combined = documentation
          .map(doc => `# ${doc.type.toUpperCase()}\n\n${doc.content}\n\n---\n`)
          .join('\n');
        
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${program.name}-documentation.md"`);
        res.send(combined);
      } else if (format === 'json') {
        res.json({
          program,
          documentation,
          diagrams: await storage.getDiagramsByProgram(programId),
          businessLogic: await storage.getBusinessLogicByProgram(programId),
          dependencies: await storage.getDependenciesByProgram(programId),
        });
      } else {
        res.status(400).json({ message: "Unsupported export format" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export documentation" });
    }
  });

  // Batch generate documentation for multiple programs
  app.post("/api/programs/batch-generate-docs", async (req, res) => {
    try {
      const batchSchema = z.object({
        programIds: z.array(z.number()),
        types: z.array(z.enum(['overview', 'book', 'member', 'architecture', 'business-logic'])).optional(),
        includeVisualizations: z.boolean().optional().default(true),
      });

      const { programIds, types, includeVisualizations } = batchSchema.parse(req.body);
      
      // Process in background
      setTimeout(async () => {
        for (const programId of programIds) {
          try {
            await documentationGenerator.generateDocumentation(programId, {
              types,
              includeVisualizations,
            });
          } catch (error) {
            console.error(`Failed to generate docs for program ${programId}:`, error);
          }
        }
      }, 0);
      
      res.json({ 
        message: "Batch documentation generation started",
        programCount: programIds.length,
        types: types || ['overview', 'book', 'member', 'architecture', 'business-logic']
      });
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to start batch documentation" });
    }
  });
}