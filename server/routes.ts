import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { CobolParser } from "./cobol-parser";
import { generateClaudeProgramSummary, generateClaudeBusinessRules, generateClaudeSystemExplanation, generateClaudeMermaidDiagram, generateClaudeDataElementDescriptions } from "./coco-llm";
import { errorHandler } from "./error-handler";
import { COBOLDocumentationAgent } from "./autonomous-agent";
import { observabilityTracker } from "./observability";
import { insertProgramSchema, insertUploadSessionSchema } from "@shared/schema";
import { z } from "zod";
import { registerRepositoryRoutes } from "./repository-routes";
import { registerDocumentationRoutes } from "./documentation-routes";
import { registerAnalysisRoutes } from "./analysis-routes";
import { setupAIDocumentationRoutes } from "./ai-documentation-routes";
import { setupWorkflowRoutes } from "./workflow-routes";

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
  // Register repository routes
  registerRepositoryRoutes(app);
  
  // Register documentation routes
  registerDocumentationRoutes(app);
  
  // Register analysis routes
  registerAnalysisRoutes(app);
  
  // Register AI documentation routes
  setupAIDocumentationRoutes(app);
  
  // Register workflow routes
  setupWorkflowRoutes(app);
  
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

  // Upload and parse COBOL files (alias for compatibility)
  app.post("/api/programs/upload", upload.array('files'), async (req, res) => {
    // Redirect to main upload handler
    req.url = '/api/upload';
    return app._router.handle(req, res);
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

          // Process in background with enhanced error handling
          setImmediate(async () => {
            try {
              console.log(`Starting AI analysis for program: ${parsedProgram.name}`);
              
              // Generate AI summary using Anthropic Claude
              console.log('Generating program summary...');
              const summary = await generateClaudeProgramSummary(parsedProgram.name, parsedProgram.divisions.map(d => d.name).join(', '), sourceCode);
              console.log('Summary generated:', summary.summary.substring(0, 100) + '...');
              
              // Extract business rules using Claude
              console.log('Extracting business rules...');
              const businessRules = await generateClaudeBusinessRules(parsedProgram.name, sourceCode);
              console.log('Business rules extracted:', businessRules.length);
              
              // Generate system explanation in plain English using Claude
              console.log('Generating system explanation...');
              const systemExplanation = await generateClaudeSystemExplanation(parsedProgram.name, summary.summary);
              console.log('System explanation generated');
              
              // Generate Mermaid diagram using Claude
              console.log('Generating Mermaid diagram...');
              const mermaidDiagram = await generateClaudeMermaidDiagram(parsedProgram.name, systemExplanation.plainEnglishSummary);
              console.log('Mermaid diagram generated');
              
              // Update program with AI analysis
              console.log('Updating program in database...');
              await storage.updateProgram(program.id, {
                aiSummary: summary.summary,
                complexity: summary.complexity,
                businessRules,
                systemExplanation,
                mermaidDiagram,
                status: "completed",
              });
              console.log('Program updated successfully in database');

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
                const descriptions = await generateClaudeDataElementDescriptions(
                  parsedProgram.name,
                  parsedProgram.dataElements.map(de => de.name)
                );
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
              console.error("Error details:", {
                programId: program.id,
                programName: parsedProgram.name,
                errorMessage: (error as Error).message,
                errorStack: (error as Error).stack
              });
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

  // Enhanced program analysis using autonomous agent
  app.post("/api/programs/:id/enhanced-analysis", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: "Program not found" });
      }

      // Initialize autonomous agent with session tracking
      const sessionId = `analysis_${Date.now()}_${programId}`;
      const agent = new COBOLDocumentationAgent(sessionId, req.ip);

      // Set user preferences if provided
      const { detailLevel, audience, diagramType } = req.body;
      if (detailLevel) agent.setUserPreference('detailLevel', detailLevel);
      if (audience) agent.setUserPreference('audience', audience);
      if (diagramType) agent.setUserPreference('diagramType', diagramType);

      // Start observability tracking
      const analysisSpan = observabilityTracker.startSpan(
        "enhanced_program_analysis",
        { 
          program_id: programId,
          program_name: program.name,
          session_id: sessionId
        }
      );

      try {
        // Perform enhanced analysis with the autonomous agent
        const enhancedResults = await agent.analyzeCobolStructure(program.sourceCode, programId);
        
        // Evaluate documentation quality
        const qualityEvaluation = await agent.evaluateDocumentationQuality(enhancedResults, programId);

        // Update program with enhanced analysis results
        await storage.updateProgram(programId, {
          aiSummary: enhancedResults.programSummary.summary,
          complexity: enhancedResults.programSummary.complexity,
          systemExplanation: enhancedResults.systemExplanation,
          mermaidDiagram: enhancedResults.mermaidDiagram,
          status: "completed"
        });

        // Get session metrics for monitoring
        const sessionMetrics = agent.getSessionMetrics();

        observabilityTracker.endSpan(analysisSpan, {
          success: true,
          quality_score: qualityEvaluation.score,
          completeness: qualityEvaluation.completeness
        });

        agent.cleanup();

        res.json({
          success: true,
          results: enhancedResults,
          qualityEvaluation,
          sessionMetrics,
          message: "Enhanced analysis completed successfully"
        });

      } catch (error) {
        observabilityTracker.endSpan(analysisSpan, null, (error as Error).message);
        agent.cleanup();
        throw error;
      }

    } catch (error) {
      console.error("Enhanced analysis failed:", error);
      res.status(500).json({ 
        error: "Enhanced analysis failed",
        message: (error as Error).message
      });
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

  // Repository Analysis Routes for COBOL Documentation Platform
  
  // Get predefined repositories (Koopa and ProLeap)
  app.get("/api/predefined-repositories", (req, res) => {
    const PREDEFINED_REPOSITORIES = {
      KOOPA: {
        name: 'Koopa COBOL Parser',
        url: 'https://github.com/krisds/koopa.git',
        description: 'Custom DSL approach using island grammars for COBOL parsing with GUI visualization',
        features: [
          'Island grammars with .kg files',
          'Built-in GUI with syntax highlighting',
          'Parse tree visualization',
          'XPath query support',
          'XML export capabilities',
          'Interactive grammar exploration'
        ]
      },
      PROLEAP: {
        name: 'ProLeap COBOL Parser',
        url: 'https://github.com/uwol/proleap-cobol-parser.git',
        description: 'Modern ANTLR4-based parser with comprehensive AST and ASG generation',
        features: [
          'ANTLR4-based architecture',
          'Abstract Syntax Tree (AST) generation',
          'Abstract Semantic Graph (ASG) with data flow',
          'Comprehensive preprocessor support',
          'NIST test suite compliance',
          'Maven-based build system'
        ]
      }
    };
    
    res.json(Object.entries(PREDEFINED_REPOSITORIES).map(([key, repo]) => ({
      id: key,
      ...repo
    })));
  });
  
  // Shared repository service instance
  let repositoryService: any = null;
  
  const getRepositoryService = async () => {
    if (!repositoryService) {
      const { RepositoryIntegrationService } = await import("./repository-integration");
      repositoryService = new RepositoryIntegrationService(storage);
    }
    return repositoryService;
  };

  // Start analysis for a predefined repository
  app.post("/api/analyze-repository", async (req, res) => {
    try {
      const { repositoryType } = req.body;
      
      if (!repositoryType || !['KOOPA', 'PROLEAP'].includes(repositoryType)) {
        return res.status(400).json({ message: "Invalid repository type. Must be 'KOOPA' or 'PROLEAP'" });
      }
      
      const repoService = await getRepositoryService();
      
      const repositories = {
        KOOPA: {
          name: 'Koopa COBOL Parser',
          url: 'https://github.com/krisds/koopa.git'
        },
        PROLEAP: {
          name: 'ProLeap COBOL Parser', 
          url: 'https://github.com/uwol/proleap-cobol-parser.git'
        }
      };
      
      const repo = repositories[repositoryType as keyof typeof repositories];
      const jobId = await repoService.startRepositoryAnalysis(repo.url);
      
      res.json({ 
        jobId, 
        message: `Started analysis of ${repo.name}`,
        repository: repo
      });
    } catch (error) {
      console.error("Error starting repository analysis:", error);
      res.status(500).json({ message: "Failed to start repository analysis" });
    }
  });
  
  // Start analysis for a custom repository URL
  app.post("/api/analyze-custom-repository", async (req, res) => {
    try {
      const { repositoryUrl } = req.body;
      
      if (!repositoryUrl || !repositoryUrl.includes('github.com')) {
        return res.status(400).json({ message: "Valid GitHub repository URL required" });
      }
      
      const repoService = await getRepositoryService();
      
      const jobId = await repoService.startRepositoryAnalysis(repositoryUrl);
      
      res.json({ 
        jobId, 
        message: "Started analysis of custom repository",
        repositoryUrl
      });
    } catch (error) {
      console.error("Error starting custom repository analysis:", error);
      res.status(500).json({ message: "Failed to start repository analysis" });
    }
  });
  
  // Get analysis job status
  app.get("/api/analysis-jobs/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      
      const repoService = await getRepositoryService();
      
      const job = repoService.getJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error fetching job status:", error);
      res.status(500).json({ message: "Failed to fetch job status" });
    }
  });
  
  // Get all active analysis jobs
  app.get("/api/analysis-jobs", async (req, res) => {
    try {
      const repoService = await getRepositoryService();
      
      const jobs = repoService.getActiveJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching active jobs:", error);
      res.status(500).json({ message: "Failed to fetch active jobs" });
    }
  });
  
  // Cancel an analysis job
  app.delete("/api/analysis-jobs/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      
      const { RepositoryIntegrationService } = await import("./repository-integration");
      const repositoryService = new RepositoryIntegrationService(storage);
      
      const cancelled = repositoryService.cancelJob(jobId);
      
      if (!cancelled) {
        return res.status(404).json({ message: "Job not found or cannot be cancelled" });
      }
      
      res.json({ message: "Job cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling job:", error);
      res.status(500).json({ message: "Failed to cancel job" });
    }
  });

  // Add error handling middleware
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
