/**
 * Workflow API Routes
 * Endpoints for managing COBOL analysis workflows
 */

import type { Express } from "express";
import { WorkflowOrchestrator } from "./workflow-orchestrator";
import { storage } from "./storage";
import { z } from "zod";

const orchestrator = new WorkflowOrchestrator();

// Helper functions for workflow routes
function getComplexityDistribution(programs: any[]) {
  return {
    low: programs.filter(p => (p.complexity || 0) <= 10).length,
    medium: programs.filter(p => (p.complexity || 0) > 10 && (p.complexity || 0) <= 20).length,
    high: programs.filter(p => (p.complexity || 0) > 20).length
  };
}

function buildCallGraph(programs: any[], relationships: any[]) {
  const nodes = programs.map(p => ({
    id: p.name,
    name: p.name,
    complexity: p.complexity || 0,
    linesOfCode: p.linesOfCode || 0
  }));

  const edges = relationships.map(r => ({
    from: r.fromProgramId,
    to: r.toProgramName,
    type: r.relationshipType
  }));

  return { nodes, edges };
}

function calculateSystemMetrics(programs: any[], relationships: any[]) {
  const totalComplexity = programs.reduce((sum, p) => sum + (p.complexity || 0), 0);
  const averageComplexity = programs.length > 0 ? totalComplexity / programs.length : 0;
  
  return {
    totalPrograms: programs.length,
    totalComplexity,
    averageComplexity: Math.round(averageComplexity),
    totalRelationships: relationships.length,
    couplingLevel: relationships.length / (programs.length || 1)
  };
}

function identifyArchitecturalPatterns(programs: any[], relationships: any[]) {
  const patterns = [];
  const antiPatterns = [];

  if (relationships.length > programs.length * 0.5) {
    patterns.push("Hierarchical program structure detected");
  }

  if (relationships.length > programs.length * 2) {
    antiPatterns.push("High coupling between programs");
  }

  const highComplexityPrograms = programs.filter(p => (p.complexity || 0) > 30);
  if (highComplexityPrograms.length > 0) {
    antiPatterns.push(`${highComplexityPrograms.length} programs with excessive complexity`);
  }

  return { patterns, antiPatterns };
}

function generateModernizationRecommendations(programs: any[]) {
  const recommendations = [];
  
  const highComplexityPrograms = programs.filter(p => (p.complexity || 0) > 25);
  if (highComplexityPrograms.length > 0) {
    recommendations.push(`Refactor ${highComplexityPrograms.length} high-complexity programs`);
  }

  const undocumentedPrograms = programs.filter(p => !p.description && !p.aiSummary);
  if (undocumentedPrograms.length > 0) {
    recommendations.push(`Add documentation for ${undocumentedPrograms.length} undocumented programs`);
  }

  const largeProgramsToBreakDown = programs.filter(p => (p.linesOfCode || 0) > 1000);
  if (largeProgramsToBreakDown.length > 0) {
    recommendations.push(`Consider breaking down ${largeProgramsToBreakDown.length} large programs`);
  }

  return recommendations;
}

function assessSystemRisk(programs: any[]) {
  let riskScore = 0;
  const risks = [];

  const highComplexityCount = programs.filter(p => (p.complexity || 0) > 25).length;
  if (highComplexityCount > 0) {
    riskScore += highComplexityCount * 10;
    risks.push(`${highComplexityCount} programs with high complexity`);
  }

  const undocumentedCount = programs.filter(p => !p.description && !p.aiSummary).length;
  if (undocumentedCount > programs.length * 0.5) {
    riskScore += 20;
    risks.push("More than 50% of programs lack documentation");
  }

  return {
    score: Math.min(100, riskScore),
    level: riskScore > 50 ? 'HIGH' : riskScore > 25 ? 'MEDIUM' : 'LOW',
    risks
  };
}

function assessMigrationReadiness(programs: any[]) {
  let readinessScore = 100;
  const blockers = [];

  const highComplexityCount = programs.filter(p => (p.complexity || 0) > 30).length;
  if (highComplexityCount > 0) {
    readinessScore -= highComplexityCount * 15;
    blockers.push(`${highComplexityCount} programs with excessive complexity`);
  }

  const undocumentedCount = programs.filter(p => !p.description && !p.aiSummary).length;
  if (undocumentedCount > programs.length * 0.3) {
    readinessScore -= 20;
    blockers.push("Significant portions of codebase lack documentation");
  }

  return {
    score: Math.max(0, readinessScore),
    level: readinessScore > 80 ? 'READY' : readinessScore > 50 ? 'MODERATE' : 'NOT_READY',
    blockers
  };
}

