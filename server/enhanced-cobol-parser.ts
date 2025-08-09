import { storage } from "./storage";
import type { InsertDependency } from "@shared/schema";

// Enhanced AST node types
export interface ASTNode {
  type: string;
  value?: string;
  children: ASTNode[];
  location: {
    line: number;
    column: number;
    file?: string;
  };
  metadata?: Record<string, any>;
}

export interface ControlFlowNode {
  id: string;
  type: 'statement' | 'condition' | 'loop' | 'call' | 'return' | 'entry' | 'exit';
  statement?: string;
  condition?: string;
  location: {
    line: number;
    paragraph?: string;
    section?: string;
  };
  predecessors: string[];
  successors: string[];
  metadata?: Record<string, any>;
}

export interface ControlFlowGraph {
  nodes: Map<string, ControlFlowNode>;
  entryNode: string;
  exitNodes: string[];
  programId: number;
}

export interface DataFlow {
  variable: string;
  type: 'definition' | 'use' | 'modification';
  location: {
    line: number;
    paragraph?: string;
  };
  scope: string;
}

export interface ParsedCOBOLProgram {
  ast: ASTNode;
  cfg: ControlFlowGraph;
  dataFlows: DataFlow[];
  dependencies: ProgramDependency[];
  copybooks: CopybookReference[];
  metrics: CodeMetrics;
  businessRules: BusinessRuleCandidate[];
  qualityIssues: QualityIssue[];
}

export interface ProgramDependency {
  type: 'call' | 'copy' | 'include' | 'file-io' | 'database' | 'screen';
  target: string;
  location: {
    line: number;
    paragraph?: string;
  };
  direction: 'inbound' | 'outbound';
}

export interface CopybookReference {
  name: string;
  type: 'copy' | 'include';
  library?: string;
  location: {
    line: number;
    paragraph?: string;
  };
  resolved: boolean;
  content?: string;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  depthOfNesting: number;
  numberOfParagraphs: number;
  numberOfSections: number;
  halsteadMetrics: {
    vocabulary: number;
    length: number;
    difficulty: number;
    effort: number;
  };
}

export interface BusinessRuleCandidate {
  id: string;
  type: 'condition' | 'calculation' | 'validation' | 'decision';
  description: string;
  confidence: number; // 0-1
  location: {
    line: number;
    paragraph?: string;
  };
  variables: string[];
  conditions: string[];
  actions: string[];
  evidence: string[]; // Code snippets that support this rule
}

export interface QualityIssue {
  id: string;
  rule: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: 'bug' | 'vulnerability' | 'smell' | 'performance';
  message: string;
  location: {
    line: number;
    column?: number;
    paragraph?: string;
  };
  suggestion?: string;
}

// COBOL Dialect support
export enum COBOLDialect {
  IBM_ENTERPRISE = 'ibm-enterprise',
  MICRO_FOCUS = 'micro-focus',
  ACUCOBOL = 'acucobol',
  GNU_COBOL = 'gnu-cobol',
  FUJITSU = 'fujitsu',
  UNISYS = 'unisys'
}

export class EnhancedCOBOLParser {
  private dialect: COBOLDialect = COBOLDialect.IBM_ENTERPRISE;
  private sourceLines: string[] = [];
  private currentLine: number = 0;
  private ast: ASTNode | null = null;
  private cfg: ControlFlowGraph | null = null;
  private qualityRules: QualityRule[] = [];

  constructor(dialect: COBOLDialect = COBOLDialect.IBM_ENTERPRISE) {
    this.dialect = dialect;
    this.initializeQualityRules();
  }

  /**
   * Main parsing method that produces comprehensive analysis
   */
  async parseProgram(sourceCode: string, filename: string = ''): Promise<ParsedCOBOLProgram> {
    this.sourceLines = sourceCode.split('\n');
    this.currentLine = 0;

    // Build Abstract Syntax Tree
    this.ast = this.buildAST();

    // Generate Control Flow Graph
    this.cfg = this.generateCFG(this.ast);

    // Perform data flow analysis
    const dataFlows = this.analyzeDataFlow(this.ast);

    // Extract dependencies
    const dependencies = this.extractDependencies(this.ast);

    // Resolve copybooks
    const copybooks = await this.resolveCopybooks(this.ast);

    // Calculate metrics
    const metrics = this.calculateMetrics(this.ast, this.cfg);

    // Extract business rule candidates
    const businessRules = this.extractBusinessRuleCandidates(this.ast, this.cfg);

    // Run quality analysis
    const qualityIssues = this.runQualityAnalysis(this.ast);

    return {
      ast: this.ast,
      cfg: this.cfg,
      dataFlows,
      dependencies,
      copybooks,
      metrics,
      businessRules,
      qualityIssues
    };
  }

