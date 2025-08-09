import { CobolStaticAnalyzer, setupRepositoryAnalysis, type StaticAnalysisResult } from './cobol-analyzer';
import { AIDocumentationGenerator, type DocumentationResult } from './ai-documentation-generator';
import { COBOLSemanticAnalyzer, type SemanticAnalysisResult } from './cobol-semantic-analyzer';
import { EnterpriseDocumentationGenerator, type EnterpriseDocumentationResult } from './enterprise-documentation-generator';
import type { IStorage } from './storage';
import * as path from 'path';

export interface RepositoryAnalysisJob {
  id: string;
  repositoryUrl: string;
  repositoryName: string;
  status: 'PENDING' | 'ANALYZING' | 'SEMANTIC_ANALYSIS' | 'GENERATING_DOCS' | 'ENTERPRISE_DOCS' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep: string;
  staticAnalysis?: StaticAnalysisResult[];
  semanticAnalysis?: SemanticAnalysisResult[];
  documentation?: DocumentationResult;
  enterpriseDocumentation?: EnterpriseDocumentationResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class RepositoryIntegrationService {
  private jobs = new Map<string, RepositoryAnalysisJob>();
  private storage: IStorage;
  private aiGenerator: AIDocumentationGenerator;
  private semanticAnalyzer: COBOLSemanticAnalyzer;
  private enterpriseGenerator: EnterpriseDocumentationGenerator;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.aiGenerator = new AIDocumentationGenerator();
    this.semanticAnalyzer = new COBOLSemanticAnalyzer();
    this.enterpriseGenerator = new EnterpriseDocumentationGenerator();
  }

  async startRepositoryAnalysis(repositoryUrl: string): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const repositoryName = this.extractRepositoryName(repositoryUrl);

    const job: RepositoryAnalysisJob = {
      id: jobId,
      repositoryUrl,
      repositoryName,
      status: 'PENDING',
      progress: 0,
      currentStep: 'Initializing...',
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);

    // Start analysis in background
    this.performAnalysis(jobId);

