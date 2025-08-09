import type { CobolProgram, Dependency } from "@shared/schema";
import type { ProgramDependency, ParsedProgram } from "./cobol-parser";

interface DependencyNode {
  id: string;
  programId: number;
  name: string;
  type: 'main' | 'subroutine' | 'copybook' | 'jcl';
  level: number;
  complexity: number;
  dependencies: string[];
  dependents: string[];
  isCritical: boolean;
  isCircular: boolean;
  metadata: {
    linesOfCode: number;
    lastModified: Date;
    author?: string;
    version?: string;
  };
}

interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  type: 'call' | 'copy' | 'data_flow' | 'control_flow';
  weight: number;
  isCritical: boolean;
  isCircular: boolean;
  lineNumber?: number;
  context?: string;
  parameters?: string[];
}

interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, DependencyEdge>;
  cycles: DependencyCycle[];
  criticalPaths: CriticalPath[];
  metrics: DependencyMetrics;
}

interface DependencyCycle {
  id: string;
  nodes: string[];
  edges: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  suggestion?: string;
}

interface CriticalPath {
  id: string;
  nodes: string[];
  edges: string[];
  totalComplexity: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  bottlenecks: string[];
}

interface DependencyMetrics {
  totalNodes: number;
  totalEdges: number;
  averageDependencies: number;
  maxDependencyDepth: number;
  cyclomaticComplexity: number;
  couplingIndex: number;
  cohesionIndex: number;
  instabilityIndex: number;
  abstractnessIndex: number;
}

interface AnalysisOptions {
  includeIndirectDependencies?: boolean;
  maxDepth?: number;
  includeCopybooks?: boolean;
  includeJCL?: boolean;
  detectCircularDependencies?: boolean;
  calculateMetrics?: boolean;
}

