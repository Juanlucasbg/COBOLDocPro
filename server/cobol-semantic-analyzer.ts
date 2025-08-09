/*
Advanced COBOL Semantic Analysis Engine
Implements business-level comprehension: data lineage, call graphs, program flows, and rule extraction
Based on AST/ASG generation with copybook resolution and dialect support
*/

import type { StaticAnalysisResult, Program, Variable, Dependency, BusinessRule } from './cobol-analyzer';

export interface SemanticAnalysisResult {
  programModel: ProgramModel;
  callGraph: CallGraph;
  dataLineage: DataLineage;
  controlFlowGraph: ControlFlowGraph;
  businessRules: EnhancedBusinessRule[];
  fileIOMap: FileIOMap;
  copybookDependencies: CopybookDependency[];
  whereUsedIndex: WhereUsedIndex;
  sequenceFlow: SequenceFlow;
}

export interface SequenceFlow {
  participants: SequenceParticipant[];
  interactions: SequenceInteraction[];
  mermaidDiagram: string;
}

export interface SequenceParticipant {
  id: string;
  name: string;
  type: 'PROGRAM' | 'FILE' | 'DATABASE' | 'EXTERNAL_SYSTEM' | 'USER';
}

export interface SequenceInteraction {
  from: string;
  to: string;
  action: string;
  type: 'CALL' | 'READ' | 'WRITE' | 'RETURN' | 'CONDITION';
  order: number;
  description?: string;
}

export interface ProgramModel {
  programId: string;
  divisions: Division[];
  sections: Section[];
  paragraphs: ParagraphNode[];
  dataItems: DataItem[];
  fileDefinitions: FileDefinition[];
  linkageSection: LinkageSection;
  workingStorage: WorkingStorageSection;
}

export interface Division {
  name: 'IDENTIFICATION' | 'ENVIRONMENT' | 'DATA' | 'PROCEDURE';
  sections: Section[];
  metadata: {
    author?: string;
    dateWritten?: string;
    dateCompiled?: string;
    installation?: string;
    security?: string;
  };
}

export interface Section {
  name: string;
  division: string;
  paragraphs: ParagraphNode[];
  lineNumber: number;
  purpose?: string;
}

export interface ParagraphNode {
  name: string;
  section?: string;
  lineNumber: number;
  statements: StatementNode[];
  controlFlow: {
    entry: boolean;
    exit: boolean;
    performedBy: string[];
    performs: string[];
    gotos: string[];
  };
  businessLogic?: string;
}

export interface StatementNode {
  type: string;
  lineNumber: number;
  content: string;
  semanticInfo: {
    dataReferences: string[];
    fileOperations: FileOperation[];
    conditionalLogic?: ConditionalLogic;
    computations?: Computation[];
  };
}

export interface DataItem {
  name: string;
  level: number;
  picture?: string;
  usage?: string;
  value?: string;
  occurs?: number;
  redefines?: string;
  parent?: string;
  children: string[];
  lineNumber: number;
  section: 'WORKING-STORAGE' | 'LINKAGE' | 'FILE' | 'LOCAL-STORAGE';
  dataType: 'ALPHANUMERIC' | 'NUMERIC' | 'SIGNED_NUMERIC' | 'DECIMAL' | 'COMP' | 'COMP-3' | 'BINARY';
  length: number;
  editMask?: string;
}

export interface FileDefinition {
  fileName: string;
  selectName: string;
  organization: 'SEQUENTIAL' | 'INDEXED' | 'RELATIVE' | 'LINE_SEQUENTIAL';
  accessMode: 'SEQUENTIAL' | 'RANDOM' | 'DYNAMIC';
  recordDescription: DataItem[];
  keyFields?: string[];
  alternateKeys?: string[];
  status?: string;
}

export interface LinkageSection {
  parameters: DataItem[];
  totalLength: number;
  callingConvention?: string;
}

export interface WorkingStorageSection {
  items: DataItem[];
  constants: { name: string; value: string; type: string }[];
  flags: { name: string; values: string[]; purpose?: string }[];
}

export interface CallGraph {
  nodes: CallGraphNode[];
  edges: CallGraphEdge[];
  entryPoints: string[];
  unresolvedCalls: string[];
}

export interface CallGraphNode {
  programId: string;
  type: 'MAIN' | 'SUBPROGRAM' | 'FUNCTION' | 'EXTERNAL';
  interfaces: {
    linkage: DataItem[];
    using: string[];
    giving?: string;
  };
  externalDependencies: string[];
}

export interface CallGraphEdge {
  from: string;
  to: string;
  callType: 'STATIC' | 'DYNAMIC';
  parameters?: string[];
  location: { paragraph: string; lineNumber: number };
}