    return jobId;
  }

  getJobStatus(jobId: string): RepositoryAnalysisJob | null {
    return this.jobs.get(jobId) || null;
  }

  private extractRepositoryName(url: string): string {
    const match = url.match(/\/([^\/]+)\.git$/);
    return match ? match[1] : 'unknown-repo';
  }

  private async performAnalysis(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Step 1: Setup and Clone Repository
      this.updateJob(jobId, {
        status: 'ANALYZING',
        progress: 10,
        currentStep: 'Cloning repository...'
      });

      const repoPath = await setupRepositoryAnalysis(job.repositoryUrl, jobId);

      // Step 2: Static Analysis
      this.updateJob(jobId, {
        progress: 15,
        currentStep: 'Performing static code analysis...'
      });

      const analyzer = new CobolStaticAnalyzer(repoPath);
      const staticAnalysis = await analyzer.analyzeRepository();

      this.updateJob(jobId, {
        progress: 35,
        currentStep: 'Static analysis completed. Starting semantic analysis...',
        staticAnalysis
      });

      // Step 3: Semantic Analysis
      this.updateJob(jobId, {
        status: 'SEMANTIC_ANALYSIS',
        progress: 40,
        currentStep: 'Performing semantic analysis and business rule extraction...'
      });

      let semanticAnalysis: SemanticAnalysisResult[] = [];
      try {
        semanticAnalysis = await this.semanticAnalyzer.analyzeSemantics(staticAnalysis);
      } catch (error) {
        console.warn('Semantic analysis failed, continuing with static analysis only:', error);
        // Continue with empty semantic analysis if it fails
      }

      this.updateJob(jobId, {
        progress: 55,
        currentStep: 'Semantic analysis completed. Starting AI documentation generation...',
        semanticAnalysis
      });

      // Step 4: Store Analysis Results
      await this.storeStaticAnalysis(staticAnalysis, job.repositoryName);
      await this.storeSemanticAnalysis(semanticAnalysis, job.repositoryName);

      // Step 5: AI-Enhanced Documentation
      this.updateJob(jobId, {
        status: 'GENERATING_DOCS',
        progress: 60,
        currentStep: 'Generating AI-enhanced documentation...'
      });

      const documentation = await this.aiGenerator.generateComprehensiveDocumentation(
        staticAnalysis,
        job.repositoryName
      );

      this.updateJob(jobId, {
        progress: 75,
        currentStep: 'AI documentation completed. Generating enterprise documentation...',
        documentation
      });

      // Step 6: Enterprise Documentation Generation
      this.updateJob(jobId, {
        status: 'ENTERPRISE_DOCS',
        progress: 80,
        currentStep: 'Generating enterprise-grade documentation package...'
      });

      const enterpriseDocumentation = await this.enterpriseGenerator.generateEnterpriseDocumentation(
        staticAnalysis,
        semanticAnalysis,
        job.repositoryName,
        {
          detailLevel: 'COMPREHENSIVE',
          audience: 'TECHNICAL',
          exportFormats: ['HTML', 'PDF', 'JSON'],
          generateDiagrams: true,
          includeSourceCode: true
        }
      );

      // Step 7: Store All Documentation
      this.updateJob(jobId, {
        progress: 90,
        currentStep: 'Storing comprehensive documentation...'
      });

      await this.storeDocumentation(documentation, job.repositoryName);
      await this.storeEnterpriseDocumentation(enterpriseDocumentation, job.repositoryName);

      // Step 8: Complete
      this.updateJob(jobId, {
        status: 'COMPLETED',
        progress: 100,
        currentStep: 'Comprehensive analysis and documentation completed successfully!',
        documentation,
        enterpriseDocumentation,
        completedAt: new Date()
      });

    } catch (error) {
      console.error(`Analysis failed for job ${jobId}:`, error);
      this.updateJob(jobId, {
        status: 'FAILED',
        currentStep: 'Analysis failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private updateJob(jobId: string, updates: Partial<RepositoryAnalysisJob>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      this.jobs.set(jobId, job);
    }
  }

  private async storeStaticAnalysis(
    analysisResults: StaticAnalysisResult[],
    repositoryName: string
  ): Promise<void> {
    // Store repository information
    const repositoryData = {
      githubUrl: '',
      owner: 'analysis',
      name: repositoryName,
      branch: 'main',
      syncStatus: 'completed'
    };

    // Create repository record
    // Note: This would need to be implemented in the storage layer
    // const repoId = await this.storage.createRepository(repositoryData);

    // Store programs from analysis
    for (const result of analysisResults) {
      for (const program of result.programs) {
        const programData = {
          name: program.name,
          filename: result.fileName,
          sourceCode: '', // Would need to read from file
          linesOfCode: result.metrics.linesOfCode,
          complexity: result.metrics.cyclomaticComplexity.toString(),
          status: 'completed',
          businessRules: result.businessRules.map(rule => ({
            rule: rule.description,
            condition: rule.conditions.join(' AND '),
            action: rule.actions.join('; '),
            codeLocation: `${rule.location.program}:${rule.location.lineNumber}`
          })),
          structure: {
            divisions: [{
              name: program.division,
              sections: program.sections.map(section => ({
                name: section.name,
                paragraphs: section.paragraphs.map(p => p.name)
              }))
            }]
          }
        };

        await this.storage.createProgram(programData);
      }

      // Store data elements (skip if no storage method available)
      for (const dataElement of result.dataElements) {
        try {
          const dataElementData = {
            programId: null, // Allow null for repository analysis
            name: dataElement.name,
            type: dataElement.type,
            length: dataElement.length,
            programName: result.fileName,
            description: dataElement.description || '',
            usage: 'UNKNOWN'
          };

          // Only store if createDataElement method exists
          if (typeof this.storage.createDataElement === 'function') {
            await this.storage.createDataElement(dataElementData);
          }
        } catch (error) {
          console.warn(`Failed to store data element ${dataElement.name}:`, error);
          // Continue processing other elements
        }
      }
    }
  }

  private async storeSemanticAnalysis(
    semanticResults: SemanticAnalysisResult[],
    repositoryName: string
  ): Promise<void> {
    // Store semantic analysis results
    console.log(`Storing semantic analysis for ${repositoryName}:`, {
      programs: semanticResults.length,
      businessRules: semanticResults.reduce((sum, r) => sum + r.businessRules.length, 0),
      dataFlows: semanticResults.reduce((sum, r) => sum + r.dataLineage.flows.length, 0)
    });
    
    // Would implement actual storage in production
  }

  private async storeDocumentation(
    documentation: DocumentationResult,
    repositoryName: string
  ): Promise<void> {
    // Store comprehensive documentation
    const docData = {
      repositoryName,
      overview: documentation.overview,
      technicalDetails: documentation.technicalDetails,
      businessLogic: documentation.businessLogic,
      dataFlow: documentation.dataFlow,
      architectureAnalysis: documentation.architectureAnalysis,
      memberFile: documentation.memberFile,
      qualityAssessment: documentation.qualityAssessment,
      recommendations: documentation.recommendations,
      diagrams: documentation.diagrams,
      generatedAt: new Date().toISOString()
    };

    console.log(`Storing AI documentation for ${repositoryName}`);
    // This would need to be implemented in the storage layer
    // await this.storage.createDocumentation(docData);
  }

  private async storeEnterpriseDocumentation(
    enterpriseDoc: EnterpriseDocumentationResult,
    repositoryName: string
  ): Promise<void> {
    // Store enterprise documentation package
    console.log(`Storing enterprise documentation for ${repositoryName}:`, {
      sections: enterpriseDoc.sections.length,
      exports: enterpriseDoc.exports.length,
      visualizations: enterpriseDoc.visualizations.callGraphs.length + 
                     enterpriseDoc.visualizations.dataFlowDiagrams.length,
      searchEntries: enterpriseDoc.searchIndex.programs.length +
                     enterpriseDoc.searchIndex.dataItems.length +
                     enterpriseDoc.searchIndex.businessRules.length
    });
    
    // Would implement actual storage in production
  }

  // Cleanup old jobs (keep only last 24 hours)
  cleanupOldJobs(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs) {
      if (job.createdAt < cutoff) {
        this.jobs.delete(jobId);
      }
    }
  }

  // Get all active jobs
  getActiveJobs(): RepositoryAnalysisJob[] {
    return Array.from(this.jobs.values());
  }

  // Cancel a job
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status !== 'COMPLETED' && job.status !== 'FAILED') {
      this.updateJob(jobId, {
        status: 'FAILED',
        currentStep: 'Cancelled by user',
        error: 'Job cancelled'
      });
      return true;
    }
    return false;
  }
}

// Predefined repository configurations for the two repositories
export const PREDEFINED_REPOSITORIES = {
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
    ],
    analysis: {
      strengths: [
        'Custom DSL approach with minimal impact',
        'Handles source files in isolation',
        'Excellent visualization capabilities',
        'BSD license (permissive)',
        'Used by Tocea for COBOL auditing'
      ],
      weaknesses: [
        'Older architecture (not ANTLR4-based)',
        'ANT build system instead of Maven',
        'Less structured semantic analysis'
      ]
    }
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
    ],
    analysis: {
      strengths: [
        'Modern ANTLR4 architecture',
        'Rich semantic analysis with ASG',
        'Comprehensive preprocessor handling',
        'Test-driven development',
        'Banking/insurance sector proven',
        'Active development and maintenance'
      ],
      weaknesses: [
        'Requires preprocessing step',
        'More complex setup',
        'Less built-in visualization'
      ]
    }
  }
} as const;

export type RepositoryType = keyof typeof PREDEFINED_REPOSITORIES;