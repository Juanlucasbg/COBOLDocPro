import { storage } from "./storage";
import { EnhancedCOBOLParser, COBOLDialect } from "./enhanced-cobol-parser";
import type { ParsedCOBOLProgram } from "./enhanced-cobol-parser";
import { impactAnalysisEngine } from "./impact-analysis-engine";
import { businessRuleWorkbench } from "./business-rule-workbench";
import type { 
  Program, 
  InsertQualityIssue, 
  InsertCodeMetrics,
  InsertBusinessRuleCandidate,
  InsertControlFlowGraph 
} from "@shared/schema";

export interface AnalysisRequest {
  programId: number;
  analysisTypes: AnalysisType[];
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  dialect?: COBOLDialect;
  deepAnalysis?: boolean;
  includeImpactAnalysis?: boolean;
  generateBusinessRules?: boolean;
  runQualityChecks?: boolean;
  createCFG?: boolean;
}

export type AnalysisType = 
  | 'parsing'
  | 'quality'
  | 'metrics' 
  | 'business-rules'
  | 'impact-analysis'
  | 'cfg'
  | 'dependencies'
  | 'transformation-readiness'
  | 'hybrid-hllm';

export interface AnalysisResult {
  programId: number;
  analysisTypes: AnalysisType[];
  results: {
    parsing?: ParsedCOBOLProgram;
    qualityIssuesCount?: number;
    metricsCalculated?: boolean;
    businessRulesExtracted?: number;
    impactAnalysisComplete?: boolean;
    cfgGenerated?: boolean;
    dependenciesFound?: number;
    transformationScore?: number;
  };
  summary: string;
  recommendations: string[];
  executionTime: number;
}

export class AnalysisEngine {
  private parser: EnhancedCOBOLParser;

  constructor() {
    this.parser = new EnhancedCOBOLParser(COBOLDialect.IBM_ENTERPRISE);
  }

  /**
   * Run comprehensive analysis on a COBOL program
   */
  async analyzeProgram(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    const { programId, analysisTypes, options = {} } = request;

    const program = await storage.getProgram(programId);
    if (!program) {
      throw new Error(`Program with id ${programId} not found`);
    }

    const result: AnalysisResult = {
      programId,
      analysisTypes,
      results: {},
      summary: '',
      recommendations: [],
      executionTime: 0
    };

    // Set dialect if specified
    if (options.dialect) {
      this.parser = new EnhancedCOBOLParser(options.dialect);
    }

    // Run each requested analysis type
    for (const analysisType of analysisTypes) {
      try {
        await this.runAnalysisType(analysisType, program, result, options);
      } catch (error) {
        console.error(`Failed to run ${analysisType} analysis:`, error);
        result.recommendations.push(`Failed to complete ${analysisType} analysis: ${(error as Error).message}`);
      }
    }

    // Generate summary and recommendations
    result.summary = this.generateSummary(result);
    result.recommendations.push(...this.generateRecommendations(result));
    result.executionTime = Date.now() - startTime;

    return result;
  }