function calculateOverallQualityScore(programs: any[]) {
  if (programs.length === 0) return 0;
  
  let totalScore = 0;
  let scoredPrograms = 0;

  for (const program of programs) {
    let programScore = 70; // Base score
    
    const complexity = program.complexity || 0;
    if (complexity <= 10) programScore += 10;
    else if (complexity <= 20) programScore += 5;
    else if (complexity > 30) programScore -= 20;
    
    if (program.description || program.aiSummary) programScore += 10;
    
    const loc = program.linesOfCode || 0;
    if (loc > 0 && loc < 500) programScore += 5;
    else if (loc > 2000) programScore -= 10;
    
    totalScore += Math.max(0, Math.min(100, programScore));
    scoredPrograms++;
  }

  return scoredPrograms > 0 ? Math.round(totalScore / scoredPrograms) : 0;
}

export function setupWorkflowRoutes(app: Express) {
  
  // Start comprehensive analysis workflow
  app.post("/api/repositories/:id/start-analysis", async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      const repository = await storage.getRepository(repositoryId);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }

      console.log(`Starting comprehensive analysis workflow for repository ${repositoryId}`);
      
      // Start workflow asynchronously
      const workflowStatus = await orchestrator.startAnalysisWorkflow(repositoryId);
      
      res.json({
        message: "Analysis workflow started",
        repositoryId,
        status: workflowStatus.status,
        progress: workflowStatus.progress
      });

    } catch (error: any) {
      console.error("Failed to start analysis workflow:", error);
      res.status(500).json({ 
        message: error?.message || "Failed to start analysis workflow" 
      });
    }
  });

  // Get workflow status
  app.get("/api/repositories/:id/workflow-status", async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      const status = orchestrator.getWorkflowStatus(repositoryId);
      
      if (!status) {
        return res.status(404).json({ 
          message: "No active workflow found for this repository" 
        });
      }

      res.json(status);

    } catch (error: any) {
      console.error("Failed to get workflow status:", error);
      res.status(500).json({ 
        message: error?.message || "Failed to get workflow status" 
      });
    }
  });

  // Get comprehensive analysis results
  app.get("/api/repositories/:id/analysis-results", async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      
      // Get repository details
      const repository = await storage.getRepository(repositoryId);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Get all programs in repository
      const codeFiles = await storage.getCodeFilesByRepository(repositoryId);
      const programs = [];
      
      for (const file of codeFiles) {
        if (file.programId) {
          const program = await storage.getProgram(file.programId);
          if (program) {
            programs.push({
              ...program,
              filename: file.filename,
              path: file.path,
              language: file.language
            });
          }
        }
      }

      // Calculate summary statistics
      const totalPrograms = programs.length;
      const averageComplexity = totalPrograms > 0 
        ? Math.round(programs.reduce((sum, p) => sum + (p.complexity || 0), 0) / totalPrograms)
        : 0;
      const totalLinesOfCode = programs.reduce((sum, p) => sum + (p.linesOfCode || 0), 0);

      // Get program relationships
      const relationships = [];
      for (const program of programs) {
        const programRelationships = await storage.getProgramRelationships(program.id);
        relationships.push(...programRelationships);
      }

      const analysisResults = {
        repository: {
          id: repository.id,
          name: repository.name,
          owner: repository.owner,
          url: repository.githubUrl,
          lastAnalyzed: repository.updatedAt,
          status: repository.syncStatus
        },
        summary: {
          totalPrograms,
          totalLinesOfCode,
          averageComplexity,
          totalRelationships: relationships.length,
          languages: [...new Set(codeFiles.map(f => f.language))]
        },
        programs: programs.map(program => ({
          id: program.id,
          name: program.name,
          filename: program.filename,
          linesOfCode: program.linesOfCode,
          complexity: program.complexity,
          totalStatements: program.totalStatements,
          author: program.author,
          dateWritten: program.dateWritten,
          description: program.description,
          aiSummary: program.aiSummary,
          status: program.status
        })),
        relationships: relationships.map(rel => ({
          fromProgram: rel.fromProgramId,
          toProgram: rel.toProgramName,
          type: rel.relationshipType,
          confidence: rel.confidence
        })),
        qualityMetrics: {
          averageComplexity,
          complexityDistribution: getComplexityDistribution(programs),
          programsWithAI: programs.filter(p => p.aiSummary).length,
          programsWithDocumentation: programs.filter(p => p.description).length
        }
      };

      res.json(analysisResults);

    } catch (error: any) {
      console.error("Failed to get analysis results:", error);
      res.status(500).json({ 
        message: error?.message || "Failed to get analysis results" 
      });
    }
  });

  // Get system-level insights
  app.get("/api/repositories/:id/system-insights", async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      
      const repository = await storage.getRepository(repositoryId);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Get all programs and relationships
      const codeFiles = await storage.getCodeFilesByRepository(repositoryId);
      const programs = [];
      const allRelationships = [];
      
      for (const file of codeFiles) {
        if (file.programId) {
          const program = await storage.getProgram(file.programId);
          if (program) {
            programs.push(program);
            const relationships = await storage.getProgramRelationships(program.id);
            allRelationships.push(...relationships);
          }
        }
      }

      // Build call graph
      const callGraph = buildCallGraph(programs, allRelationships);
      
      // Calculate system metrics
      const systemMetrics = calculateSystemMetrics(programs, allRelationships);
      
      // Identify architectural patterns
      const architecturalPatterns = identifyArchitecturalPatterns(programs, allRelationships);
      
      // Generate modernization recommendations
      const modernizationRecommendations = generateModernizationRecommendations(programs);

      const systemInsights = {
        callGraph,
        systemMetrics,
        architecturalPatterns,
        modernizationRecommendations,
        riskAssessment: assessSystemRisk(programs),
        migrationReadiness: assessMigrationReadiness(programs)
      };

      res.json(systemInsights);

    } catch (error: any) {
      console.error("Failed to get system insights:", error);
      res.status(500).json({ 
        message: error?.message || "Failed to get system insights" 
      });
    }
  });

  // Generate executive report
  app.post("/api/repositories/:id/executive-report", async (req, res) => {
    try {
      const repositoryId = parseInt(req.params.id);
      
      const repository = await storage.getRepository(repositoryId);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Get analysis data
      const analysisResponse = await fetch(`${req.protocol}://${req.get('host')}/api/repositories/${repositoryId}/analysis-results`);
      const analysisData = await analysisResponse.json();
      
      const insightsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/repositories/${repositoryId}/system-insights`);
      const insightsData = await insightsResponse.json();

      // Generate executive summary
      const executiveReport = {
        overview: {
          repositoryName: repository.name,
          analysisDate: new Date().toISOString(),
          totalPrograms: analysisData.summary.totalPrograms,
          totalLinesOfCode: analysisData.summary.totalLinesOfCode
        },
        keyFindings: [
          `Analyzed ${analysisData.summary.totalPrograms} COBOL programs`,
          `Average complexity score: ${analysisData.qualityMetrics.averageComplexity}`,
          `${analysisData.qualityMetrics.programsWithAI} programs have AI-generated documentation`,
          `System contains ${analysisData.summary.totalRelationships} program relationships`
        ],
        qualityAssessment: {
          overallScore: calculateOverallQualityScore(analysisData.programs),
          complexityDistribution: analysisData.qualityMetrics.complexityDistribution,
          documentationCoverage: Math.round(
            (analysisData.qualityMetrics.programsWithDocumentation / analysisData.summary.totalPrograms) * 100
          )
        },
        businessRecommendations: [
          "Focus modernization efforts on high-complexity programs",
          "Implement automated testing for critical business logic",
          "Consider gradual migration strategy for legacy components",
          "Invest in documentation for undocumented programs"
        ],
        technicalRecommendations: insightsData.modernizationRecommendations,
        riskAssessment: insightsData.riskAssessment,
        nextSteps: [
          "Review high-risk programs identified in the analysis",
          "Develop migration roadmap based on modernization recommendations",
          "Implement quality gates for future code changes",
          "Consider automated testing implementation"
        ]
      };

      res.json(executiveReport);

    } catch (error: any) {
      console.error("Failed to generate executive report:", error);
      res.status(500).json({ 
        message: error?.message || "Failed to generate executive report" 
      });
    }
  });


}