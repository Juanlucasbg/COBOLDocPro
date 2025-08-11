/**
 * Workflow Orchestrator for COBOL Analysis Pipeline
 * Manages the complete analysis workflow from repository ingestion to report generation
 */

import { COBOLAnalysisEngine, type ComprehensiveAnalysisResult } from "./cobol-analysis-engine";
import { SimpleGitHubClient } from "./simple-github-client";
import { storage } from "./storage";
import { OpenRouterClient } from "./openrouter-client";

export interface WorkflowStatus {
  repositoryId: number;
  status: 'PENDING' | 'CLONING' | 'ANALYZING' | 'GENERATING_REPORTS' | 'COMPLETED' | 'FAILED';
  progress: {
    currentStep: string;
    completed: number;
    total: number;
    percentage: number;
  };
  results?: {
    programsAnalyzed: number;
    issuesFound: number;
    qualityScore: number;
    recommendationsGenerated: number;
  };
  error?: string;
}

export class WorkflowOrchestrator {
  private analysisEngine: COBOLAnalysisEngine;
  private githubClient: SimpleGitHubClient;
  private aiClient: OpenRouterClient;
  private activeWorkflows: Map<number, WorkflowStatus> = new Map();

  constructor() {
    this.analysisEngine = new COBOLAnalysisEngine();
    this.githubClient = new SimpleGitHubClient();
    this.aiClient = new OpenRouterClient();
  }

  /**
   * Start complete COBOL analysis workflow
   */
  async startAnalysisWorkflow(repositoryId: number): Promise<WorkflowStatus> {
    console.log(`Starting analysis workflow for repository ${repositoryId}`);

    const repository = await storage.getRepository(repositoryId);
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    // Initialize workflow status
    const workflowStatus: WorkflowStatus = {
      repositoryId,
      status: 'PENDING',
      progress: {
        currentStep: 'Initializing',
        completed: 0,
        total: 100,
        percentage: 0
      }
    };

    this.activeWorkflows.set(repositoryId, workflowStatus);

    try {
      // Phase 1: Repository Cloning and File Discovery
      await this.updateWorkflowStatus(repositoryId, 'CLONING', 'Cloning repository and discovering COBOL files', 10);
      const cobolFiles = await this.discoverCobolFiles(repository.githubUrl);

      // Phase 2: Individual File Analysis
      await this.updateWorkflowStatus(repositoryId, 'ANALYZING', 'Analyzing COBOL programs', 20);
      const analysisResults = await this.analyzeCobolFiles(repositoryId, cobolFiles);

      // Phase 3: Cross-Program Analysis
      await this.updateWorkflowStatus(repositoryId, 'ANALYZING', 'Performing cross-program analysis', 60);
      const systemAnalysis = await this.performSystemAnalysis(repositoryId, analysisResults);

      // Phase 4: Report Generation
      await this.updateWorkflowStatus(repositoryId, 'GENERATING_REPORTS', 'Generating comprehensive reports', 80);
      const reports = await this.generateComprehensiveReports(repositoryId, analysisResults, systemAnalysis);

      // Phase 5: Finalization
      await this.updateWorkflowStatus(repositoryId, 'COMPLETED', 'Analysis completed', 100);
      const finalResults = this.calculateFinalResults(analysisResults);

      workflowStatus.status = 'COMPLETED';
      workflowStatus.results = finalResults;
      workflowStatus.progress.percentage = 100;

      // Update repository status
      await storage.updateRepository(repositoryId, {
        syncStatus: 'COMPLETED',
        lastSyncedCommit: 'latest'
      });

      return workflowStatus;

    } catch (error) {
      console.error(`Workflow failed for repository ${repositoryId}:`, error);
      workflowStatus.status = 'FAILED';
      workflowStatus.error = error instanceof Error ? error.message : 'Unknown error';
      
      await storage.updateRepository(repositoryId, {
        syncStatus: 'FAILED'
      });

      return workflowStatus;
    }
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(repositoryId: number): WorkflowStatus | null {
    return this.activeWorkflows.get(repositoryId) || null;
  }

  /**
   * Phase 1: Discover COBOL files in repository
   */
  private async discoverCobolFiles(githubUrl: string) {
    const urlParts = githubUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1];

    console.log(`Discovering COBOL files in ${owner}/${repo}`);
    const files = await this.githubClient.fetchAllCobolFiles(owner, repo, 'main');
    console.log(`Found ${files.length} COBOL files`);

    return files;
  }