export interface DataLineage {
  flows: DataFlow[];
  transformations: DataTransformation[];
  sources: DataSource[];
  sinks: DataSink[];
}

export interface DataFlow {
  sourceField: string;
  targetField: string;
  transformation: 'MOVE' | 'COMPUTE' | 'STRING' | 'UNSTRING' | 'INSPECT' | 'REFERENCE_MODIFICATION';
  location: { paragraph: string; lineNumber: number };
  conditions?: string[];
}

export interface DataTransformation {
  operation: string;
  inputFields: string[];
  outputFields: string[];
  formula?: string;
  businessRule?: string;
  location: { paragraph: string; lineNumber: number };
}

export interface DataSource {
  field: string;
  sourceType: 'FILE_INPUT' | 'LINKAGE' | 'LITERAL' | 'COMPUTED';
  sourceDetail?: string;
}

export interface DataSink {
  field: string;
  sinkType: 'FILE_OUTPUT' | 'LINKAGE' | 'DISPLAY' | 'CALL_PARAMETER';
  sinkDetail?: string;
}

export interface ControlFlowGraph {
  nodes: CFGNode[];
  edges: CFGEdge[];
  cyclomaticComplexity: number;
  entryPoints: string[];
  exitPoints: string[];
}

export interface CFGNode {
  id: string;
  type: 'PARAGRAPH' | 'STATEMENT' | 'CONDITION' | 'DECISION';
  label: string;
  lineNumber: number;
  statements?: string[];
}

export interface CFGEdge {
  from: string;
  to: string;
  condition?: string;
  type: 'SEQUENCE' | 'PERFORM' | 'GOTO' | 'IF_TRUE' | 'IF_FALSE' | 'CALL';
}

export interface EnhancedBusinessRule {
  id: string;
  type: 'VALIDATION' | 'CALCULATION' | 'DECISION' | 'CONSTRAINT' | 'TRANSFORMATION' | 'AUDIT';
  category: 'FINANCIAL' | 'REGULATORY' | 'OPERATIONAL' | 'TECHNICAL' | 'QUALITY';
  description: string;
  naturalLanguage: string;
  conditions: Condition[];
  actions: Action[];
  dataInvolved: string[];
  location: { program: string; paragraph: string; lineNumber: number };
  confidence: number;
  businessImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  dependencies: string[];
}

export interface Condition {
  field: string;
  operator: string;
  value: string;
  logicalOperator?: 'AND' | 'OR' | 'NOT';
}

export interface Action {
  type: 'SET' | 'COMPUTE' | 'DISPLAY' | 'CALL' | 'PERFORM' | 'MOVE';
  target?: string;
  value?: string;
  parameters?: string[];
}

export interface FileIOMap {
  fileOperations: FileOperationDetail[];
  crudMatrix: CRUDMatrix;
  fileRelationships: FileRelationship[];
}

export interface FileOperationDetail {
  fileName: string;
  operation: 'READ' | 'WRITE' | 'REWRITE' | 'DELETE' | 'START' | 'OPEN' | 'CLOSE';
  location: { program: string; paragraph: string; lineNumber: number };
  recordType?: string;
  keyFields?: string[];
  conditions?: string[];
}

export interface CRUDMatrix {
  [fileName: string]: {
    create: string[];
    read: string[];
    update: string[];
    delete: string[];
  };
}

export interface FileRelationship {
  primaryFile: string;
  relatedFile: string;
  relationship: 'MASTER_DETAIL' | 'LOOKUP' | 'REFERENCE' | 'TRANSACTION';
  keyFields: string[];
}

export interface CopybookDependency {
  copybookName: string;
  usedBy: string[];
  defines: string[];
  level: number;
  dependencies: string[];
  fingerprint: string;
}

export interface WhereUsedIndex {
  dataItems: { [fieldName: string]: Reference[] };
  paragraphs: { [paragraphName: string]: Reference[] };
  copybooks: { [copybookName: string]: Reference[] };
  files: { [fileName: string]: Reference[] };
}

export interface Reference {
  program: string;
  location: string;
  lineNumber: number;
  context: 'READ' | 'WRITE' | 'CONDITION' | 'COMPUTE' | 'PERFORM' | 'CALL';
}

export interface FileOperation {
  type: 'READ' | 'WRITE' | 'REWRITE' | 'DELETE' | 'OPEN' | 'CLOSE';
  fileName: string;
  recordName?: string;
  keyField?: string;
}

export interface ConditionalLogic {
  conditions: string[];
  operator: 'AND' | 'OR' | 'NOT';
  truthPath?: string;
  falsePath?: string;
}

export interface Computation {
  operation: 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE' | 'COMPUTE';
  operands: string[];
  result: string;
  formula?: string;
}