export class DependencyAnalyzer {
  private graph: DependencyGraph;
  private programs: Map<number, CobolProgram>;
  private parsedPrograms: Map<number, ParsedProgram>;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      cycles: [],
      criticalPaths: [],
      metrics: this.createEmptyMetrics()
    };
    this.programs = new Map();
    this.parsedPrograms = new Map();
  }

  analyze(
    programs: CobolProgram[], 
    dependencies: Dependency[], 
    parsedPrograms: Map<number, ParsedProgram> = new Map(),
    options: AnalysisOptions = {}
  ): DependencyGraph {
    // Set defaults
    const opts: Required<AnalysisOptions> = {
      includeIndirectDependencies: true,
      maxDepth: 10,
      includeCopybooks: true,
      includeJCL: true,
      detectCircularDependencies: true,
      calculateMetrics: true,
      ...options
    };

    // Initialize data structures
    this.programs.clear();
    this.parsedPrograms = parsedPrograms;
    programs.forEach(program => {
      this.programs.set(program.id, program);
    });

    // Reset graph
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      cycles: [],
      criticalPaths: [],
      metrics: this.createEmptyMetrics()
    };

    // Build dependency graph
    this.buildNodes(programs, opts);
    this.buildEdges(dependencies, opts);

    // Analyze relationships
    if (opts.includeIndirectDependencies) {
      this.analyzeIndirectDependencies(opts.maxDepth);
    }

    if (opts.detectCircularDependencies) {
      this.detectCircularDependencies();
    }

    this.identifyCriticalPaths();

    if (opts.calculateMetrics) {
      this.calculateMetrics();
    }

    return this.graph;
  }

  private buildNodes(programs: CobolProgram[], options: AnalysisOptions): void {
    programs.forEach(program => {
      // Skip certain types based on options
      if (!options.includeCopybooks && program.programType === 'copybook') return;
      if (!options.includeJCL && program.programType === 'jcl') return;

      const node: DependencyNode = {
        id: `program-${program.id}`,
        programId: program.id,
        name: program.name,
        type: this.mapProgramType(program.programType),
        level: 0, // Will be calculated later
        complexity: program.complexity || 0,
        dependencies: [],
        dependents: [],
        isCritical: false, // Will be determined later
        isCircular: false, // Will be determined later
        metadata: {
          linesOfCode: program.linesOfCode || 0,
          lastModified: new Date(program.updatedAt),
          version: '1.0' // Could be extracted from parsed program
        }
      };

      this.graph.nodes.set(node.id, node);
    });
  }

  private buildEdges(dependencies: Dependency[], options: AnalysisOptions): void {
    dependencies.forEach(dep => {
      const sourceNode = this.graph.nodes.get(`program-${dep.fromProgramId}`);
      const targetNode = this.graph.nodes.get(`program-${dep.toProgramId}`);

      if (!sourceNode || !targetNode) return;

      const edge: DependencyEdge = {
        id: `edge-${dep.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        type: this.mapDependencyType(dep.dependencyType),
        weight: this.calculateEdgeWeight(dep),
        isCritical: dep.isCritical || false,
        isCircular: dep.isCircular || false,
        lineNumber: dep.lineNumber || undefined,
        context: '', // Could be extracted from parsed program
        parameters: [] // Could be extracted from parsed program
      };

      this.graph.edges.set(edge.id, edge);

      // Update node dependencies
      sourceNode.dependencies.push(targetNode.id);
      targetNode.dependents.push(sourceNode.id);
    });
  }

  private analyzeIndirectDependencies(maxDepth: number): void {
    // Use DFS to find indirect dependencies
    this.graph.nodes.forEach(node => {
      const visited = new Set<string>();
      const indirectDeps = new Set<string>();

      this.dfsIndirectDependencies(node.id, visited, indirectDeps, 0, maxDepth);

      // Add indirect dependencies (excluding direct ones)
      indirectDeps.forEach(depId => {
        if (!node.dependencies.includes(depId)) {
          node.dependencies.push(depId);
        }
      });
    });
  }

  private dfsIndirectDependencies(
    nodeId: string, 
    visited: Set<string>, 
    indirectDeps: Set<string>, 
    depth: number, 
    maxDepth: number
  ): void {
    if (depth >= maxDepth || visited.has(nodeId)) return;

    visited.add(nodeId);
    const node = this.graph.nodes.get(nodeId);
    if (!node) return;

    // Get direct dependencies
    const directDeps = Array.from(this.graph.edges.values())
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target);

    directDeps.forEach(depId => {
      indirectDeps.add(depId);
      this.dfsIndirectDependencies(depId, visited, indirectDeps, depth + 1, maxDepth);
    });

    visited.delete(nodeId);
  }

  private detectCircularDependencies(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: DependencyCycle[] = [];

    this.graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        this.dfsCircularDependencies(node.id, visited, recursionStack, [], cycles);
      }
    });

    // Analyze cycle severity
    cycles.forEach(cycle => {
      cycle.severity = this.calculateCycleSeverity(cycle);
      cycle.impact = this.calculateCycleImpact(cycle);
      cycle.suggestion = this.generateCycleSuggestion(cycle);
    });

    this.graph.cycles = cycles;

    // Mark nodes and edges as circular
    cycles.forEach(cycle => {
      cycle.nodes.forEach(nodeId => {
        const node = this.graph.nodes.get(nodeId);
        if (node) node.isCircular = true;
      });
      cycle.edges.forEach(edgeId => {
        const edge = this.graph.edges.get(edgeId);
        if (edge) edge.isCircular = true;
      });
    });
  }

  private dfsCircularDependencies(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[],
    cycles: DependencyCycle[]
  ): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    // Get outgoing edges
    const outgoingEdges = Array.from(this.graph.edges.values())
      .filter(edge => edge.source === nodeId);

    outgoingEdges.forEach(edge => {
      const targetId = edge.target;

      if (recursionStack.has(targetId)) {
        // Found a cycle
        const cycleStartIndex = path.indexOf(targetId);
        const cycleNodes = path.slice(cycleStartIndex);
        const cycleEdges = this.findCycleEdges(cycleNodes);

        cycles.push({
          id: `cycle-${cycles.length}`,
          nodes: cycleNodes,
          edges: cycleEdges,
          severity: 'medium', // Will be calculated later
          impact: 0 // Will be calculated later
        });
      } else if (!visited.has(targetId)) {
        this.dfsCircularDependencies(targetId, visited, recursionStack, path, cycles);
      }
    });

    recursionStack.delete(nodeId);
    path.pop();
  }

  private findCycleEdges(cycleNodes: string[]): string[] {
    const cycleEdges: string[] = [];

    for (let i = 0; i < cycleNodes.length; i++) {
      const source = cycleNodes[i];
      const target = cycleNodes[(i + 1) % cycleNodes.length];

      const edge = Array.from(this.graph.edges.values())
        .find(e => e.source === source && e.target === target);

      if (edge) {
        cycleEdges.push(edge.id);
      }
    }

    return cycleEdges;
  }

  private identifyCriticalPaths(): void {
    const criticalPaths: CriticalPath[] = [];

    // Find paths with high complexity or many dependencies
    this.graph.nodes.forEach(node => {
      if (node.type === 'main') {
        const path = this.findCriticalPath(node.id);
        if (path && path.totalComplexity > 50) {
          criticalPaths.push(path);
        }
      }
    });

    // Sort by risk level
    criticalPaths.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });

    this.graph.criticalPaths = criticalPaths;

    // Mark critical nodes
    criticalPaths.forEach(path => {
      path.nodes.forEach(nodeId => {
        const node = this.graph.nodes.get(nodeId);
        if (node) node.isCritical = true;
      });
    });
  }

  private findCriticalPath(startNodeId: string): CriticalPath | null {
    const visited = new Set<string>();
    const path: string[] = [];
    const edges: string[] = [];
    let totalComplexity = 0;

    const dfs = (nodeId: string): void => {
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      path.push(nodeId);

      const node = this.graph.nodes.get(nodeId);
      if (node) {
        totalComplexity += node.complexity;
      }

      // Follow the most complex dependencies
      const outgoingEdges = Array.from(this.graph.edges.values())
        .filter(edge => edge.source === nodeId)
        .sort((a, b) => b.weight - a.weight);

      if (outgoingEdges.length > 0) {
        const nextEdge = outgoingEdges[0];
        edges.push(nextEdge.id);
        dfs(nextEdge.target);
      }
    };

    dfs(startNodeId);

    if (path.length <= 1) return null;

    return {
      id: `critical-path-${Date.now()}`,
      nodes: path,
      edges,
      totalComplexity,
      riskLevel: this.calculateRiskLevel(totalComplexity, path.length),
      bottlenecks: this.identifyBottlenecks(path)
    };
  }

  private calculateMetrics(): void {
    const nodes = Array.from(this.graph.nodes.values());
    const edges = Array.from(this.graph.edges.values());

    const totalNodes = nodes.length;
    const totalEdges = edges.length;

    // Calculate average dependencies
    const totalDependencies = nodes.reduce((sum, node) => sum + node.dependencies.length, 0);
    const averageDependencies = totalNodes > 0 ? totalDependencies / totalNodes : 0;

    // Calculate max dependency depth
    const maxDependencyDepth = this.calculateMaxDepth();

    // Calculate cyclomatic complexity
    const cyclomaticComplexity = this.calculateCyclomaticComplexity();

    // Calculate coupling index
    const couplingIndex = this.calculateCouplingIndex();

    // Calculate cohesion index
    const cohesionIndex = this.calculateCohesionIndex();

    // Calculate instability index (efferent coupling / (afferent + efferent coupling))
    const instabilityIndex = this.calculateInstabilityIndex();

    // Calculate abstractness index
    const abstractnessIndex = this.calculateAbstractnessIndex();

    this.graph.metrics = {
      totalNodes,
      totalEdges,
      averageDependencies,
      maxDependencyDepth,
      cyclomaticComplexity,
      couplingIndex,
      cohesionIndex,
      instabilityIndex,
      abstractnessIndex
    };
  }

  private mapProgramType(programType: string): DependencyNode['type'] {
    switch (programType.toLowerCase()) {
      case 'main': return 'main';
      case 'subroutine': return 'subroutine';
      case 'copybook': return 'copybook';
      case 'jcl': return 'jcl';
      default: return 'subroutine';
    }
  }

  private mapDependencyType(dependencyType: string): DependencyEdge['type'] {
    switch (dependencyType.toLowerCase()) {
      case 'call': return 'call';
      case 'copy': return 'copy';
      case 'data_flow': return 'data_flow';
      case 'control_flow': return 'control_flow';
      default: return 'call';
    }
  }

  private calculateEdgeWeight(dependency: Dependency): number {
    let weight = 1;

    // Increase weight for critical dependencies
    if (dependency.isCritical) weight += 5;

    // Increase weight for circular dependencies
    if (dependency.isCircular) weight += 3;

    // Increase weight based on dependency type
    switch (dependency.dependencyType) {
      case 'call': weight += 2; break;
      case 'copy': weight += 1; break;
      case 'data_flow': weight += 3; break;
      case 'control_flow': weight += 4; break;
    }

    return weight;
  }

  private calculateCycleSeverity(cycle: DependencyCycle): DependencyCycle['severity'] {
    // Base severity on cycle length and complexity
    const cycleLength = cycle.nodes.length;
    const totalComplexity = cycle.nodes.reduce((sum, nodeId) => {
      const node = this.graph.nodes.get(nodeId);
      return sum + (node ? node.complexity : 0);
    }, 0);

    if (cycleLength >= 5 || totalComplexity > 100) return 'critical';
    if (cycleLength >= 3 || totalComplexity > 50) return 'high';
    if (cycleLength >= 2 || totalComplexity > 20) return 'medium';
    return 'low';
  }

  private calculateCycleImpact(cycle: DependencyCycle): number {
    // Calculate impact based on number of affected nodes and complexity
    const affectedNodes = new Set(cycle.nodes);
    const totalComplexity = cycle.nodes.reduce((sum, nodeId) => {
      const node = this.graph.nodes.get(nodeId);
      return sum + (node ? node.complexity : 0);
    }, 0);

    return affectedNodes.size * totalComplexity;
  }

  private generateCycleSuggestion(cycle: DependencyCycle): string {
    const cycleLength = cycle.nodes.length;

    if (cycleLength === 2) {
      return "Consider breaking this circular dependency by introducing an intermediate component or using dependency injection.";
    } else if (cycleLength <= 4) {
      return "This circular dependency can be resolved by refactoring one of the components to depend on an abstraction instead of a concrete implementation.";
    } else {
      return "This complex circular dependency requires architectural refactoring. Consider breaking it into smaller, more cohesive modules.";
    }
  }

  private calculateRiskLevel(complexity: number, pathLength: number): CriticalPath['riskLevel'] {
    const riskScore = complexity + (pathLength * 10);

    if (riskScore > 200) return 'critical';
    if (riskScore > 100) return 'high';
    if (riskScore > 50) return 'medium';
    return 'low';
  }

  private identifyBottlenecks(path: string[]): string[] {
    const bottlenecks: string[] = [];

    path.forEach(nodeId => {
      const node = this.graph.nodes.get(nodeId);
      if (node && (node.dependencies.length > 5 || node.dependents.length > 5)) {
        bottlenecks.push(nodeId);
      }
    });

    return bottlenecks;
  }

  private calculateMaxDepth(): number {
    let maxDepth = 0;

    this.graph.nodes.forEach(node => {
      if (node.type === 'main') {
        const depth = this.calculateNodeDepth(node.id, new Set());
        maxDepth = Math.max(maxDepth, depth);
      }
    });

    return maxDepth;
  }

  private calculateNodeDepth(nodeId: string, visited: Set<string>): number {
    if (visited.has(nodeId)) return 0;

    visited.add(nodeId);
    let maxDepth = 0;

    const outgoingEdges = Array.from(this.graph.edges.values())
      .filter(edge => edge.source === nodeId);

    outgoingEdges.forEach(edge => {
      const depth = this.calculateNodeDepth(edge.target, new Set(visited));
      maxDepth = Math.max(maxDepth, depth);
    });

    return maxDepth + 1;
  }

  private calculateCyclomaticComplexity(): number {
    // V(G) = E - N + 2P
    // Where E = edges, N = nodes, P = connected components
    const E = this.graph.edges.size;
    const N = this.graph.nodes.size;
    const P = this.calculateConnectedComponents();

    return E - N + (2 * P);
  }

  private calculateConnectedComponents(): number {
    const visited = new Set<string>();
    let components = 0;

    this.graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        this.dfsComponent(node.id, visited);
        components++;
      }
    });

    return components;
  }

  private dfsComponent(nodeId: string, visited: Set<string>): void {
    visited.add(nodeId);

    // Follow all edges (both directions)
    const relatedEdges = Array.from(this.graph.edges.values())
      .filter(edge => edge.source === nodeId || edge.target === nodeId);

    relatedEdges.forEach(edge => {
      const relatedNodeId = edge.source === nodeId ? edge.target : edge.source;
      if (!visited.has(relatedNodeId)) {
        this.dfsComponent(relatedNodeId, visited);
      }
    });
  }

  private calculateCouplingIndex(): number {
    // Average number of dependencies per node
    const totalDependencies = Array.from(this.graph.nodes.values())
      .reduce((sum, node) => sum + node.dependencies.length, 0);

    return this.graph.nodes.size > 0 ? totalDependencies / this.graph.nodes.size : 0;
  }

  private calculateCohesionIndex(): number {
    // Measure of how closely related functions are within a module
    // For now, return a simplified metric based on internal complexity
    let totalCohesion = 0;
    let nodeCount = 0;

    this.graph.nodes.forEach(node => {
      const internalComplexity = node.complexity;
      const externalDependencies = node.dependencies.length;
      
      const cohesion = externalDependencies > 0 
        ? internalComplexity / (internalComplexity + externalDependencies)
        : 1;

      totalCohesion += cohesion;
      nodeCount++;
    });

    return nodeCount > 0 ? totalCohesion / nodeCount : 0;
  }

  private calculateInstabilityIndex(): number {
    // I = Ce / (Ca + Ce)
    // Where Ce = efferent coupling, Ca = afferent coupling
    let totalInstability = 0;
    let nodeCount = 0;

    this.graph.nodes.forEach(node => {
      const efferentCoupling = node.dependencies.length; // Ce
      const afferentCoupling = node.dependents.length;   // Ca

      const instability = (efferentCoupling + afferentCoupling) > 0
        ? efferentCoupling / (afferentCoupling + efferentCoupling)
        : 0;

      totalInstability += instability;
      nodeCount++;
    });

    return nodeCount > 0 ? totalInstability / nodeCount : 0;
  }

  private calculateAbstractnessIndex(): number {
    // For COBOL, we can consider copybooks as abstract components
    const abstractNodes = Array.from(this.graph.nodes.values())
      .filter(node => node.type === 'copybook').length;

    return this.graph.nodes.size > 0 ? abstractNodes / this.graph.nodes.size : 0;
  }

  private createEmptyMetrics(): DependencyMetrics {
    return {
      totalNodes: 0,
      totalEdges: 0,
      averageDependencies: 0,
      maxDependencyDepth: 0,
      cyclomaticComplexity: 0,
      couplingIndex: 0,
      cohesionIndex: 0,
      instabilityIndex: 0,
      abstractnessIndex: 0
    };
  }

  // Public utility methods
  getNodeById(nodeId: string): DependencyNode | undefined {
    return this.graph.nodes.get(nodeId);
  }

  getEdgeById(edgeId: string): DependencyEdge | undefined {
    return this.graph.edges.get(edgeId);
  }

  getNodesByType(type: DependencyNode['type']): DependencyNode[] {
    return Array.from(this.graph.nodes.values())
      .filter(node => node.type === type);
  }

  getCriticalNodes(): DependencyNode[] {
    return Array.from(this.graph.nodes.values())
      .filter(node => node.isCritical);
  }

  getCircularNodes(): DependencyNode[] {
    return Array.from(this.graph.nodes.values())
      .filter(node => node.isCircular);
  }

  exportGraph(): {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
    cycles: DependencyCycle[];
    criticalPaths: CriticalPath[];
    metrics: DependencyMetrics;
  } {
    return {
      nodes: Array.from(this.graph.nodes.values()),
      edges: Array.from(this.graph.edges.values()),
      cycles: this.graph.cycles,
      criticalPaths: this.graph.criticalPaths,
      metrics: this.graph.metrics
    };
  }
}

// Export a simple dependency analysis function
export function analyzeDependencies(code: string) {
  const calls: string[] = [];
  const copybooks: string[] = [];
  const files: string[] = [];
  
  // Simple regex-based analysis
  const lines = code.split('\n');
  
  for (const line of lines) {
    // Find CALL statements
    const callMatch = line.match(/CALL\s+['"](.*?)['"]|CALL\s+([A-Z0-9\-]+)/i);
    if (callMatch) {
      const program = callMatch[1] || callMatch[2];
      if (program && !calls.includes(program)) {
        calls.push(program);
      }
    }
    
    // Find COPY statements
    const copyMatch = line.match(/COPY\s+([A-Z0-9\-]+)/i);
    if (copyMatch) {
      const copybook = copyMatch[1];
      if (!copybooks.includes(copybook)) {
        copybooks.push(copybook);
      }
    }
    
    // Find SELECT/ASSIGN statements for files
    const selectMatch = line.match(/SELECT\s+([A-Z0-9\-]+)\s+ASSIGN/i);
    if (selectMatch) {
      const file = selectMatch[1];
      if (!files.includes(file)) {
        files.push(file);
      }
    }
  }
  
  return { calls, copybooks, files };
}

export type {
  DependencyNode,
  DependencyEdge,
  DependencyGraph,
  DependencyCycle,
  CriticalPath,
  DependencyMetrics,
  AnalysisOptions
};