  /**
   * Build Abstract Syntax Tree from COBOL source
   */
  private buildAST(): ASTNode {
    const root: ASTNode = {
      type: 'program',
      children: [],
      location: { line: 1, column: 1 }
    };

    // Parse each division
    root.children.push(this.parseIdentificationDivision());
    root.children.push(this.parseEnvironmentDivision());
    root.children.push(this.parseDataDivision());
    root.children.push(this.parseProcedureDivision());

    return root;
  }

  /**
   * Generate Control Flow Graph from AST
   */
  private generateCFG(ast: ASTNode): ControlFlowGraph {
    const cfg: ControlFlowGraph = {
      nodes: new Map(),
      entryNode: 'entry',
      exitNodes: [],
      programId: 0 // Will be set by caller
    };

    // Create entry node
    cfg.nodes.set('entry', {
      id: 'entry',
      type: 'entry',
      statement: 'Program Start',
      location: { line: 1 },
      predecessors: [],
      successors: []
    });

    // Process procedure division to build CFG
    const procedureDiv = ast.children.find(child => child.type === 'procedure-division');
    if (procedureDiv) {
      this.buildCFGFromProcedure(procedureDiv, cfg);
    }

    return cfg;
  }

  /**
   * Analyze data flow through the program
   */
  private analyzeDataFlow(ast: ASTNode): DataFlow[] {
    const dataFlows: DataFlow[] = [];
    
    // Traverse AST to find variable definitions and uses
    this.traverseForDataFlow(ast, dataFlows);
    
    return dataFlows;
  }

  /**
   * Extract program dependencies (calls, copies, file I/O)
   */
  private extractDependencies(ast: ASTNode): ProgramDependency[] {
    const dependencies: ProgramDependency[] = [];
    
    // Find CALL statements
    this.findCalls(ast, dependencies);
    
    // Find COPY statements
    this.findCopyStatements(ast, dependencies);
    
    // Find file I/O operations
    this.findFileOperations(ast, dependencies);
    
    // Find database operations
    this.findDatabaseOperations(ast, dependencies);
    
    return dependencies;
  }

  /**
   * Resolve copybook references
   */
  private async resolveCopybooks(ast: ASTNode): Promise<CopybookReference[]> {
    const copybooks: CopybookReference[] = [];
    
    // Extract copybook references from AST
    this.findCopybookReferences(ast, copybooks);
    
    // Attempt to resolve each copybook
    for (const copybook of copybooks) {
      try {
        // In a real implementation, this would look up copybooks in libraries
        copybook.resolved = false; // Placeholder
      } catch (error) {
        copybook.resolved = false;
      }
    }
    
    return copybooks;
  }

  /**
   * Calculate code metrics
   */
  private calculateMetrics(ast: ASTNode, cfg: ControlFlowGraph): CodeMetrics {
    const linesOfCode = this.sourceLines.filter(line => 
      line.trim().length > 0 && !line.trim().startsWith('*')
    ).length;

    const cyclomaticComplexity = this.calculateCyclomaticComplexity(cfg);
    const cognitiveComplexity = this.calculateCognitiveComplexity(ast);
    const depthOfNesting = this.calculateNestingDepth(ast);
    const numberOfParagraphs = this.countElements(ast, 'paragraph');
    const numberOfSections = this.countElements(ast, 'section');
    const halsteadMetrics = this.calculateHalsteadMetrics(ast);

    return {
      linesOfCode,
      cyclomaticComplexity,
      cognitiveComplexity,
      depthOfNesting,
      numberOfParagraphs,
      numberOfSections,
      halsteadMetrics
    };
  }

