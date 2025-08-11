/**
 * Enterprise COBOL Analysis Engine
 * Complete backend architecture for comprehensive COBOL code analysis
 */

import { OpenRouterClient } from "./openrouter-client";
import { RobustCOBOLParser, COBOLDialect, SourceFormat } from "./robust-cobol-parser";
import { storage } from "./storage";

export interface AnalysisRequest {
  sourceCode: string;
  filename: string;
  repositoryId: number;
  programId?: number;
}

export interface ComprehensiveAnalysisResult {
  programInfo: {
    name: string;
    filename: string;
    linesOfCode: number;
    complexity: number;
    totalStatements: number;
    author?: string;
    dateWritten?: string;
    description?: string;
  };
  structuralAnalysis: {
    divisions: string[];
    paragraphs: string[];
    dataElements: Array<{
      name: string;
      type: string;
      level: number;
      picture?: string;
      usage?: string;
    }>;
    procedures: string[];
    copybooks: string[];
  };
  businessLogic: {
    businessRules: Array<{
      rule: string;
      description: string;
      location: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      confidence: number;
    }>;
    decisionPoints: Array<{
      condition: string;
      location: string;
      complexity: number;
    }>;
    calculations: Array<{
      formula: string;
      variables: string[];
      location: string;
    }>;
  };
  qualityAssessment: {
    qualityScore: number;
    maintainabilityIndex: number;
    codeSmells: Array<{
      type: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      description: string;
      location: string;
      recommendation: string;
    }>;
    technicalDebt: {
      score: number;
      issues: string[];
      estimatedHours: number;
    };
  };
  dependencies: {
    internalDependencies: string[];
    externalDependencies: string[];
    copybooks: string[];
    calledPrograms: string[];
    callingPrograms: string[];
  };
  aiInsights: {
    summary: string;
    businessPurpose: string;
    modernizationSuggestions: string[];
    riskAssessment: {
      complexity: 'HIGH' | 'MEDIUM' | 'LOW';
      maintainability: 'HIGH' | 'MEDIUM' | 'LOW';
      businessCriticality: 'HIGH' | 'MEDIUM' | 'LOW';
      recommendations: string[];
    };
  };
  compliance: {
    financialRegulations: Array<{
      regulation: string;
      compliance: boolean;
      issues: string[];
    }>;
    codingStandards: Array<{
      standard: string;
      adherence: number;
      violations: string[];
    }>;
  };
}

export class COBOLAnalysisEngine {
  private parser: RobustCOBOLParser;
  private aiClient: OpenRouterClient;

  constructor() {
    this.parser = new RobustCOBOLParser({
      dialect: COBOLDialect.IBM_ENTERPRISE,
      sourceFormat: SourceFormat.FIXED,
      enableErrorRecovery: true,
      semanticValidation: true,
      preprocessorOptions: {
        expandCopybooks: true,
        processReplace: true,
        processCompilerDirectives: true,
        conditionalCompilation: false,
        preserveOriginalText: true
      }
    });
    this.aiClient = new OpenRouterClient();
  }

  /**
   * Perform comprehensive analysis of COBOL source code
   */
  async performComprehensiveAnalysis(request: AnalysisRequest): Promise<ComprehensiveAnalysisResult> {
    console.log(`Starting comprehensive analysis for ${request.filename}...`);

    // Phase 1: Structural Analysis using RobustCOBOLParser
    const structuralData = await this.performStructuralAnalysis(request.sourceCode, request.filename);
    
    // Phase 2: Business Logic Extraction
    const businessLogic = await this.extractBusinessLogic(request.sourceCode, structuralData.programInfo.name);
    
    // Phase 3: Quality Assessment
    const qualityAssessment = await this.assessCodeQuality(request.sourceCode, structuralData.programInfo.name);
    
    // Phase 4: Dependency Analysis
    const dependencies = await this.analyzeDependencies(request.sourceCode, request.repositoryId);
    
    // Phase 5: AI-Enhanced Insights
    const aiInsights = await this.generateAIInsights(request.sourceCode, structuralData.programInfo.name);
    
    // Phase 6: Compliance Analysis
    const compliance = await this.analyzeCompliance(request.sourceCode, businessLogic.businessRules);

    return {
      programInfo: structuralData.programInfo,
      structuralAnalysis: structuralData.structuralAnalysis,
      businessLogic,
      qualityAssessment,
      dependencies,
      aiInsights,
      compliance
    };
  }