export class COBOLSemanticAnalyzer {
  
  async analyzeSemantics(staticResults: StaticAnalysisResult[]): Promise<SemanticAnalysisResult[]> {
    const results: SemanticAnalysisResult[] = [];
    
    for (const staticResult of staticResults) {
      const semanticResult = await this.analyzeSingleProgram(staticResult);
      results.push(semanticResult);
    }
    
    return results;
  }
  
  private async analyzeSingleProgram(staticResult: StaticAnalysisResult): Promise<SemanticAnalysisResult> {
    const programModel = this.buildProgramModel(staticResult);
    const callGraph = this.extractCallGraph(staticResult, programModel);
    const dataLineage = this.extractDataLineage(staticResult, programModel);
    const controlFlowGraph = this.buildControlFlowGraph(staticResult, programModel);
    const businessRules = this.extractEnhancedBusinessRules(staticResult, programModel);
    const fileIOMap = this.buildFileIOMap(staticResult, programModel);
    const copybookDependencies = this.analyzeCopybookDependencies(staticResult);
    const whereUsedIndex = this.buildWhereUsedIndex(staticResult, programModel);
    
    return {
      programModel,
      callGraph,
      dataLineage,
      controlFlowGraph,
      businessRules,
      fileIOMap,
      copybookDependencies,
      whereUsedIndex,
      sequenceFlow: this.generateSequenceFlow(programModel, callGraph, fileIOMap)
    };
  }
  
  private buildProgramModel(staticResult: StaticAnalysisResult): ProgramModel {
    const program = staticResult.programs[0];
    if (!program) {
      // Create a minimal program model from the static result
      return this.createMinimalProgramModel(staticResult);
    }
    
    // Build enhanced data items with hierarchy
    const dataItems = this.buildDataItemHierarchy(program.variables);
    
    // Extract file definitions
    const fileDefinitions = this.extractFileDefinitions(program);
    
    // Build linkage and working storage sections
    const linkageSection = this.extractLinkageSection(dataItems);
    const workingStorage = this.extractWorkingStorageSection(dataItems);
    
    // Enhanced paragraphs with control flow
    const paragraphs = program.paragraphs.map(p => ({
      name: p.name,
      lineNumber: p.lineNumber,
      statements: p.statements.map(s => ({
        type: s.type,
        lineNumber: s.lineNumber,
        content: s.content,
        semanticInfo: {
          dataReferences: s.variables || [],
          fileOperations: this.extractFileOperations(s),
          conditionalLogic: this.extractConditionalLogic(s),
          computations: this.extractComputations(s)
        }
      })),
      controlFlow: {
        entry: p.name === 'MAIN' || p.lineNumber === 1,
        exit: false,
        performedBy: [],
        performs: this.extractPerforms(p),
        gotos: this.extractGotos(p)
      }
    }));
    
    return {
      programId: program.name,
      divisions: this.extractDivisions(program),
      sections: program.sections.map(s => ({
        name: s.name,
        division: 'PROCEDURE',
        paragraphs: paragraphs.filter(p => 
          s.paragraphs.some(sp => sp.name === p.name)
        ),
        lineNumber: s.lineNumber
      })),
      paragraphs,
      dataItems,
      fileDefinitions,
      linkageSection,
      workingStorage
    };
  }
  
  private buildDataItemHierarchy(variables: Variable[]): DataItem[] {
    return variables.map(v => ({
      name: v.name,
      level: v.level,
      picture: v.picture,
      usage: v.usage,
      value: v.value,
      occurs: v.occurs,
      redefines: v.redefines,
      parent: this.findParent(v, variables),
      children: this.findChildren(v, variables),
      lineNumber: v.lineNumber,
      section: this.determineSection(v),
      dataType: this.inferDataType(v.picture || ''),
      length: this.calculateLength(v.picture || ''),
      editMask: this.extractEditMask(v.picture || '')
    }));
  }
  
  private findParent(variable: Variable, allVariables: Variable[]): string | undefined {
    const parentLevel = variable.level - 1;
    for (let i = allVariables.indexOf(variable) - 1; i >= 0; i--) {
      if (allVariables[i].level === parentLevel) {
        return allVariables[i].name;
      }
      if (allVariables[i].level < parentLevel) {
        break;
      }
    }
    return undefined;
  }
  
  private findChildren(variable: Variable, allVariables: Variable[]): string[] {
    const children: string[] = [];
    const currentIndex = allVariables.indexOf(variable);
    
    for (let i = currentIndex + 1; i < allVariables.length; i++) {
      if (allVariables[i].level <= variable.level) {
        break;
      }
      if (allVariables[i].level === variable.level + 1) {
        children.push(allVariables[i].name);
      }
    }
    
    return children;
  }
  