  /**
   * Extract business rule candidates using heuristics
   */
  private extractBusinessRuleCandidates(ast: ASTNode, cfg: ControlFlowGraph): BusinessRuleCandidate[] {
    const candidates: BusinessRuleCandidate[] = [];
    
    // Find conditional statements
    this.findConditionalRules(ast, candidates);
    
    // Find calculation patterns
    this.findCalculationRules(ast, candidates);
    
    // Find validation patterns
    this.findValidationRules(ast, candidates);
    
    // Score candidates by confidence
    this.scoreBusinessRuleCandidates(candidates, cfg);
    
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Run quality analysis using predefined rules
   */
  private runQualityAnalysis(ast: ASTNode): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    for (const rule of this.qualityRules) {
      const ruleIssues = rule.check(ast, this.sourceLines);
      issues.push(...ruleIssues);
    }
    
    return issues;
  }

  // Helper methods for parsing specific divisions
  private parseIdentificationDivision(): ASTNode {
    const node: ASTNode = {
      type: 'identification-division',
      children: [],
      location: { line: this.currentLine, column: 1 }
    };

    // Find IDENTIFICATION DIVISION
    while (this.currentLine < this.sourceLines.length) {
      const line = this.sourceLines[this.currentLine].trim();
      if (line.match(/IDENTIFICATION\s+DIVISION/i)) {
        break;
      }
      this.currentLine++;
    }

    // Parse identification division content
    while (this.currentLine < this.sourceLines.length) {
      const line = this.sourceLines[this.currentLine].trim();
      
      if (line.match(/ENVIRONMENT\s+DIVISION/i) || 
          line.match(/DATA\s+DIVISION/i) || 
          line.match(/PROCEDURE\s+DIVISION/i)) {
        break;
      }
      
      if (line.match(/PROGRAM-ID\.\s+([A-Z0-9-]+)/i)) {
        const match = line.match(/PROGRAM-ID\.\s+([A-Z0-9-]+)/i);
        node.children.push({
          type: 'program-id',
          value: match ? match[1] : 'UNKNOWN',
          children: [],
          location: { line: this.currentLine + 1, column: 1 }
        });
      }
      
      this.currentLine++;
    }

    return node;
  }

  private parseEnvironmentDivision(): ASTNode {
    // Implementation for environment division parsing
    return {
      type: 'environment-division',
      children: [],
      location: { line: this.currentLine, column: 1 }
    };
  }

  private parseDataDivision(): ASTNode {
    // Implementation for data division parsing
    return {
      type: 'data-division',
      children: [],
      location: { line: this.currentLine, column: 1 }
    };
  }

  private parseProcedureDivision(): ASTNode {
    // Implementation for procedure division parsing
    return {
      type: 'procedure-division',
      children: [],
      location: { line: this.currentLine, column: 1 }
    };
  }

  // Helper methods for CFG construction
  private buildCFGFromProcedure(procedureDiv: ASTNode, cfg: ControlFlowGraph): void {
    // Implementation for building CFG from procedure division
  }

  // Helper methods for data flow analysis
  private traverseForDataFlow(node: ASTNode, dataFlows: DataFlow[]): void {
    // Implementation for traversing AST to find data flows
  }

  // Helper methods for dependency extraction
  private findCalls(ast: ASTNode, dependencies: ProgramDependency[]): void {
    // Implementation for finding CALL statements
  }

  private findCopyStatements(ast: ASTNode, dependencies: ProgramDependency[]): void {
    // Implementation for finding COPY statements
  }

  private findFileOperations(ast: ASTNode, dependencies: ProgramDependency[]): void {
    // Implementation for finding file I/O operations
  }

  private findDatabaseOperations(ast: ASTNode, dependencies: ProgramDependency[]): void {
    // Implementation for finding database operations
  }

  // Helper methods for copybook resolution
  private findCopybookReferences(ast: ASTNode, copybooks: CopybookReference[]): void {
    // Implementation for finding copybook references
  }

  // Helper methods for metrics calculation
  private calculateCyclomaticComplexity(cfg: ControlFlowGraph): number {
    // McCabe's cyclomatic complexity: M = E - N + 2P
    const edges = this.countCFGEdges(cfg);
    const nodes = cfg.nodes.size;
    const components = 1; // Assuming single connected component
    return edges - nodes + 2 * components;
  }