  /**
   * Run batch analysis on multiple programs
   */
  async batchAnalyze(
    programIds: number[], 
    analysisTypes: AnalysisType[],
    options?: AnalysisOptions
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (const programId of programIds) {
      try {
        const result = await this.analyzeProgram({
          programId,
          analysisTypes,
          options
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to analyze program ${programId}:`, error);
        results.push({
          programId,
          analysisTypes,
          results: {},
          summary: `Analysis failed: ${(error as Error).message}`,
          recommendations: ['Review program and retry analysis'],
          executionTime: 0
        });
      }
    }

    return results;
  }

  /**
   * Get analysis recommendations for a program
   */
  async getRecommendations(programId: number): Promise<string[]> {
    const recommendations: string[] = [];

    // Check if basic analysis has been done
    const metrics = await storage.getCodeMetricsByProgram(programId);
    if (!metrics) {
      recommendations.push('Run code metrics analysis to understand program complexity');
    } else {
      if (metrics.cyclomaticComplexity > 15) {
        recommendations.push('High cyclomatic complexity detected - consider refactoring');
      }
      if (metrics.depthOfNesting > 5) {
        recommendations.push('Deep nesting detected - simplify control structures');
      }
    }

    // Check quality issues
    const qualityIssues = await storage.getQualityIssuesByProgram(programId);
    if (qualityIssues.length > 0) {
      const criticalIssues = qualityIssues.filter(issue => issue.severity === 'critical');
      if (criticalIssues.length > 0) {
        recommendations.push(`Address ${criticalIssues.length} critical quality issues immediately`);
      }
    }

    // Check business rules
    const businessRules = await storage.getBusinessRuleCandidatesByProgram(programId);
    const unconfirmedRules = businessRules.filter(rule => rule.status === 'candidate');
    if (unconfirmedRules.length > 0) {
      recommendations.push(`Review and validate ${unconfirmedRules.length} business rule candidates`);
    }

    return recommendations;
  }

  /**
   * Run specific analysis type
   */
  private async runAnalysisType(
    analysisType: AnalysisType,
    program: Program,
    result: AnalysisResult,
    options: AnalysisOptions
  ): Promise<void> {
    switch (analysisType) {
      case 'hybrid-hllm': {
        const { runHybridAnalysis } = await import('./analysis/hybrid-pipeline');
        const hybrid = await runHybridAnalysis(program.id, { deep: options?.deepAnalysis });
        // Save a summary into recommendations and summary fields
        result.recommendations.push(...hybrid.report.improvementRecommendations);
        result.summary = (result.summary ? result.summary + ' ' : '') + 'Hybrid code-only analysis completed.';
        break;
      }
      case 'parsing':
        await this.runParsingAnalysis(program, result);
        break;
      case 'quality':
        await this.runQualityAnalysis(program, result);
        break;
      case 'metrics':
        await this.runMetricsAnalysis(program, result);
        break;
      case 'business-rules':
        await this.runBusinessRulesAnalysis(program, result);
        break;
      case 'impact-analysis':
        await this.runImpactAnalysis(program, result);
        break;
      case 'cfg':
        await this.runCFGAnalysis(program, result);
        break;
      case 'dependencies':
        await this.runDependencyAnalysis(program, result);
        break;
      case 'transformation-readiness':
        await this.runTransformationAnalysis(program, result);
        break;
    }
  }

  /**
   * Run parsing analysis
   */
  private async runParsingAnalysis(program: Program, result: AnalysisResult): Promise<void> {
    const parsed = await this.parser.parseProgram(program.sourceCode, program.filename);
    result.results.parsing = parsed;

    // Store results in database
    if (parsed.qualityIssues.length > 0) {
      for (const issue of parsed.qualityIssues) {
        await storage.createQualityIssue({
          programId: program.id,
          rule: issue.rule,
          severity: issue.severity,
          category: issue.category,
          message: issue.message,
          location: issue.location,
          suggestion: issue.suggestion
        });
      }
    }

    if (parsed.businessRules.length > 0) {
      for (const rule of parsed.businessRules) {
        await storage.createBusinessRuleCandidate({
          programId: program.id,
          type: rule.type,
          description: rule.description,
          confidence: rule.confidence,
          location: rule.location,
          variables: rule.variables,
          conditions: rule.conditions,
          actions: rule.actions,
          evidence: rule.evidence
        });
      }
    }
  }

  /**
   * Run quality analysis
   */
  private async runQualityAnalysis(program: Program, result: AnalysisResult): Promise<void> {
    const qualityIssues = await storage.getQualityIssuesByProgram(program.id);
    result.results.qualityIssuesCount = qualityIssues.length;
  }

  /**
   * Run metrics analysis
   */
  private async runMetricsAnalysis(program: Program, result: AnalysisResult): Promise<void> {
    // Check if metrics already exist
    let metrics = await storage.getCodeMetricsByProgram(program.id);
    
    if (!metrics && result.results.parsing) {
      // Create metrics from parsing results
      const parsed = result.results.parsing;
      metrics = await storage.createCodeMetrics({
        programId: program.id,
        linesOfCode: parsed.metrics.linesOfCode,
        cyclomaticComplexity: parsed.metrics.cyclomaticComplexity,
        cognitiveComplexity: parsed.metrics.cognitiveComplexity,
        depthOfNesting: parsed.metrics.depthOfNesting,
        numberOfParagraphs: parsed.metrics.numberOfParagraphs,
        numberOfSections: parsed.metrics.numberOfSections,
        halsteadMetrics: parsed.metrics.halsteadMetrics,
        maintainabilityIndex: this.calculateMaintainabilityIndex(parsed.metrics),
        technicalDebt: this.calculateTechnicalDebt(parsed.metrics)
      });
    }
    
    result.results.metricsCalculated = !!metrics;
  }

  /**
   * Run business rules analysis
   */
  private async runBusinessRulesAnalysis(program: Program, result: AnalysisResult): Promise<void> {
    const businessRules = await storage.getBusinessRuleCandidatesByProgram(program.id);
    result.results.businessRulesExtracted = businessRules.length;
  }

  /**
   * Run impact analysis
   */
  private async runImpactAnalysis(program: Program, result: AnalysisResult): Promise<void> {
    const impact = await impactAnalysisEngine.analyzeProgramImpact(program.id);
    result.results.impactAnalysisComplete = true;
    result.results.dependenciesFound = impact.impactedItems.length;
  }

  /**
   * Run control flow graph analysis
   */
  private async runCFGAnalysis(program: Program, result: AnalysisResult): Promise<void> {
    let cfg = await storage.getControlFlowGraphByProgram(program.id);
    
    if (!cfg && result.results.parsing) {
      // Create CFG from parsing results
      const parsed = result.results.parsing;
      const cfgData: InsertControlFlowGraph = {
        programId: program.id,
        nodes: Array.from(parsed.cfg.nodes.values()).map(node => ({
          id: node.id,
          type: node.type,
          statement: node.statement,
          condition: node.condition,
          location: node.location,
          predecessors: node.predecessors,
          successors: node.successors
        })),
        entryNode: parsed.cfg.entryNode,
        exitNodes: parsed.cfg.exitNodes,
        metadata: {
          complexity: parsed.metrics.cyclomaticComplexity,
          nodeCount: parsed.cfg.nodes.size,
          edgeCount: this.countCFGEdges(parsed.cfg.nodes)
        }
      };
      
      cfg = await storage.createControlFlowGraph(cfgData);
    }
    
    result.results.cfgGenerated = !!cfg;
  }

  /**
   * Run dependency analysis
   */
  private async runDependencyAnalysis(program: Program, result: AnalysisResult): Promise<void> {
    const dependencies = await storage.getDependenciesByProgram(program.id);
    result.results.dependenciesFound = dependencies.length;
  }

  /**
   * Run transformation readiness analysis
   */
  private async runTransformationAnalysis(program: Program, result: AnalysisResult): Promise<void> {
    let readiness = await storage.getTransformationReadinessByProgram(program.id);
    
    if (!readiness) {
      // Calculate transformation readiness score
      const metrics = await storage.getCodeMetricsByProgram(program.id);
      const qualityIssues = await storage.getQualityIssuesByProgram(program.id);
      const dependencies = await storage.getDependenciesByProgram(program.id);
      
      const score = this.calculateTransformationScore(metrics, qualityIssues, dependencies);
      
      readiness = await storage.createTransformationReadiness({
        programId: program.id,
        readinessScore: score.total,
        complexityFactors: score.factors,
        blockers: score.blockers,
        recommendations: score.recommendations,
        estimatedEffort: score.estimatedEffort,
        targetPlatform: 'Java' // Default target
      });
    }
    
    result.results.transformationScore = readiness.readinessScore;
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(result: AnalysisResult): string {
    const summaryParts: string[] = [];
    
    if (result.results.parsing) {
      summaryParts.push(`Parsed program with ${result.results.parsing.metrics.linesOfCode} lines of code`);
    }
    
    if (result.results.qualityIssuesCount !== undefined) {
      summaryParts.push(`Found ${result.results.qualityIssuesCount} quality issues`);
    }
    
    if (result.results.businessRulesExtracted) {
      summaryParts.push(`Extracted ${result.results.businessRulesExtracted} business rule candidates`);
    }
    
    if (result.results.transformationScore) {
      summaryParts.push(`Transformation readiness score: ${result.results.transformationScore}%`);
    }
    
    return summaryParts.join('. ');
  }

  /**
   * Generate recommendations based on analysis results
   */
  private generateRecommendations(result: AnalysisResult): string[] {
    const recommendations: string[] = [];
    
    if (result.results.parsing) {
      const complexity = result.results.parsing.metrics.cyclomaticComplexity;
      if (complexity > 15) {
        recommendations.push('Consider refactoring to reduce cyclomatic complexity');
      }
      
      if (result.results.parsing.qualityIssues.length > 0) {
        const criticalIssues = result.results.parsing.qualityIssues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
          recommendations.push(`Address ${criticalIssues.length} critical quality issues`);
        }
      }
    }
    
    if (result.results.businessRulesExtracted && result.results.businessRulesExtracted > 0) {
      recommendations.push('Review and validate extracted business rules');
    }
    
    if (result.results.transformationScore && result.results.transformationScore < 50) {
      recommendations.push('Program requires significant preparation before transformation');
    }
    
    return recommendations;
  }

  // Helper methods
  private calculateMaintainabilityIndex(metrics: any): number {
    // Microsoft's maintainability index formula
    const mi = Math.max(0, 
      (171 - 5.2 * Math.log(metrics.halsteadMetrics.vocabulary) - 
       0.23 * metrics.cyclomaticComplexity - 
       16.2 * Math.log(metrics.linesOfCode)) * 100 / 171
    );
    return Math.round(mi);
  }

  private calculateTechnicalDebt(metrics: any): number {
    // Estimate technical debt in minutes
    let debt = 0;
    debt += Math.max(0, metrics.cyclomaticComplexity - 10) * 5; // 5 minutes per excess complexity point
    debt += Math.max(0, metrics.depthOfNesting - 3) * 10; // 10 minutes per excess nesting level
    return debt;
  }

  private countCFGEdges(nodes: Map<string, any>): number {
    let edges = 0;
    for (const node of nodes.values()) {
      edges += node.successors.length;
    }
    return edges;
  }

  private calculateTransformationScore(
    metrics: any, 
    qualityIssues: any[], 
    dependencies: any[]
  ): {
    total: number;
    factors: any;
    blockers: string[];
    recommendations: string[];
    estimatedEffort: number;
  } {
    let score = 100;
    const blockers: string[] = [];
    const recommendations: string[] = [];
    
    // Complexity factor
    const complexityPenalty = Math.min(30, metrics?.cyclomaticComplexity * 2 || 0);
    score -= complexityPenalty;
    
    // Quality issues factor
    const criticalIssues = qualityIssues.filter(i => i.severity === 'critical').length;
    const qualityPenalty = criticalIssues * 10;
    score -= qualityPenalty;
    
    if (criticalIssues > 0) {
      blockers.push(`${criticalIssues} critical quality issues`);
    }
    
    // Dependencies factor
    const dependencyPenalty = Math.min(20, dependencies.length * 2);
    score -= dependencyPenalty;
    
    if (dependencies.length > 10) {
      blockers.push('High number of dependencies');
    }
    
    // Estimate effort in days
    const estimatedEffort = Math.ceil((100 - score) / 10) + Math.ceil(metrics?.linesOfCode / 1000 || 1);
    
    return {
      total: Math.max(0, score),
      factors: {
        dialectSpecific: 0,
        dataStructureComplexity: complexityPenalty,
        businessLogicComplexity: qualityPenalty,
        externalDependencies: dependencyPenalty
      },
      blockers,
      recommendations,
      estimatedEffort
    };
  }
}

// Export singleton instance
export const analysisEngine = new AnalysisEngine();