  private determineSection(variable: Variable): 'WORKING-STORAGE' | 'LINKAGE' | 'FILE' | 'LOCAL-STORAGE' {
    // This would be enhanced with actual parsing context
    if (variable.level === 1 || variable.level === 77) {
      return 'WORKING-STORAGE';
    }
    return 'WORKING-STORAGE';
  }
  
  private inferDataType(picture: string): 'ALPHANUMERIC' | 'NUMERIC' | 'SIGNED_NUMERIC' | 'DECIMAL' | 'COMP' | 'COMP-3' | 'BINARY' {
    if (!picture) return 'ALPHANUMERIC';
    
    if (picture.includes('X')) return 'ALPHANUMERIC';
    if (picture.includes('9')) {
      if (picture.includes('S')) return 'SIGNED_NUMERIC';
      if (picture.includes('V') || picture.includes('.')) return 'DECIMAL';
      return 'NUMERIC';
    }
    
    return 'ALPHANUMERIC';
  }
  
  private calculateLength(picture: string): number {
    // Simplified length calculation
    const match = picture.match(/(\d+)/);
    return match ? parseInt(match[1]) : picture.length;
  }
  
  private extractEditMask(picture: string): string | undefined {
    if (picture.includes('Z') || picture.includes('*') || picture.includes(',') || picture.includes('.')) {
      return picture;
    }
    return undefined;
  }
  
  private extractFileDefinitions(program: Program): FileDefinition[] {
    return program.fileControls.map(fc => ({
      fileName: fc.fileName || fc.name,
      selectName: fc.name,
      organization: fc.organization as any || 'SEQUENTIAL',
      accessMode: fc.accessMode as any || 'SEQUENTIAL',
      recordDescription: [],
      status: fc.selectStatus
    }));
  }
  
  private extractLinkageSection(dataItems: DataItem[]): LinkageSection {
    const linkageItems = dataItems.filter(item => item.section === 'LINKAGE');
    return {
      parameters: linkageItems,
      totalLength: linkageItems.reduce((sum, item) => sum + item.length, 0)
    };
  }
  
  private extractWorkingStorageSection(dataItems: DataItem[]): WorkingStorageSection {
    const wsItems = dataItems.filter(item => item.section === 'WORKING-STORAGE');
    const constants = wsItems.filter(item => item.value).map(item => ({
      name: item.name,
      value: item.value!,
      type: item.dataType
    }));
    
    return {
      items: wsItems,
      constants,
      flags: this.extractFlags(wsItems)
    };
  }
  
  private extractFlags(items: DataItem[]): { name: string; values: string[]; purpose?: string }[] {
    // Look for items that might be flags (level 88 values, etc.)
    return items
      .filter(item => item.level === 88 || (item.value && item.dataType === 'ALPHANUMERIC'))
      .map(item => ({
        name: item.name,
        values: item.value ? [item.value] : [],
        purpose: this.inferFlagPurpose(item.name)
      }));
  }
  
  private inferFlagPurpose(flagName: string): string | undefined {
    const name = flagName.toLowerCase();
    if (name.includes('error') || name.includes('err')) return 'Error handling';
    if (name.includes('eof') || name.includes('end')) return 'End of file';
    if (name.includes('found') || name.includes('exists')) return 'Record existence';
    if (name.includes('valid') || name.includes('invalid')) return 'Validation';
    return undefined;
  }
  
  private extractDivisions(program: Program): Division[] {
    return [{
      name: program.division,
      sections: [],
      metadata: {
        author: program.author,
        dateWritten: program.dateWritten,
        dateCompiled: program.dateCompiled
      }
    }];
  }
  
  private extractFileOperations(statement: any): FileOperation[] {
    const operations: FileOperation[] = [];
    const content = statement.content.toUpperCase();
    
    if (content.includes('READ ')) {
      const match = content.match(/READ\s+([A-Z0-9-_]+)/);
      if (match) {
        operations.push({
          type: 'READ',
          fileName: match[1]
        });
      }
    }
    
    if (content.includes('WRITE ')) {
      const match = content.match(/WRITE\s+([A-Z0-9-_]+)/);
      if (match) {
        operations.push({
          type: 'WRITE',
          fileName: match[1]
        });
      }
    }
    
    return operations;
  }
  
  private extractConditionalLogic(statement: any): ConditionalLogic | undefined {
    const content = statement.content.toUpperCase();
    
    if (content.includes('IF ')) {
      const conditions = this.parseConditions(content);
      return {
        conditions,
        operator: content.includes(' AND ') ? 'AND' : content.includes(' OR ') ? 'OR' : 'AND'
      };
    }
    
    return undefined;
  }
  