  /**
   * Phase 2: Analyze individual COBOL files
   */
  private async analyzeCobolFiles(repositoryId: number, files: any[]): Promise<ComprehensiveAnalysisResult[]> {
    const results: ComprehensiveAnalysisResult[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = 20 + (40 * i / totalFiles);
      
      await this.updateWorkflowStatus(
        repositoryId, 
        'ANALYZING', 
        `Analyzing ${file.name} (${i + 1}/${totalFiles})`, 
        progress
      );

      try {
        console.log(`Analyzing file: ${file.name}`);
        
        // Store code file first
        const codeFile = await storage.createCodeFile({
          repositoryId,
          filename: file.name,
          path: file.path || file.name,
          language: this.detectLanguage(file.name),
          content: file.content,
          size: file.size,
          lastModified: new Date(),
        });

        // Perform comprehensive analysis
        const analysisResult = await this.analysisEngine.performComprehensiveAnalysis({
          sourceCode: file.content,
          filename: file.name,
          repositoryId,
        });

        // Create program record with analysis results
        const program = await storage.createProgram({
          name: analysisResult.programInfo.name,
          filename: file.name,
          sourceCode: file.content,
          linesOfCode: analysisResult.programInfo.linesOfCode,
          status: 'completed',
          author: analysisResult.programInfo.author,
          dateWritten: analysisResult.programInfo.dateWritten,
          description: analysisResult.programInfo.description,
          complexity: analysisResult.programInfo.complexity,
          totalStatements: analysisResult.programInfo.totalStatements,
          aiSummary: analysisResult.aiInsights.summary,
        });

        // Update code file with program reference
        await storage.updateCodeFile(codeFile.id, { programId: program.id });

        // Store detailed analysis data
        await this.storeAnalysisResults(program.id, analysisResult);

        results.push(analysisResult);

      } catch (error) {
        console.error(`Failed to analyze ${file.name}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Phase 3: Perform system-level analysis
   */
  private async performSystemAnalysis(repositoryId: number, individualResults: ComprehensiveAnalysisResult[]) {
    console.log('Performing system-level analysis...');

    const systemAnalysis = {
      callGraph: this.buildCallGraph(individualResults),
      dataFlow: this.analyzeDataFlow(individualResults),
      dependencyMatrix: this.buildDependencyMatrix(individualResults),
      architecturalPatterns: this.identifyArchitecturalPatterns(individualResults),
      systemComplexity: this.calculateSystemComplexity(individualResults),
      migrationReadiness: this.assessMigrationReadiness(individualResults)
    };

    // Store system analysis results
    await this.storeSystemAnalysis(repositoryId, systemAnalysis);

    return systemAnalysis;
  }

  /**
   * Phase 4: Generate comprehensive reports
   */
  private async generateComprehensiveReports(
    repositoryId: number, 
    analysisResults: ComprehensiveAnalysisResult[], 
    systemAnalysis: any
  ) {
    console.log('Generating comprehensive reports...');

    const reports = {
      executiveSummary: await this.generateExecutiveSummary(analysisResults, systemAnalysis),
      technicalReport: this.generateTechnicalReport(analysisResults, systemAnalysis),
      qualityAssessment: this.generateQualityReport(analysisResults),
      modernizationPlan: await this.generateModernizationPlan(analysisResults, systemAnalysis),
      complianceReport: this.generateComplianceReport(analysisResults)
    };

    // Store reports
    await this.storeReports(repositoryId, reports);

    return reports;
  }

  /**
   * Update workflow status
   */
  private async updateWorkflowStatus(
    repositoryId: number, 
    status: WorkflowStatus['status'], 
    currentStep: string, 
    percentage: number
  ) {
    const workflow = this.activeWorkflows.get(repositoryId);
    if (workflow) {
      workflow.status = status;
      workflow.progress.currentStep = currentStep;
      workflow.progress.percentage = Math.round(percentage);
      workflow.progress.completed = Math.round(percentage);
    }

    // Update repository sync status
    await storage.updateRepository(repositoryId, {
      syncStatus: status === 'COMPLETED' ? 'COMPLETED' : 'SYNCING'
    });
  }

  /**
   * Store detailed analysis results
   */
  private async storeAnalysisResults(programId: number, analysis: ComprehensiveAnalysisResult) {
    // Store business rules
    for (const rule of analysis.businessLogic.businessRules) {
      // Could store in a business_rules table if needed
    }

    // Store quality issues
    for (const smell of analysis.qualityAssessment.codeSmells) {
      // Could store in a quality_issues table if needed
    }

    // Store dependencies
    for (const dep of analysis.dependencies.calledPrograms) {
      await storage.createProgramRelationship({
        fromProgramId: programId,
        toProgramName: dep,
        relationshipType: 'CALLS',
        confidence: 1.0,
      });
    }
  }

  private detectLanguage(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'cbl':
      case 'cob':
        return 'COBOL';
      case 'cpy':
        return 'COPYBOOK';
      case 'jcl':
        return 'JCL';
      default:
        return 'OTHER';
    }
  }

  private buildCallGraph(results: ComprehensiveAnalysisResult[]) {
    const callGraph = { nodes: [], edges: [] };
    
    for (const result of results) {
      callGraph.nodes.push({
        id: result.programInfo.name,
        name: result.programInfo.name,
        type: 'PROGRAM',
        complexity: result.programInfo.complexity
      });

      for (const calledProgram of result.dependencies.calledPrograms) {
        callGraph.edges.push({
          from: result.programInfo.name,
          to: calledProgram,
          type: 'CALLS'
        });
      }
    }

    return callGraph;
  }

  private analyzeDataFlow(results: ComprehensiveAnalysisResult[]) {
    // Analyze data flow between programs
    const dataFlow = {
      sharedData: [],
      dataTransformations: [],
      dataLineage: []
    };

    // Implementation would analyze copybooks and data sharing patterns
    return dataFlow;
  }

  private buildDependencyMatrix(results: ComprehensiveAnalysisResult[]) {
    const programs = results.map(r => r.programInfo.name);
    const matrix = {};

    for (const program of programs) {
      matrix[program] = {};
      for (const otherProgram of programs) {
        matrix[program][otherProgram] = 0;
      }
    }

    // Fill matrix based on call relationships
    for (const result of results) {
      for (const calledProgram of result.dependencies.calledPrograms) {
        if (matrix[result.programInfo.name] && matrix[result.programInfo.name][calledProgram] !== undefined) {
          matrix[result.programInfo.name][calledProgram] = 1;
        }
      }
    }

    return matrix;
  }

  private identifyArchitecturalPatterns(results: ComprehensiveAnalysisResult[]) {
    return {
      patterns: ['HIERARCHICAL_CALLS', 'SHARED_COPYBOOKS'],
      antiPatterns: ['CIRCULAR_DEPENDENCIES', 'GOD_PROGRAM']
    };
  }

  private calculateSystemComplexity(results: ComprehensiveAnalysisResult[]) {
    const totalComplexity = results.reduce((sum, r) => sum + r.programInfo.complexity, 0);
    const averageComplexity = totalComplexity / results.length;
    
    return {
      totalComplexity,
      averageComplexity,
      complexityDistribution: this.getComplexityDistribution(results)
    };
  }

  private getComplexityDistribution(results: ComprehensiveAnalysisResult[]) {
    const distribution = { low: 0, medium: 0, high: 0 };
    
    for (const result of results) {
      if (result.programInfo.complexity <= 10) distribution.low++;
      else if (result.programInfo.complexity <= 20) distribution.medium++;
      else distribution.high++;
    }
    
    return distribution;
  }

  private assessMigrationReadiness(results: ComprehensiveAnalysisResult[]) {
    let readinessScore = 100;
    let issues = [];

    for (const result of results) {
      if (result.aiInsights.riskAssessment.complexity === 'HIGH') {
        readinessScore -= 10;
        issues.push(`High complexity in ${result.programInfo.name}`);
      }
    }

    return {
      score: Math.max(0, readinessScore),
      readiness: readinessScore > 70 ? 'READY' : readinessScore > 40 ? 'NEEDS_WORK' : 'NOT_READY',
      issues
    };
  }

  private async generateExecutiveSummary(results: ComprehensiveAnalysisResult[], systemAnalysis: any) {
    const totalPrograms = results.length;
    const averageQuality = results.reduce((sum, r) => sum + r.qualityAssessment.qualityScore, 0) / totalPrograms;
    const totalIssues = results.reduce((sum, r) => sum + r.qualityAssessment.codeSmells.length, 0);

    return {
      overview: `Analysis of ${totalPrograms} COBOL programs completed`,
      qualityScore: Math.round(averageQuality),
      totalIssues,
      recommendations: [
        'Focus on high-complexity programs for modernization',
        'Implement automated testing for critical business logic',
        'Consider refactoring programs with low maintainability scores'
      ],
      migrationReadiness: systemAnalysis.migrationReadiness
    };
  }

  private generateTechnicalReport(results: ComprehensiveAnalysisResult[], systemAnalysis: any) {
    return {
      systemOverview: systemAnalysis,
      programDetails: results.map(r => ({
        name: r.programInfo.name,
        complexity: r.programInfo.complexity,
        qualityScore: r.qualityAssessment.qualityScore,
        issueCount: r.qualityAssessment.codeSmells.length
      })),
      dependencyAnalysis: systemAnalysis.dependencyMatrix,
      architecturalInsights: systemAnalysis.architecturalPatterns
    };
  }

  private generateQualityReport(results: ComprehensiveAnalysisResult[]) {
    const qualityScores = results.map(r => r.qualityAssessment.qualityScore);
    const averageQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    
    return {
      overallQuality: averageQuality,
      qualityDistribution: this.getQualityDistribution(qualityScores),
      commonIssues: this.aggregateCommonIssues(results),
      recommendations: this.generateQualityRecommendations(results)
    };
  }

  private getQualityDistribution(scores: number[]) {
    return {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 70 && s < 90).length,
      needsImprovement: scores.filter(s => s < 70).length
    };
  }

  private aggregateCommonIssues(results: ComprehensiveAnalysisResult[]) {
    const issueTypes = new Map();
    
    for (const result of results) {
      for (const issue of result.qualityAssessment.codeSmells) {
        const count = issueTypes.get(issue.type) || 0;
        issueTypes.set(issue.type, count + 1);
      }
    }
    
    return Array.from(issueTypes.entries()).map(([type, count]) => ({ type, count }));
  }

  private generateQualityRecommendations(results: ComprehensiveAnalysisResult[]) {
    const recommendations = [];
    const totalPrograms = results.length;
    
    const highComplexityCount = results.filter(r => r.programInfo.complexity > 20).length;
    if (highComplexityCount > totalPrograms * 0.3) {
      recommendations.push('Consider refactoring high-complexity programs to improve maintainability');
    }
    
    return recommendations;
  }

  private async generateModernizationPlan(results: ComprehensiveAnalysisResult[], systemAnalysis: any) {
    const plan = {
      phases: [
        {
          phase: 1,
          title: 'Code Quality Improvement',
          programs: results.filter(r => r.qualityAssessment.qualityScore < 70).map(r => r.programInfo.name),
          estimatedEffort: '2-4 weeks'
        },
        {
          phase: 2,
          title: 'Dependency Cleanup',
          programs: results.filter(r => r.dependencies.calledPrograms.length > 10).map(r => r.programInfo.name),
          estimatedEffort: '3-6 weeks'
        },
        {
          phase: 3,
          title: 'Architecture Modernization',
          programs: results.filter(r => r.programInfo.complexity > 25).map(r => r.programInfo.name),
          estimatedEffort: '6-12 months'
        }
      ],
      totalEstimate: '8-16 months',
      riskFactors: systemAnalysis.migrationReadiness.issues
    };

    return plan;
  }

  private generateComplianceReport(results: ComprehensiveAnalysisResult[]) {
    const complianceIssues = [];
    const totalPrograms = results.length;
    
    for (const result of results) {
      for (const regulation of result.compliance.financialRegulations) {
        if (!regulation.compliance) {
          complianceIssues.push({
            program: result.programInfo.name,
            regulation: regulation.regulation,
            issues: regulation.issues
          });
        }
      }
    }
    
    return {
      overallCompliance: ((totalPrograms - complianceIssues.length) / totalPrograms) * 100,
      issues: complianceIssues,
      recommendations: [
        'Implement audit logging in non-compliant programs',
        'Review data handling practices for PCI compliance',
        'Add input validation for security compliance'
      ]
    };
  }

  private async storeSystemAnalysis(repositoryId: number, systemAnalysis: any) {
    // Store system analysis results in database
    // Implementation would depend on schema design
  }

  private async storeReports(repositoryId: number, reports: any) {
    // Store generated reports
    // Implementation would depend on schema design
  }

  private calculateFinalResults(results: ComprehensiveAnalysisResult[]) {
    const programsAnalyzed = results.length;
    const issuesFound = results.reduce((sum, r) => sum + r.qualityAssessment.codeSmells.length, 0);
    const qualityScore = Math.round(
      results.reduce((sum, r) => sum + r.qualityAssessment.qualityScore, 0) / programsAnalyzed
    );
    const recommendationsGenerated = results.reduce(
      (sum, r) => sum + r.aiInsights.modernizationSuggestions.length, 0
    );

    return {
      programsAnalyzed,
      issuesFound,
      qualityScore,
      recommendationsGenerated
    };
  }
}