  /**
   * Phase 1: Structural Analysis using RobustCOBOLParser
   */
  private async performStructuralAnalysis(sourceCode: string, filename: string) {
    const docData = this.parser.extractDocumentationData(sourceCode, filename);
    const ast = this.parser.parseToAST(sourceCode);

    return {
      programInfo: {
        name: docData.programName,
        filename,
        linesOfCode: docData.metrics.linesOfCode,
        complexity: docData.complexity.cyclomatic,
        totalStatements: docData.metrics.totalStatements,
        author: docData.author,
        dateWritten: docData.dateWritten,
        description: docData.description
      },
      structuralAnalysis: {
        divisions: ast.divisions || [],
        paragraphs: ast.paragraphs || [],
        dataElements: ast.dataElements || [],
        procedures: ast.procedures || [],
        copybooks: ast.copybooks || []
      }
    };
  }

  /**
   * Phase 2: Business Logic Extraction
   */
  private async extractBusinessLogic(sourceCode: string, programName: string) {
    const businessRules = await this.aiClient.extractBusinessRules(sourceCode, programName);
    
    // Extract decision points from source code
    const decisionPoints = this.extractDecisionPoints(sourceCode);
    
    // Extract calculations
    const calculations = this.extractCalculations(sourceCode);

    return {
      businessRules: businessRules.map(rule => ({
        rule: rule.rule,
        description: rule.description,
        location: rule.location,
        impact: this.assessBusinessImpact(rule.rule),
        confidence: rule.confidence
      })),
      decisionPoints,
      calculations
    };
  }

  /**
   * Phase 3: Quality Assessment
   */
  private async assessCodeQuality(sourceCode: string, programName: string) {
    const aiQuality = await this.aiClient.assessCodeQuality(sourceCode, programName);
    
    // Calculate maintainability index
    const maintainabilityIndex = this.calculateMaintainabilityIndex(sourceCode);
    
    // Detect code smells
    const codeSmells = this.detectCodeSmells(sourceCode);
    
    // Assess technical debt
    const technicalDebt = this.assessTechnicalDebt(sourceCode, codeSmells);

    return {
      qualityScore: aiQuality.qualityScore,
      maintainabilityIndex,
      codeSmells: codeSmells.concat(aiQuality.issues.map(issue => ({
        type: issue.type,
        severity: issue.severity,
        description: issue.description,
        location: 'AI_DETECTED',
        recommendation: issue.recommendation
      }))),
      technicalDebt
    };
  }

  /**
   * Phase 4: Dependency Analysis
   */
  private async analyzeDependencies(sourceCode: string, repositoryId: number) {
    // Extract COPY statements
    const copybooks = this.extractCopybooks(sourceCode);
    
    // Extract CALL statements
    const calledPrograms = this.extractCalledPrograms(sourceCode);
    
    // Query database for calling programs
    const callingPrograms = await this.findCallingPrograms(sourceCode, repositoryId);

    return {
      internalDependencies: calledPrograms.filter(p => p.startsWith('INTERNAL')),
      externalDependencies: calledPrograms.filter(p => !p.startsWith('INTERNAL')),
      copybooks,
      calledPrograms,
      callingPrograms
    };
  }

  /**
   * Phase 5: AI-Enhanced Insights
   */
  private async generateAIInsights(sourceCode: string, programName: string) {
    const summary = await this.aiClient.generatePlainEnglishSummary(sourceCode, programName);
    const documentation = await this.aiClient.generateCobolDocumentation({
      sourceCode,
      programName,
      context: 'Enterprise analysis'
    });

    return {
      summary,
      businessPurpose: documentation.businessPurpose,
      modernizationSuggestions: this.generateModernizationSuggestions(sourceCode),
      riskAssessment: documentation.riskAssessment
    };
  }

  /**
   * Phase 6: Compliance Analysis
   */
  private async analyzeCompliance(sourceCode: string, businessRules: any[]) {
    return {
      financialRegulations: this.checkFinancialRegulations(sourceCode, businessRules),
      codingStandards: this.checkCodingStandards(sourceCode)
    };
  }

  // Helper methods for detailed analysis
  private extractDecisionPoints(sourceCode: string) {
    const decisionPoints = [];
    const ifMatches = sourceCode.match(/IF\s+.*?END-IF/gs) || [];
    const evaluateMatches = sourceCode.match(/EVALUATE\s+.*?END-EVALUATE/gs) || [];
    
    for (const match of [...ifMatches, ...evaluateMatches]) {
      decisionPoints.push({
        condition: match.substring(0, 100),
        location: `Line ${this.getLineNumber(sourceCode, match)}`,
        complexity: this.calculateDecisionComplexity(match)
      });
    }
    
    return decisionPoints;
  }

