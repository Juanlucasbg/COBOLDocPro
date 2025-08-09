import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertProjectSchema, insertCobolProgramSchema, 
  insertDependencySchema, insertDocumentationSchema, insertAnnotationSchema,
  insertUserProgressSchema, insertSearchHistorySchema, insertExportSchema
} from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Error handling middleware
  const handleValidationError = (error: any, res: any) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors
      });
    }
    console.error("Route error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  };

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const ownerId = req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined;
      const projects = await storage.getProjects(ownerId);
      res.json(projects);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  // COBOL Program routes
  app.get("/api/programs", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const programs = await storage.getPrograms(projectId);
      res.json(programs);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.get("/api/programs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const program = await storage.getProgram(id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      res.json(program);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.post("/api/programs", async (req, res) => {
    try {
      const programData = insertCobolProgramSchema.parse(req.body);
      const program = await storage.createProgram(programData);
      res.status(201).json(program);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.put("/api/programs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertCobolProgramSchema.partial().parse(req.body);
      const program = await storage.updateProgram(id, updates);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      res.json(program);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.delete("/api/programs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProgram(id);
      if (!deleted) {
        return res.status(404).json({ message: "Program not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  // Dependencies routes
  app.get("/api/dependencies", async (req, res) => {
    try {
      const programId = req.query.programId ? parseInt(req.query.programId as string) : undefined;
      const dependencies = await storage.getDependencies(programId);
      res.json(dependencies);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.post("/api/dependencies", async (req, res) => {
    try {
      const dependencyData = insertDependencySchema.parse(req.body);
      const dependency = await storage.createDependency(dependencyData);
      res.status(201).json(dependency);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.delete("/api/dependencies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDependency(id);
      if (!deleted) {
        return res.status(404).json({ message: "Dependency not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  // Documentation routes
  app.get("/api/documentation", async (req, res) => {
    try {
      const programId = req.query.programId ? parseInt(req.query.programId as string) : undefined;
      const docs = await storage.getDocumentation(programId);
      res.json(docs);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.get("/api/documentation/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await storage.getDocumentationById(id);
      if (!doc) {
        return res.status(404).json({ message: "Documentation not found" });
      }
      res.json(doc);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.post("/api/documentation", async (req, res) => {
    try {
      const docData = insertDocumentationSchema.parse(req.body);
      const doc = await storage.createDocumentation(docData);
      res.status(201).json(doc);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.put("/api/documentation/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertDocumentationSchema.partial().parse(req.body);
      const doc = await storage.updateDocumentation(id, updates);
      if (!doc) {
        return res.status(404).json({ message: "Documentation not found" });
      }
      res.json(doc);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.delete("/api/documentation/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDocumentation(id);
      if (!deleted) {
        return res.status(404).json({ message: "Documentation not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  // Annotations routes
  app.get("/api/annotations", async (req, res) => {
    try {
      const programId = req.query.programId ? parseInt(req.query.programId as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const annotations = await storage.getAnnotations(programId, userId);
      res.json(annotations);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.post("/api/annotations", async (req, res) => {
    try {
      const annotationData = insertAnnotationSchema.parse(req.body);
      const annotation = await storage.createAnnotation(annotationData);
      res.status(201).json(annotation);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.put("/api/annotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertAnnotationSchema.partial().parse(req.body);
      const annotation = await storage.updateAnnotation(id, updates);
      if (!annotation) {
        return res.status(404).json({ message: "Annotation not found" });
      }
      res.json(annotation);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.delete("/api/annotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAnnotation(id);
      if (!deleted) {
        return res.status(404).json({ message: "Annotation not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  // Tutorial routes
  app.get("/api/tutorials", async (req, res) => {
    try {
      const modules = await storage.getTutorialModules();
      res.json(modules);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.get("/api/tutorials/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const module = await storage.getTutorialModule(id);
      if (!module) {
        return res.status(404).json({ message: "Tutorial module not found" });
      }
      res.json(module);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  // User progress routes
  app.get("/api/users/:userId/progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.put("/api/users/:userId/progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const progressData = insertUserProgressSchema.parse({ ...req.body, userId });
      const progress = await storage.updateUserProgress(progressData);
      res.json(progress);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  // Search routes
  app.get("/api/search/programs", async (req, res) => {
    try {
      const query = req.query.q as string;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Query must be at least 2 characters long" });
      }

      const results = await storage.searchPrograms(query, projectId);
      res.json(results);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.get("/api/search/documentation", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Query must be at least 2 characters long" });
      }

      const results = await storage.searchDocumentation(query);
      res.json(results);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.post("/api/search/history", async (req, res) => {
    try {
      const searchData = insertSearchHistorySchema.parse(req.body);
      const search = await storage.addSearchHistory(searchData);
      res.status(201).json(search);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.get("/api/users/:userId/search-history", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const history = await storage.getUserSearchHistory(userId);
      res.json(history);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  // Export routes
  app.get("/api/exports", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const exports = await storage.getExports(userId);
      res.json(exports);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.post("/api/exports", async (req, res) => {
    try {
      const exportData = insertExportSchema.parse(req.body);
      const exportJob = await storage.createExport(exportData);
      res.status(201).json(exportJob);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  app.put("/api/exports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertExportSchema.partial().parse(req.body);
      const exportJob = await storage.updateExport(id, updates);
      if (!exportJob) {
        return res.status(404).json({ message: "Export not found" });
      }
      res.json(exportJob);
    } catch (error) {
      handleValidationError(error, res);
    }
  });

  return httpServer;
}
