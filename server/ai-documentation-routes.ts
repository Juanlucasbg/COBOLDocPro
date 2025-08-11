/**
 * AI Documentation Routes - OpenRouter integration for enhanced COBOL analysis
 */

import type { Express } from "express";
import { storage } from "./storage";
import { OpenRouterClient } from "./openrouter-client";
import { z } from "zod";

export function setupAIDocumentationRoutes(app: Express) {
  
  // Generate AI summary for a specific program
  app.post("/api/programs/:id/ai-summary", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const aiClient = new OpenRouterClient();
      const summary = await aiClient.generatePlainEnglishSummary(
        program.sourceCode, 
        program.name
      );

      // Update program with AI summary
      await storage.updateProgram(programId, { aiSummary: summary });

      res.json({ summary });
    } catch (error: any) {
      console.error("AI summary generation failed:", error);
      res.status(500).json({ message: error?.message || "AI summary generation failed" });
    }
  });

  // Extract business rules using AI
  app.post("/api/programs/:id/business-rules", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const aiClient = new OpenRouterClient();
      const businessRules = await aiClient.extractBusinessRules(
        program.sourceCode, 
        program.name
      );

      res.json({ businessRules });
    } catch (error: any) {
      console.error("Business rule extraction failed:", error);
      res.status(500).json({ message: error?.message || "Business rule extraction failed" });
    }
  });

  // Assess code quality using AI
  app.post("/api/programs/:id/quality-assessment", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const aiClient = new OpenRouterClient();
      const qualityAssessment = await aiClient.assessCodeQuality(
        program.sourceCode, 
        program.name
      );

      res.json(qualityAssessment);
    } catch (error: any) {
      console.error("Quality assessment failed:", error);
      res.status(500).json({ message: error?.message || "Quality assessment failed" });
    }
  });

  // Generate comprehensive AI documentation
  app.post("/api/programs/:id/comprehensive-docs", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const aiClient = new OpenRouterClient();
      const documentation = await aiClient.generateCobolDocumentation({
        sourceCode: program.sourceCode,
        programName: program.name,
        context: `File: ${program.filename}, Lines: ${program.linesOfCode}`
      });

      res.json(documentation);
    } catch (error: any) {
      console.error("Comprehensive documentation generation failed:", error);
      res.status(500).json({ message: error?.message || "Documentation generation failed" });
    }
  });

  // Batch AI analysis for repository
  app.post("/api/repositories/:id/ai-analysis", async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      const repository = await storage.getRepository(repositoryId);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Get all programs in the repository
      const codeFiles = await storage.getCodeFilesByRepository(repositoryId);
      const aiClient = new OpenRouterClient();
      const results = [];

      for (const file of codeFiles) {
        if (file.programId && (file.language === 'COBOL')) {
          try {
            const program = await storage.getProgram(file.programId);
            if (program && !program.aiSummary) {
              console.log(`Generating AI analysis for ${program.name}...`);
              
              const [summary, businessRules, qualityAssessment] = await Promise.all([
                aiClient.generatePlainEnglishSummary(program.sourceCode, program.name),
                aiClient.extractBusinessRules(program.sourceCode, program.name),
                aiClient.assessCodeQuality(program.sourceCode, program.name)
              ]);

              // Update program with AI summary
              await storage.updateProgram(program.id, { aiSummary: summary });

              results.push({
                programId: program.id,
                programName: program.name,
                summary,
                businessRules,
                qualityAssessment
              });
            }
          } catch (error) {
            console.error(`AI analysis failed for program ${file.programId}:`, error);
          }
        }
      }

      res.json({ 
        repositoryName: repository.name,
        analyzed: results.length,
        results 
      });
    } catch (error: any) {
      console.error("Batch AI analysis failed:", error);
      res.status(500).json({ message: error?.message || "Batch AI analysis failed" });
    }
  });
}