  private calculateCognitiveComplexity(ast: ASTNode): number {
    // Implementation for cognitive complexity calculation
    return 0; // Placeholder
  }

  private calculateNestingDepth(ast: ASTNode): number {
    // Implementation for nesting depth calculation
    return 0; // Placeholder
  }

  private countElements(ast: ASTNode, elementType: string): number {
    // Implementation for counting specific element types
    return 0; // Placeholder
  }

  private calculateHalsteadMetrics(ast: ASTNode): CodeMetrics['halsteadMetrics'] {
    // Implementation for Halstead metrics
    return {
      vocabulary: 0,
      length: 0,
      difficulty: 0,
      effort: 0
    };
  }

  private countCFGEdges(cfg: ControlFlowGraph): number {
    let edgeCount = 0;
    for (const node of cfg.nodes.values()) {
      edgeCount += node.successors.length;
    }
    return edgeCount;
  }

  // Helper methods for business rule extraction
  private findConditionalRules(ast: ASTNode, candidates: BusinessRuleCandidate[]): void {
    // Implementation for finding conditional business rules
  }

  private findCalculationRules(ast: ASTNode, candidates: BusinessRuleCandidate[]): void {
    // Implementation for finding calculation rules
  }

  private findValidationRules(ast: ASTNode, candidates: BusinessRuleCandidate[]): void {
    // Implementation for finding validation rules
  }

  private scoreBusinessRuleCandidates(candidates: BusinessRuleCandidate[], cfg: ControlFlowGraph): void {
    // Implementation for scoring business rule candidates
  }

  // Quality rules initialization
  private initializeQualityRules(): void {
    this.qualityRules = [
      new DeadCodeRule(),
      new ComplexityRule(),
      new NamingConventionRule(),
      new PerformanceRule(),
      new SecurityRule()
    ];
  }
}

// Quality rule interface and implementations
interface QualityRule {
  name: string;
  severity: QualityIssue['severity'];
  category: QualityIssue['category'];
  check(ast: ASTNode, sourceLines: string[]): QualityIssue[];
}

class DeadCodeRule implements QualityRule {
  name = 'dead-code';
  severity: QualityIssue['severity'] = 'major';
  category: QualityIssue['category'] = 'smell';

  check(ast: ASTNode, sourceLines: string[]): QualityIssue[] {
    // Implementation for dead code detection
    return [];
  }
}

class ComplexityRule implements QualityRule {
  name = 'complexity';
  severity: QualityIssue['severity'] = 'major';
  category: QualityIssue['category'] = 'smell';

  check(ast: ASTNode, sourceLines: string[]): QualityIssue[] {
    // Implementation for complexity checking
    return [];
  }
}

class NamingConventionRule implements QualityRule {
  name = 'naming-convention';
  severity: QualityIssue['severity'] = 'minor';
  category: QualityIssue['category'] = 'smell';

  check(ast: ASTNode, sourceLines: string[]): QualityIssue[] {
    // Implementation for naming convention checking
    return [];
  }
}

class PerformanceRule implements QualityRule {
  name = 'performance';
  severity: QualityIssue['severity'] = 'major';
  category: QualityIssue['category'] = 'performance';

  check(ast: ASTNode, sourceLines: string[]): QualityIssue[] {
    // Implementation for performance issue detection
    return [];
  }
}

class SecurityRule implements QualityRule {
  name = 'security';
  severity: QualityIssue['severity'] = 'critical';
  category: QualityIssue['category'] = 'vulnerability';

  check(ast: ASTNode, sourceLines: string[]): QualityIssue[] {
    // Implementation for security vulnerability detection
    return [];
  }
}

// Export the enhanced parser types and interfaces
export type { 
  ASTNode, 
  ControlFlowNode, 
  ParsedCOBOLProgram, 
  ProgramDependency, 
  CopybookReference, 
  CodeMetrics, 
  BusinessRuleCandidate as ParserBusinessRuleCandidate, 
  QualityIssue as ParserQualityIssue 
};