  private parseConditions(content: string): string[] {
    // Simplified condition parsing
    const ifMatch = content.match(/IF\s+(.+?)(?:\s+THEN|\s+$)/);
    if (ifMatch) {
      return [ifMatch[1].trim()];
    }
    return [];
  }
  
  private extractComputations(statement: any): Computation[] {
    const computations: Computation[] = [];
    const content = statement.content.toUpperCase();
    
    if (content.includes('COMPUTE ')) {
      const match = content.match(/COMPUTE\s+([A-Z0-9-_]+)\s*=\s*(.+)/);
      if (match) {
        computations.push({
          operation: 'COMPUTE',
          operands: this.parseOperands(match[2]),
          result: match[1],
          formula: match[2]
        });
      }
    }
    
    return computations;
  }
  
  private parseOperands(formula: string): string[] {
    // Extract variable names from formula
    return formula.match(/[A-Z][A-Z0-9-_]*/g) || [];
  }
  
  private extractPerforms(paragraph: any): string[] {
    const performs: string[] = [];
    
    for (const statement of paragraph.statements) {
      const content = statement.content.toUpperCase();
      if (content.includes('PERFORM ')) {
        const match = content.match(/PERFORM\s+([A-Z0-9-_]+)/);
        if (match) {
          performs.push(match[1]);
        }
      }
    }
    
    return performs;
  }
  
  private extractGotos(paragraph: any): string[] {
    const gotos: string[] = [];
    
    for (const statement of paragraph.statements) {
      const content = statement.content.toUpperCase();
      if (content.includes('GO TO ') || content.includes('GOTO ')) {
        const match = content.match(/GO\s*TO\s+([A-Z0-9-_]+)/);
        if (match) {
          gotos.push(match[1]);
        }
      }
    }
    
    return gotos;
  }
  
  private extractCallGraph(staticResult: StaticAnalysisResult, programModel: ProgramModel): CallGraph {
    const nodes: CallGraphNode[] = [];
    const edges: CallGraphEdge[] = [];
    const unresolvedCalls: string[] = [];
    
    // Add main program node
    nodes.push({
      programId: programModel.programId,
      type: 'MAIN',
      interfaces: {
        linkage: programModel.linkageSection.parameters,
        using: []
      },
      externalDependencies: []
    });
    
    // Extract call edges from dependencies
    for (const dep of staticResult.dependencies) {
      if (dep.type === 'CALL') {
        edges.push({
          from: programModel.programId,
          to: dep.to,
          callType: 'STATIC',
          location: { paragraph: 'UNKNOWN', lineNumber: dep.lineNumber || 0 }
        });
        
        // Add target node if not exists
        if (!nodes.find(n => n.programId === dep.to)) {
          nodes.push({
            programId: dep.to,
            type: 'SUBPROGRAM',
            interfaces: { linkage: [], using: [] },
            externalDependencies: []
          });
        }
      }
    }
    
    return {
      nodes,
      edges,
      entryPoints: [programModel.programId],
      unresolvedCalls
    };
  }
  
  private extractDataLineage(staticResult: StaticAnalysisResult, programModel: ProgramModel): DataLineage {
    const flows: DataFlow[] = [];
    const transformations: DataTransformation[] = [];
    const sources: DataSource[] = [];
    const sinks: DataSink[] = [];
    
    // Analyze MOVE statements for data flows
    for (const paragraph of programModel.paragraphs) {
      for (const statement of paragraph.statements) {
        if (statement.type === 'MOVE') {
          const moveFlow = this.parseMoveStatement(statement, paragraph.name);
          if (moveFlow) {
            flows.push(moveFlow);
          }
        }
        
        if (statement.type === 'COMPUTE') {
          const computation = this.parseComputeStatement(statement, paragraph.name);
          if (computation) {
            transformations.push(computation);
          }
        }
      }
    }
    
    return { flows, transformations, sources, sinks };
  }
  
  private parseMoveStatement(statement: any, paragraphName: string): DataFlow | null {
    const content = statement.content.toUpperCase();
    const match = content.match(/MOVE\s+([A-Z0-9-_]+)\s+TO\s+([A-Z0-9-_]+)/);
    
    if (match) {
      return {
        sourceField: match[1],
        targetField: match[2],
        transformation: 'MOVE',
        location: { paragraph: paragraphName, lineNumber: statement.lineNumber }
      };
    }
    
    return null;
  }
  
