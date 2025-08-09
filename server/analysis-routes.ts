import type { Express } from "express";
import { storage } from "./storage";
import { analysisEngine } from "./analysis-engine";
import type { AnalysisType } from "./analysis-engine";
import { impactAnalysisEngine } from "./impact-analysis-engine";
import { businessRuleWorkbench } from "./business-rule-workbench";
import { z } from "zod";

export function registerAnalysisRoutes(app: Express) {
  // Run comprehensive analysis on a program
  app.post("/api/programs/:id/analyze", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      
      const analysisSchema = z.object({
        analysisTypes: z.array(z.enum([
          'parsing', 'quality', 'metrics', 'business-rules', 
          'impact-analysis', 'cfg', 'dependencies', 'transformation-readiness'
        ])),
        options: z.object({
          dialect: z.enum(['ibm-enterprise', 'micro-focus', 'acucobol', 'gnu-cobol', 'fujitsu', 'unisys']).optional(),
          deepAnalysis: z.boolean().optional(),
          includeImpactAnalysis: z.boolean().optional(),
          generateBusinessRules: z.boolean().optional(),
          runQualityChecks: z.boolean().optional(),
          createCFG: z.boolean().optional(),
        }).optional()
      });

      const { analysisTypes, options } = analysisSchema.parse(req.body);
      
      const result = await analysisEngine.analyzeProgram({
        programId,
        analysisTypes: analysisTypes as AnalysisType[],
        options
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to run analysis" });
    }
  });

  // Batch analyze multiple programs
  app.post("/api/programs/batch-analyze", async (req, res) => {
    try {
      const batchSchema = z.object({
        programIds: z.array(z.number()),
        analysisTypes: z.array(z.enum([
          'parsing', 'quality', 'metrics', 'business-rules', 
          'impact-analysis', 'cfg', 'dependencies', 'transformation-readiness'
        ])),
        options: z.object({
          dialect: z.enum(['ibm-enterprise', 'micro-focus', 'acucobol', 'gnu-cobol', 'fujitsu', 'unisys']).optional(),
          deepAnalysis: z.boolean().optional(),
        }).optional()
      });

      const { programIds, analysisTypes, options } = batchSchema.parse(req.body);
      
      // Process in background for large batches
      if (programIds.length > 10) {
        setTimeout(async () => {
          try {
            await analysisEngine.batchAnalyze(programIds, analysisTypes as AnalysisType[], options);
          } catch (error) {
            console.error('Batch analysis failed:', error);
          }
        }, 0);
        
        res.json({ 
          message: "Batch analysis started in background",
          programCount: programIds.length 
        });
      } else {
        const results = await analysisEngine.batchAnalyze(programIds, analysisTypes as AnalysisType[], options);
        res.json(results);
      }
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to start batch analysis" });
    }
  });

  // Get quality issues for a program
  app.get("/api/programs/:id/quality-issues", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const severity = req.query.severity as string;
      const category = req.query.category as string;
      
      let issues = await storage.getQualityIssuesByProgram(programId);
      
      if (severity) {
        issues = issues.filter(issue => issue.severity === severity);
      }
      
      if (category) {
        issues = issues.filter(issue => issue.category === category);
      }
      
      res.json(issues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quality issues" });
    }
  });

  // Update quality issue status
  app.patch("/api/quality-issues/:id", async (req, res) => {
    try {
      const issueId = parseInt(req.params.id);
      
      const updateSchema = z.object({
        status: z.enum(['open', 'fixed', 'suppressed', 'false-positive']).optional(),
        resolvedAt: z.string().optional()
      });

      const updates = updateSchema.parse(req.body);
      
      if (updates.resolvedAt) {
        updates.resolvedAt = new Date(updates.resolvedAt) as any;
      }
      
      const updatedIssue = await storage.updateQualityIssue(issueId, updates);
      res.json(updatedIssue);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to update quality issue" });
    }
  });

  // Get code metrics for a program
  app.get("/api/programs/:id/metrics", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const metrics = await storage.getCodeMetricsByProgram(programId);
      
      if (!metrics) {
        return res.status(404).json({ message: "Metrics not found for this program" });
      }
      
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch code metrics" });
    }
  });

  // Get control flow graph for a program
  app.get("/api/programs/:id/cfg", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const cfg = await storage.getControlFlowGraphByProgram(programId);
      
      if (!cfg) {
        return res.status(404).json({ message: "Control flow graph not found for this program" });
      }
      
      res.json(cfg);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch control flow graph" });
    }
  });

  // Run impact analysis
  app.post("/api/programs/:id/impact-analysis", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const result = await impactAnalysisEngine.analyzeProgramImpact(programId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to run impact analysis" });
    }
  });

  // Get instant impact analysis
  app.get("/api/impact-analysis/instant", async (req, res) => {
    try {
      const sourceType = req.query.sourceType as string;
      const sourceId = req.query.sourceId as string;
      
      if (!sourceType || !sourceId) {
        return res.status(400).json({ message: "sourceType and sourceId are required" });
      }
      
      const result = await impactAnalysisEngine.getInstantImpact(
        sourceType as any, 
        sourceId
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to get instant impact" });
    }
  });

  // Analyze copybook impact
  app.post("/api/copybooks/:name/impact-analysis", async (req, res) => {
    try {
      const copybookName = req.params.name;
      const result = await impactAnalysisEngine.analyzeCopybookImpact(copybookName);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to analyze copybook impact" });
    }
  });

  // Analyze field impact
  app.post("/api/fields/:name/impact-analysis", async (req, res) => {
    try {
      const fieldName = req.params.name;
      const programId = req.query.programId ? parseInt(req.query.programId as string) : undefined;
      
      const result = await impactAnalysisEngine.analyzeFieldImpact(fieldName, programId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to analyze field impact" });
    }
  });

  // Business rule workbench routes
  app.post("/api/programs/:id/business-rules/workbench", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const userId = req.body.userId || 'anonymous';
      
      const workbench = await businessRuleWorkbench.createWorkbench(programId, userId);
      res.json(workbench);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to create business rule workbench" });
    }
  });

  // Validate business rule candidate
  app.post("/api/business-rule-candidates/:id/validate", async (req, res) => {
    try {
      const candidateId = req.params.id;
      
      const validateSchema = z.object({
        action: z.enum(['confirmed', 'rejected', 'modified', 'merged', 'split']),
        userId: z.string(),
        reason: z.string(),
        modifications: z.object({}).optional()
      });

      const { action, userId, reason, modifications } = validateSchema.parse(req.body);
      
      const result = await businessRuleWorkbench.validateCandidate(
        candidateId, 
        action, 
        userId, 
        reason, 
        modifications
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to validate business rule candidate" });
    }
  });

  // Get business rule catalog
  app.get("/api/business-rules/catalog", async (req, res) => {
    try {
      const programId = req.query.programId ? parseInt(req.query.programId as string) : undefined;
      const catalog = await businessRuleWorkbench.getRuleCatalog(programId);
      res.json(catalog);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch business rule catalog" });
    }
  });

  // Search business rules
  app.get("/api/business-rules/search", async (req, res) => {
    try {
      const criteria = {
        text: req.query.text as string,
        category: req.query.category as string,
        businessDomain: req.query.businessDomain as string,
        programId: req.query.programId ? parseInt(req.query.programId as string) : undefined,
        stakeholder: req.query.stakeholder as string
      };
      
      const rules = await businessRuleWorkbench.searchRules(criteria);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to search business rules" });
    }
  });

  // Export business rules
  app.get("/api/business-rules/export", async (req, res) => {
    try {
      const format = (req.query.format as string) || 'json';
      const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
      
      const exported = await businessRuleWorkbench.exportRules(format as any, filter);
      
      const contentTypes = {
        json: 'application/json',
        xml: 'application/xml',
        csv: 'text/csv',
        'business-glossary': 'text/markdown'
      };
      
      const extensions = {
        json: 'json',
        xml: 'xml',
        csv: 'csv',
        'business-glossary': 'md'
      };
      
      res.setHeader('Content-Type', contentTypes[format as keyof typeof contentTypes] || 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="business-rules.${extensions[format as keyof typeof extensions] || 'txt'}"`);
      res.send(exported);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to export business rules" });
    }
  });

  // Get transformation readiness
  app.get("/api/programs/:id/transformation-readiness", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const readiness = await storage.getTransformationReadinessByProgram(programId);
      
      if (!readiness) {
        return res.status(404).json({ message: "Transformation readiness not found for this program" });
      }
      
      res.json(readiness);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transformation readiness" });
    }
  });

  // Get analysis recommendations
  app.get("/api/programs/:id/recommendations", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const recommendations = await analysisEngine.getRecommendations(programId);
      res.json({ recommendations });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Get copybooks
  app.get("/api/copybooks", async (req, res) => {
    try {
      const name = req.query.name as string;
      
      if (name) {
        const copybook = await storage.getCopybookByName(name);
        if (!copybook) {
          return res.status(404).json({ message: "Copybook not found" });
        }
        res.json(copybook);
      } else {
        // This would require a new method to get all copybooks
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch copybooks" });
    }
  });

  // Get copybooks for a program
  app.get("/api/programs/:id/copybooks", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const copybooks = await storage.getCopybooksByProgram(programId);
      res.json(copybooks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program copybooks" });
    }
  });

  // Get JCL jobs for a repository
  app.get("/api/repositories/:id/jcl-jobs", async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      const jobs = await storage.getJclJobsByRepository(repositoryId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch JCL jobs" });
    }
  });
}