  private extractCalculations(sourceCode: string) {
    const calculations = [];
    const computeMatches = sourceCode.match(/COMPUTE\s+[^.]+\./g) || [];
    const addMatches = sourceCode.match(/ADD\s+[^.]+\./g) || [];
    const subtractMatches = sourceCode.match(/SUBTRACT\s+[^.]+\./g) || [];
    
    for (const match of [...computeMatches, ...addMatches, ...subtractMatches]) {
      const variables = this.extractVariablesFromStatement(match);
      calculations.push({
        formula: match.trim(),
        variables,
        location: `Line ${this.getLineNumber(sourceCode, match)}`
      });
    }
    
    return calculations;
  }

  private assessBusinessImpact(rule: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const highImpactKeywords = ['validation', 'security', 'compliance', 'audit', 'financial'];
    const mediumImpactKeywords = ['calculation', 'processing', 'transformation'];
    
    const lowerRule = rule.toLowerCase();
    if (highImpactKeywords.some(keyword => lowerRule.includes(keyword))) return 'HIGH';
    if (mediumImpactKeywords.some(keyword => lowerRule.includes(keyword))) return 'MEDIUM';
    return 'LOW';
  }

  private calculateMaintainabilityIndex(sourceCode: string): number {
    // Simplified maintainability index calculation
    const linesOfCode = sourceCode.split('\n').length;
    const complexity = this.calculateCyclomaticComplexity(sourceCode);
    const commentRatio = this.calculateCommentRatio(sourceCode);
    
    // Formula: 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code) + 50 * sin(sqrt(2.4 * perCM))
    // Simplified version
    return Math.max(0, Math.min(100, 100 - (complexity * 2) - (linesOfCode / 100) + (commentRatio * 20)));
  }

  private detectCodeSmells(sourceCode: string) {
    const codeSmells = [];
    
    // Long method detection
    const methods = this.extractMethods(sourceCode);
    for (const method of methods) {
      if (method.length > 50) {
        codeSmells.push({
          type: 'LONG_METHOD',
          severity: 'MEDIUM' as const,
          description: `Method ${method.name} is too long (${method.length} lines)`,
          location: method.location,
          recommendation: 'Break down into smaller methods'
        });
      }
    }
    
    // Duplicate code detection
    const duplicates = this.findDuplicateCode(sourceCode);
    for (const duplicate of duplicates) {
      codeSmells.push({
        type: 'DUPLICATE_CODE',
        severity: 'HIGH' as const,
        description: `Duplicate code found: ${duplicate.snippet}`,
        location: duplicate.locations.join(', '),
        recommendation: 'Extract common code into reusable paragraph'
      });
    }
    
    return codeSmells;
  }

  private assessTechnicalDebt(sourceCode: string, codeSmells: any[]) {
    const issues = codeSmells.map(smell => smell.description);
    const score = Math.max(0, 100 - (codeSmells.length * 10));
    const estimatedHours = codeSmells.reduce((total, smell) => {
      return total + (smell.severity === 'HIGH' ? 8 : smell.severity === 'MEDIUM' ? 4 : 2);
    }, 0);
    
    return { score, issues, estimatedHours };
  }

  private extractCopybooks(sourceCode: string): string[] {
    const copyMatches = sourceCode.match(/COPY\s+([A-Z0-9-]+)/g) || [];
    return copyMatches.map(match => match.replace('COPY ', '').trim());
  }

  private extractCalledPrograms(sourceCode: string): string[] {
    const callMatches = sourceCode.match(/CALL\s+['"]([^'"]+)['"]/g) || [];
    return callMatches.map(match => match.match(/['"]([^'"]+)['"]/)?.[1] || '');
  }

  private async findCallingPrograms(sourceCode: string, repositoryId: number): Promise<string[]> {
    // This would query the database for programs that call this one
    // For now, return empty array
    return [];
  }

  private generateModernizationSuggestions(sourceCode: string): string[] {
    const suggestions = [];
    
    if (sourceCode.includes('GOTO')) {
      suggestions.push('Replace GOTO statements with structured programming constructs');
    }
    
    if (sourceCode.includes('REDEFINES')) {
      suggestions.push('Consider using proper data structures instead of REDEFINES');
    }
    
    if (!sourceCode.includes('END-IF') && sourceCode.includes('IF')) {
      suggestions.push('Use explicit scope terminators (END-IF, END-EVALUATE)');
    }
    
    return suggestions;
  }

  private checkFinancialRegulations(sourceCode: string, businessRules: any[]) {
    return [
      {
        regulation: 'SOX Compliance',
        compliance: this.checkSOXCompliance(sourceCode),
        issues: this.getSOXIssues(sourceCode)
      },
      {
        regulation: 'PCI DSS',
        compliance: this.checkPCICompliance(sourceCode),
        issues: this.getPCIIssues(sourceCode)
      }
    ];
  }