  private parseComputeStatement(statement: any, paragraphName: string): DataTransformation | null {
    const content = statement.content.toUpperCase();
    const match = content.match(/COMPUTE\s+([A-Z0-9-_]+)\s*=\s*(.+)/);
    
    if (match) {
      return {
        operation: 'COMPUTE',
        inputFields: this.parseOperands(match[2]),
        outputFields: [match[1]],
        formula: match[2],
        location: { paragraph: paragraphName, lineNumber: statement.lineNumber }
      };
    }
    
    return null;
  }
  
  private buildControlFlowGraph(staticResult: StaticAnalysisResult, programModel: ProgramModel): ControlFlowGraph {
    const nodes: CFGNode[] = [];
    const edges: CFGEdge[] = [];
    
    // Create nodes for each paragraph
    for (const paragraph of programModel.paragraphs) {
      nodes.push({
        id: paragraph.name,
        type: 'PARAGRAPH',
        label: paragraph.name,
        lineNumber: paragraph.lineNumber,
        statements: paragraph.statements.map(s => s.content)
      });
    }
    
    // Create edges based on control flow
    for (const paragraph of programModel.paragraphs) {
      // PERFORM edges
      for (const performed of paragraph.controlFlow.performs) {
        edges.push({
          from: paragraph.name,
          to: performed,
          type: 'PERFORM'
        });
      }
      
      // GOTO edges
      for (const target of paragraph.controlFlow.gotos) {
        edges.push({
          from: paragraph.name,
          to: target,
          type: 'GOTO'
        });
      }
    }
    
    return {
      nodes,
      edges,
      cyclomaticComplexity: this.calculateCyclomaticComplexity(nodes, edges),
      entryPoints: [programModel.programId],
      exitPoints: []
    };
  }
  
  private calculateCyclomaticComplexity(nodes: CFGNode[], edges: CFGEdge[]): number {
    // V(G) = E - N + 2P where E = edges, N = nodes, P = connected components
    const E = edges.length;
    const N = nodes.length;
    const P = 1; // Assuming single connected component
    
    return E - N + 2 * P;
  }
  
  private extractEnhancedBusinessRules(staticResult: StaticAnalysisResult, programModel: ProgramModel): EnhancedBusinessRule[] {
    const rules: EnhancedBusinessRule[] = [];
    
    for (const paragraph of programModel.paragraphs) {
      for (const statement of paragraph.statements) {
        if (statement.semanticInfo.conditionalLogic) {
          const rule = this.createBusinessRuleFromCondition(statement, paragraph, programModel.programId);
          if (rule) {
            rules.push(rule);
          }
        }
        
        if (statement.semanticInfo.computations && statement.semanticInfo.computations.length > 0) {
          const rule = this.createBusinessRuleFromComputation(statement, paragraph, programModel.programId);
          if (rule) {
            rules.push(rule);
          }
        }
      }
    }
    
    return rules;
  }
  
  private createBusinessRuleFromCondition(statement: any, paragraph: any, programId: string): EnhancedBusinessRule | null {
    const conditions = statement.semanticInfo.conditionalLogic.conditions;
    
    return {
      id: `BR-${programId}-${paragraph.name}-${statement.lineNumber}`,
      type: 'DECISION',
      category: this.inferBusinessCategory(statement.content),
      description: `Conditional logic in ${paragraph.name}`,
      naturalLanguage: this.generateNaturalLanguage(statement.content),
      conditions: conditions.map((c: string) => this.parseCondition(c)),
      actions: [],
      dataInvolved: statement.semanticInfo.dataReferences,
      location: { program: programId, paragraph: paragraph.name, lineNumber: statement.lineNumber },
      confidence: 0.8,
      businessImpact: this.assessBusinessImpact(statement.content),
      dependencies: []
    };
  }
  
  private createBusinessRuleFromComputation(statement: any, paragraph: any, programId: string): EnhancedBusinessRule | null {
    const computation = statement.semanticInfo.computations[0];
    
    return {
      id: `BR-${programId}-${paragraph.name}-${statement.lineNumber}`,
      type: 'CALCULATION',
      category: this.inferBusinessCategory(statement.content),
      description: `Calculation: ${computation.formula}`,
      naturalLanguage: this.generateCalculationDescription(computation),
      conditions: [],
      actions: [{
        type: 'COMPUTE',
        target: computation.result,
        value: computation.formula
      }],
      dataInvolved: [...computation.operands, computation.result],
      location: { program: programId, paragraph: paragraph.name, lineNumber: statement.lineNumber },
      confidence: 0.9,
      businessImpact: this.assessBusinessImpact(statement.content),
      dependencies: computation.operands
    };
  }
  
  private inferBusinessCategory(content: string): 'FINANCIAL' | 'REGULATORY' | 'OPERATIONAL' | 'TECHNICAL' | 'QUALITY' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('amount') || lowerContent.includes('total') || lowerContent.includes('balance')) {
      return 'FINANCIAL';
    }
    if (lowerContent.includes('valid') || lowerContent.includes('check') || lowerContent.includes('error')) {
      return 'QUALITY';
    }
    if (lowerContent.includes('date') || lowerContent.includes('time') || lowerContent.includes('status')) {
      return 'OPERATIONAL';
    }
    
    return 'TECHNICAL';
  }
  
  private generateNaturalLanguage(content: string): string {
    // Simplified natural language generation
    return `When ${content.toLowerCase()}, the system performs the specified action.`;
  }
  
  private generateCalculationDescription(computation: any): string {
    return `Calculate ${computation.result} by evaluating the formula: ${computation.formula}`;
  }
  
  private assessBusinessImpact(content: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('critical') || lowerContent.includes('error') || lowerContent.includes('total')) {
      return 'HIGH';
    }
    if (lowerContent.includes('check') || lowerContent.includes('valid')) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }
  
  private parseCondition(conditionText: string): Condition {
    // Simplified condition parsing
    const parts = conditionText.split(/\s*(=|>|<|NOT|EQUAL)\s*/);
    return {
      field: parts[0] || '',
      operator: parts[1] || '=',
      value: parts[2] || ''
    };
  }
  
  private buildFileIOMap(staticResult: StaticAnalysisResult, programModel: ProgramModel): FileIOMap {
    const fileOperations: FileOperationDetail[] = [];
    const crudMatrix: CRUDMatrix = {};
    
    for (const paragraph of programModel.paragraphs) {
      for (const statement of paragraph.statements) {
        for (const fileOp of statement.semanticInfo.fileOperations) {
          fileOperations.push({
            fileName: fileOp.fileName,
            operation: fileOp.type,
            location: { program: programModel.programId, paragraph: paragraph.name, lineNumber: statement.lineNumber },
            recordType: fileOp.recordName,
            keyFields: fileOp.keyField ? [fileOp.keyField] : []
          });
          
          // Update CRUD matrix
          if (!crudMatrix[fileOp.fileName]) {
            crudMatrix[fileOp.fileName] = { create: [], read: [], update: [], delete: [] };
          }
          
          switch (fileOp.type) {
            case 'write':
              crudMatrix[fileOp.fileName].create.push(programModel.programId);
              break;
            case 'read':
              crudMatrix[fileOp.fileName].read.push(programModel.programId);
              break;
            case 'rewrite':
              crudMatrix[fileOp.fileName].update.push(programModel.programId);
              break;
            case 'delete':
              crudMatrix[fileOp.fileName].delete.push(programModel.programId);
              break;
          }
        }
      }
    }
    
    return {
      fileOperations,
      crudMatrix,
      fileRelationships: []
    };
  }
  
  private analyzeCopybookDependencies(staticResult: StaticAnalysisResult): CopybookDependency[] {
    return staticResult.copybooks.map(copybook => ({
      copybookName: copybook.name,
      usedBy: copybook.usedBy,
      defines: copybook.variables.map(v => v.name),
      level: 1,
      dependencies: [],
      fingerprint: this.generateFingerprint(copybook.name)
    }));
  }
  
  private generateFingerprint(name: string): string {
    // Simple fingerprint generation
    return Buffer.from(name).toString('base64').substring(0, 8);
  }
  
  private buildWhereUsedIndex(staticResult: StaticAnalysisResult, programModel: ProgramModel): WhereUsedIndex {
    const dataItems: { [fieldName: string]: Reference[] } = {};
    const paragraphs: { [paragraphName: string]: Reference[] } = {};
    const copybooks: { [copybookName: string]: Reference[] } = {};
    const files: { [fileName: string]: Reference[] } = {};
    
    // Build data item references
    for (const paragraph of programModel.paragraphs) {
      for (const statement of paragraph.statements) {
        for (const dataRef of statement.semanticInfo.dataReferences) {
          if (!dataItems[dataRef]) {
            dataItems[dataRef] = [];
          }
          dataItems[dataRef].push({
            program: programModel.programId,
            location: paragraph.name,
            lineNumber: statement.lineNumber,
            context: this.determineContext(statement)
          });
        }
      }
    }
    
    return { dataItems, paragraphs, copybooks, files };
  }
  
  private determineContext(statement: any): 'READ' | 'WRITE' | 'CONDITION' | 'COMPUTE' | 'PERFORM' | 'CALL' {
    const type = statement.type.toUpperCase();
    
    if (['READ', 'WRITE', 'REWRITE'].includes(type)) return type.toLowerCase() as any;
    if (type === 'IF') return 'CONDITION';
    if (type === 'COMPUTE' || type === 'ADD' || type === 'SUBTRACT') return 'COMPUTE';
    if (type === 'PERFORM') return 'PERFORM';
    if (type === 'CALL') return 'CALL';
    
    return 'READ';
  }

  private createMinimalProgramModel(staticResult: StaticAnalysisResult): ProgramModel {
    // Create a minimal program model when no programs are found
    // This handles cases where repository analysis finds files but no valid COBOL programs
    
    const programId = staticResult.fileName.replace(/\.(cbl|cob|cobol)$/i, '');
    
    return {
      programId,
      divisions: [{
        name: 'IDENTIFICATION',
        sections: [],
        metadata: {}
      }],
      sections: [],
      paragraphs: [],
      dataItems: staticResult.dataElements.map(de => ({
        name: de.name,
        level: de.level || 1,
        picture: de.picture,
        usage: de.usage,
        value: de.value,
        occurs: de.occurs,
        redefines: de.redefines,
        parent: undefined,
        children: [],
        lineNumber: de.lineNumber || 1,
        section: 'WORKING-STORAGE' as const,
        dataType: this.inferDataType(de.picture || ''),
        length: this.calculateLength(de.picture || ''),
        editMask: this.extractEditMask(de.picture || '')
      })),
      fileDefinitions: [],
      linkageSection: {
        parameters: [],
        totalLength: 0
      },
      workingStorage: {
        items: [],
        constants: [],
        flags: []
      }
    };
  }

  private generateSequenceFlow(programModel: ProgramModel, callGraph: CallGraph, fileIOMap: FileIOMap): SequenceFlow {
    const participants: SequenceParticipant[] = [];
    const interactions: SequenceInteraction[] = [];
    
    // Add main program as participant
    participants.push({
      id: programModel.programId,
      name: programModel.programId,
      type: 'PROGRAM'
    });
    
    // Add called programs as participants
    callGraph.edges.forEach(edge => {
      if (!participants.find(p => p.id === edge.to)) {
        participants.push({
          id: edge.to,
          name: edge.to,
          type: 'PROGRAM'
        });
      }
    });
    
    // Add files as participants
    const fileNames = new Set<string>();
    fileIOMap.fileOperations.forEach(op => {
      if (!fileNames.has(op.fileName)) {
        fileNames.add(op.fileName);
        participants.push({
          id: op.fileName,
          name: op.fileName,
          type: 'FILE'
        });
      }
    });
    
    // Add user/system participant
    participants.unshift({
      id: 'USER',
      name: 'User/System',
      type: 'USER'
    });
    
    let order = 1;
    
    // Program initiation
    interactions.push({
      from: 'USER',
      to: programModel.programId,
      action: 'Execute Program',
      type: 'CALL',
      order: order++
    });
    
    // Program calls
    callGraph.edges.forEach(edge => {
      interactions.push({
        from: edge.from,
        to: edge.to,
        action: `CALL "${edge.to}"`,
        type: 'CALL',
        order: order++,
        description: `Called from ${edge.location.paragraph}`
      });
      
      interactions.push({
        from: edge.to,
        to: edge.from,
        action: 'Return',
        type: 'RETURN',
        order: order++
      });
    });
    
    // File operations
    fileIOMap.fileOperations.forEach(op => {
      if (op.operation === 'read') {
        interactions.push({
          from: programModel.programId,
          to: op.fileName,
          action: `READ ${op.recordType || 'record'}`,
          type: 'read',
          order: order++
        });
      } else if (op.operation === 'write') {
        interactions.push({
          from: programModel.programId,
          to: op.fileName,
          action: `WRITE ${op.recordType || 'record'}`,
          type: 'WRITE',
          order: order++
        });
      }
    });
    
    // Generate Mermaid diagram
    const mermaidDiagram = this.generateMermaidSequence(participants, interactions);
    
    return {
      participants,
      interactions,
      mermaidDiagram
    };
  }
  
  private generateMermaidSequence(participants: SequenceParticipant[], interactions: SequenceInteraction[]): string {
    let mermaid = 'sequenceDiagram\n';
    
    // Add participants
    participants.forEach(participant => {
      mermaid += `    participant ${participant.id} as ${participant.name}\n`;
    });
    
    // Sort interactions by order
    const sortedInteractions = interactions.sort((a, b) => a.order - b.order);
    
    // Add interactions
    sortedInteractions.forEach(interaction => {
      const arrow = interaction.type === 'RETURN' ? '-->' : '->>';
      mermaid += `    ${interaction.from}${arrow}${interaction.to}: ${interaction.action}\n`;
      
      if (interaction.description) {
        mermaid += `    Note over ${interaction.to}: ${interaction.description}\n`;
      }
    });
    
    return mermaid;
  }
}