  private checkCodingStandards(sourceCode: string) {
    return [
      {
        standard: 'IBM COBOL Standards',
        adherence: this.calculateStandardAdherence(sourceCode),
        violations: this.getStandardViolations(sourceCode)
      }
    ];
  }

  // Additional helper methods
  private getLineNumber(sourceCode: string, match: string): number {
    const index = sourceCode.indexOf(match);
    return sourceCode.substring(0, index).split('\n').length;
  }

  private calculateDecisionComplexity(decision: string): number {
    const andCount = (decision.match(/AND/g) || []).length;
    const orCount = (decision.match(/OR/g) || []).length;
    return 1 + andCount + orCount;
  }

  private extractVariablesFromStatement(statement: string): string[] {
    // Extract variable names from COBOL statements
    const matches = statement.match(/[A-Z][A-Z0-9-]*/g) || [];
    return matches.filter(match => !['COMPUTE', 'ADD', 'SUBTRACT', 'TO', 'FROM'].includes(match));
  }

  private calculateCyclomaticComplexity(sourceCode: string): number {
    const ifCount = (sourceCode.match(/IF\s/g) || []).length;
    const evaluateCount = (sourceCode.match(/EVALUATE\s/g) || []).length;
    const performCount = (sourceCode.match(/PERFORM\s.*UNTIL/g) || []).length;
    return 1 + ifCount + evaluateCount + performCount;
  }

  private calculateCommentRatio(sourceCode: string): number {
    const lines = sourceCode.split('\n');
    const commentLines = lines.filter(line => line.trim().startsWith('*')).length;
    return commentLines / lines.length;
  }

  private extractMethods(sourceCode: string) {
    // Extract paragraphs/sections as methods
    const paragraphs = [];
    const lines = sourceCode.split('\n');
    let currentParagraph = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^[A-Z][A-Z0-9-]*\.$/) && !line.includes('DIVISION')) {
        if (currentParagraph) {
          currentParagraph.length = i - currentParagraph.startLine;
          paragraphs.push(currentParagraph);
        }
        currentParagraph = {
          name: line.replace('.', ''),
          startLine: i,
          location: `Line ${i + 1}`,
          length: 0
        };
      }
    }
    
    if (currentParagraph) {
      currentParagraph.length = lines.length - currentParagraph.startLine;
      paragraphs.push(currentParagraph);
    }
    
    return paragraphs;
  }

  private findDuplicateCode(sourceCode: string) {
    // Simplified duplicate detection
    const lines = sourceCode.split('\n');
    const duplicates = [];
    const lineMap = new Map();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length > 10 && !line.startsWith('*')) {
        if (lineMap.has(line)) {
          lineMap.get(line).push(i + 1);
        } else {
          lineMap.set(line, [i + 1]);
        }
      }
    }
    
    for (const [line, locations] of lineMap) {
      if (locations.length > 1) {
        duplicates.push({
          snippet: line.substring(0, 50),
          locations: locations.map(loc => `Line ${loc}`)
        });
      }
    }
    
    return duplicates;
  }

  private checkSOXCompliance(sourceCode: string): boolean {
    // Simplified SOX compliance check
    return sourceCode.includes('AUDIT') || sourceCode.includes('LOG');
  }

  private getSOXIssues(sourceCode: string): string[] {
    const issues = [];
    if (!sourceCode.includes('AUDIT')) {
      issues.push('Missing audit trail functionality');
    }
    return issues;
  }

  private checkPCICompliance(sourceCode: string): boolean {
    // Simplified PCI compliance check
    return !sourceCode.includes('DISPLAY') || sourceCode.includes('ENCRYPT');
  }

  private getPCIIssues(sourceCode: string): string[] {
    const issues = [];
    if (sourceCode.includes('DISPLAY') && !sourceCode.includes('ENCRYPT')) {
      issues.push('Potential data exposure through DISPLAY statements');
    }
    return issues;
  }

  private calculateStandardAdherence(sourceCode: string): number {
    let score = 100;
    if (sourceCode.includes('GOTO')) score -= 20;
    if (!sourceCode.includes('END-IF') && sourceCode.includes('IF')) score -= 10;
    if (!sourceCode.includes('*') && sourceCode.split('\n').length > 50) score -= 15;
    return Math.max(0, score);
  }

  private getStandardViolations(sourceCode: string): string[] {
    const violations = [];
    if (sourceCode.includes('GOTO')) {
      violations.push('Use of GOTO statements');
    }
    if (!sourceCode.includes('END-IF') && sourceCode.includes('IF')) {
      violations.push('Missing explicit scope terminators');
    }
    return violations;
  }
}