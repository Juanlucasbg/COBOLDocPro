import { storage } from "./storage";
import type { 
  Program, 
  CodeFile, 
  Dependency, 
  BusinessRuleCandidate,
  QualityIssue 
} from "@shared/schema";

export interface ImpactAnalysisResult {
  sourceItem: {
    type: 'program' | 'copybook' | 'dataset' | 'field';
    id: string;
    name: string;
  };
  impactedItems: ImpactedItem[];
  analysisMetrics: {
    totalImpacted: number;
    highRiskChanges: number;
    estimatedTestingEffort: number; // in hours
    recommendedApproach: string;
  };
  changeRippleEffect: ChangeRipple[];
}

export interface ImpactedItem {
  type: 'program' | 'copybook' | 'job' | 'dataset' | 'screen' | 'report';
  id: string;
  name: string;
  relationship: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  changeType: 'direct' | 'indirect' | 'cascading';
  location?: {
    line?: number;
    paragraph?: string;
    section?: string;
  };
  description: string;
  recommendation: string;
}

export interface ChangeRipple {
  level: number; // 1 = direct, 2 = indirect, etc.
  items: ImpactedItem[];
  description: string;
}

export interface FieldImpactAnalysis {
  field: {
    name: string;
    program: string;
    copybook?: string;
  };
  usages: FieldUsage[];
  modifications: FieldModification[];
  propagation: DataPropagation[];
}

export interface FieldUsage {
  program: string;
  type: 'read' | 'write' | 'compute' | 'compare' | 'move';
  location: {
    line: number;
    paragraph?: string;
  };
  context: string;
}

export interface FieldModification {
  program: string;
  modificationType: 'structure' | 'format' | 'validation' | 'calculation';
  impact: 'breaking' | 'compatible' | 'enhancement';
  location: {
    line: number;
    paragraph?: string;
  };
}

export interface DataPropagation {
  sourceProgram: string;
  targetProgram: string;
  mechanism: 'file' | 'database' | 'parameter' | 'global';
  transformations: string[];
}

export class ImpactAnalysisEngine {
  private dependencyGraph: Map<string, string[]> = new Map();
  private reverseDependencyGraph: Map<string, string[]> = new Map();
  private copybookUsages: Map<string, string[]> = new Map();
  private fieldUsages: Map<string, FieldUsage[]> = new Map();

  constructor() {
    this.initializeDependencyGraphs();
  }

  /**
   * Analyze impact of changing a specific program
   */
  async analyzeProgramImpact(programId: number): Promise<ImpactAnalysisResult> {
    const program = await storage.getProgram(programId);
    if (!program) {
      throw new Error(`Program with id ${programId} not found`);
    }

    const impactedItems: ImpactedItem[] = [];
    
    // Find direct dependencies
    const directDependencies = await this.findDirectDependencies(programId);
    impactedItems.push(...directDependencies);

    // Find indirect dependencies (ripple effects)
    const indirectDependencies = await this.findIndirectDependencies(programId, 3); // 3 levels deep
    impactedItems.push(...indirectDependencies);

    // Analyze copybook dependencies
    const copybookImpacts = await this.analyzeCopybookImpacts(programId);
    impactedItems.push(...copybookImpacts);

    // Analyze data flow impacts
    const dataFlowImpacts = await this.analyzeDataFlowImpacts(programId);
    impactedItems.push(...dataFlowImpacts);

    // Calculate change ripple effects
    const changeRippleEffect = this.calculateChangeRipple(impactedItems);

    // Calculate analysis metrics
    const analysisMetrics = this.calculateAnalysisMetrics(impactedItems);

    return {
      sourceItem: {
        type: 'program',
        id: programId.toString(),
        name: program.name
      },
      impactedItems,
      analysisMetrics,
      changeRippleEffect
    };
  }

  /**
   * Analyze impact of changing a specific copybook
   */
  async analyzeCopybookImpact(copybookName: string): Promise<ImpactAnalysisResult> {
    const impactedItems: ImpactedItem[] = [];
    
    // Find all programs using this copybook
    const usingPrograms = await this.findProgramsUsingCopybook(copybookName);
    
    for (const programId of usingPrograms) {
      const program = await storage.getProgram(programId);
      if (program) {
        impactedItems.push({
          type: 'program',
          id: programId.toString(),
          name: program.name,
          relationship: 'includes copybook',
          severity: 'high',
          changeType: 'direct',
          description: `Program directly includes copybook ${copybookName}`,
          recommendation: 'Review and test all copybook references'
        });

        // Find cascading impacts from these programs
        const cascadingImpacts = await this.findIndirectDependencies(programId, 2);
        impactedItems.push(...cascadingImpacts.map(item => ({
          ...item,
          changeType: 'cascading' as const
        })));
      }
    }

    const analysisMetrics = this.calculateAnalysisMetrics(impactedItems);
    const changeRippleEffect = this.calculateChangeRipple(impactedItems);

    return {
      sourceItem: {
        type: 'copybook',
        id: copybookName,
        name: copybookName
      },
      impactedItems,
      analysisMetrics,
      changeRippleEffect
    };
  }

  /**
   * Analyze impact of changing a specific field
   */
  async analyzeFieldImpact(fieldName: string, programId?: number): Promise<FieldImpactAnalysis> {
    const usages: FieldUsage[] = [];
    const modifications: FieldModification[] = [];
    const propagation: DataPropagation[] = [];

    // Find all usages of this field across programs
    const allPrograms = await storage.getAllPrograms();
    
    for (const program of allPrograms) {
      if (programId && program.id !== programId) continue;
      
      const fieldUsagesInProgram = this.extractFieldUsages(program, fieldName);
      usages.push(...fieldUsagesInProgram);

      const fieldModifications = this.extractFieldModifications(program, fieldName);
      modifications.push(...fieldModifications);
    }

    // Trace data propagation
    const dataPropagation = await this.traceDataPropagation(fieldName);
    propagation.push(...dataPropagation);

    const program = programId ? await storage.getProgram(programId) : null;
    
    return {
      field: {
        name: fieldName,
        program: program?.name || 'Unknown',
        copybook: await this.findFieldCopybook(fieldName)
      },
      usages,
      modifications,
      propagation
    };
  }

  /**
   * Get instant impact analysis for quick queries
   */
  async getInstantImpact(
    sourceType: 'program' | 'copybook' | 'field',
    sourceId: string
  ): Promise<{ 
    directImpacts: number; 
    indirectImpacts: number; 
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
  }> {
    // Check cache first
    const cached = await this.getCachedImpact(sourceType, sourceId);
    if (cached && !this.isCacheExpired(cached)) {
      return this.summarizeImpact(cached);
    }

    // Perform quick analysis
    let directImpacts = 0;
    let indirectImpacts = 0;

    switch (sourceType) {
      case 'program':
        const programDeps = await this.findDirectDependencies(parseInt(sourceId));
        directImpacts = programDeps.length;
        indirectImpacts = await this.estimateIndirectImpacts(parseInt(sourceId));
        break;
        
      case 'copybook':
        const copybookUsages = await this.findProgramsUsingCopybook(sourceId);
        directImpacts = copybookUsages.length;
        indirectImpacts = await this.estimateCopybookIndirectImpacts(sourceId);
        break;
        
      case 'field':
        const fieldUsages = await this.countFieldUsages(sourceId);
        directImpacts = fieldUsages.direct;
        indirectImpacts = fieldUsages.indirect;
        break;
    }

    const riskLevel = this.calculateRiskLevel(directImpacts, indirectImpacts);
    const summary = this.generateImpactSummary(sourceType, sourceId, directImpacts, indirectImpacts);

    return {
      directImpacts,
      indirectImpacts,
      riskLevel,
      summary
    };
  }

  // Private helper methods
  private async initializeDependencyGraphs(): Promise<void> {
    // Initialize dependency graphs for fast lookups
    const dependencies = await storage.getAllDependencies();
    
    for (const dep of dependencies) {
      const fromId = dep.fromProgramId.toString();
      const toId = dep.toProgramId.toString();
      
      // Forward graph
      if (!this.dependencyGraph.has(fromId)) {
        this.dependencyGraph.set(fromId, []);
      }
      this.dependencyGraph.get(fromId)!.push(toId);
      
      // Reverse graph
      if (!this.reverseDependencyGraph.has(toId)) {
        this.reverseDependencyGraph.set(toId, []);
      }
      this.reverseDependencyGraph.get(toId)!.push(fromId);
    }
  }

  private async findDirectDependencies(programId: number): Promise<ImpactedItem[]> {
    const dependencies = await storage.getDependenciesByProgram(programId);
    const impactedItems: ImpactedItem[] = [];

    for (const dep of dependencies) {
      const targetProgram = await storage.getProgram(dep.toProgramId);
      if (targetProgram) {
        impactedItems.push({
          type: 'program',
          id: dep.toProgramId.toString(),
          name: targetProgram.name,
          relationship: dep.type,
          severity: this.calculateSeverity(dep.type, dep.strength),
          changeType: 'direct',
          location: dep.metadata?.lineNumbers ? {
            line: dep.metadata.lineNumbers[0]
          } : undefined,
          description: `Direct ${dep.type} dependency`,
          recommendation: `Review ${dep.type} interface and test integration`
        });
      }
    }

    return impactedItems;
  }

  private async findIndirectDependencies(programId: number, maxDepth: number): Promise<ImpactedItem[]> {
    const visited = new Set<string>();
    const impactedItems: ImpactedItem[] = [];
    
    const traverse = async (currentId: string, depth: number) => {
      if (depth >= maxDepth || visited.has(currentId)) return;
      visited.add(currentId);

      const dependencies = this.dependencyGraph.get(currentId) || [];
      
      for (const depId of dependencies) {
        const program = await storage.getProgram(parseInt(depId));
        if (program) {
          impactedItems.push({
            type: 'program',
            id: depId,
            name: program.name,
            relationship: `indirect (level ${depth + 1})`,
            severity: depth === 0 ? 'medium' : 'low',
            changeType: 'indirect',
            description: `Indirect dependency at level ${depth + 1}`,
            recommendation: 'Monitor for potential impacts'
          });
          
          await traverse(depId, depth + 1);
        }
      }
    };

    await traverse(programId.toString(), 0);
    return impactedItems;
  }

  private async analyzeCopybookImpacts(programId: number): Promise<ImpactedItem[]> {
    // Implementation for copybook impact analysis
    return [];
  }

  private async analyzeDataFlowImpacts(programId: number): Promise<ImpactedItem[]> {
    // Implementation for data flow impact analysis
    return [];
  }

  private calculateChangeRipple(impactedItems: ImpactedItem[]): ChangeRipple[] {
    const ripples: ChangeRipple[] = [];
    
    // Group items by change type
    const directItems = impactedItems.filter(item => item.changeType === 'direct');
    const indirectItems = impactedItems.filter(item => item.changeType === 'indirect');
    const cascadingItems = impactedItems.filter(item => item.changeType === 'cascading');

    if (directItems.length > 0) {
      ripples.push({
        level: 1,
        items: directItems,
        description: `${directItems.length} items directly affected`
      });
    }

    if (indirectItems.length > 0) {
      ripples.push({
        level: 2,
        items: indirectItems,
        description: `${indirectItems.length} items indirectly affected`
      });
    }

    if (cascadingItems.length > 0) {
      ripples.push({
        level: 3,
        items: cascadingItems,
        description: `${cascadingItems.length} items affected by cascading changes`
      });
    }

    return ripples;
  }

  private calculateAnalysisMetrics(impactedItems: ImpactedItem[]) {
    const totalImpacted = impactedItems.length;
    const highRiskChanges = impactedItems.filter(item => 
      item.severity === 'critical' || item.severity === 'high'
    ).length;
    
    // Estimate testing effort based on impact complexity
    const estimatedTestingEffort = this.estimateTestingEffort(impactedItems);
    
    const recommendedApproach = this.getRecommendedApproach(totalImpacted, highRiskChanges);

    return {
      totalImpacted,
      highRiskChanges,
      estimatedTestingEffort,
      recommendedApproach
    };
  }

  private async findProgramsUsingCopybook(copybookName: string): Promise<number[]> {
    // Implementation to find programs using a specific copybook
    return [];
  }

  private extractFieldUsages(program: Program, fieldName: string): FieldUsage[] {
    // Implementation to extract field usages from program source
    return [];
  }

  private extractFieldModifications(program: Program, fieldName: string): FieldModification[] {
    // Implementation to extract field modifications from program source
    return [];
  }

  private async traceDataPropagation(fieldName: string): Promise<DataPropagation[]> {
    // Implementation to trace data propagation
    return [];
  }

  private async findFieldCopybook(fieldName: string): Promise<string | undefined> {
    // Implementation to find which copybook defines a field
    return undefined;
  }

  private calculateSeverity(depType: string, strength?: string): ImpactedItem['severity'] {
    if (depType === 'calls' && strength === 'strong') return 'high';
    if (depType === 'file-io') return 'medium';
    if (depType === 'database') return 'high';
    return 'medium';
  }

  private estimateTestingEffort(impactedItems: ImpactedItem[]): number {
    // Base effort + complexity multipliers
    let baseEffort = 2; // hours
    let complexityMultiplier = 1;

    impactedItems.forEach(item => {
      switch (item.severity) {
        case 'critical': complexityMultiplier += 3; break;
        case 'high': complexityMultiplier += 2; break;
        case 'medium': complexityMultiplier += 1; break;
        case 'low': complexityMultiplier += 0.5; break;
      }
    });

    return Math.ceil(baseEffort * complexityMultiplier);
  }

  private getRecommendedApproach(totalImpacted: number, highRiskChanges: number): string {
    if (highRiskChanges > 5) {
      return 'Phased rollout with extensive testing';
    } else if (totalImpacted > 10) {
      return 'Coordinated deployment with regression testing';
    } else if (totalImpacted > 3) {
      return 'Standard testing with impact verification';
    } else {
      return 'Standard deployment process';
    }
  }

  private async getCachedImpact(sourceType: string, sourceId: string): Promise<any> {
    // Implementation to get cached impact analysis
    return null;
  }

  private isCacheExpired(cached: any): boolean {
    // Implementation to check if cache is expired
    return true;
  }

  private summarizeImpact(cached: any): any {
    // Implementation to summarize cached impact
    return {};
  }

  private async estimateIndirectImpacts(programId: number): Promise<number> {
    // Quick estimation without full analysis
    const directDeps = this.dependencyGraph.get(programId.toString()) || [];
    return directDeps.length * 2; // Rough estimate
  }

  private async estimateCopybookIndirectImpacts(copybookName: string): Promise<number> {
    // Quick estimation for copybook impacts
    return 0;
  }

  private async countFieldUsages(fieldName: string): Promise<{ direct: number; indirect: number }> {
    // Quick count of field usages
    return { direct: 0, indirect: 0 };
  }

  private calculateRiskLevel(direct: number, indirect: number): 'low' | 'medium' | 'high' | 'critical' {
    const total = direct + indirect;
    if (total > 20 || direct > 10) return 'critical';
    if (total > 10 || direct > 5) return 'high';
    if (total > 3 || direct > 2) return 'medium';
    return 'low';
  }

  private generateImpactSummary(sourceType: string, sourceId: string, direct: number, indirect: number): string {
    return `${sourceType} ${sourceId} affects ${direct} items directly and ${indirect} items indirectly`;
  }

  private async getAllDependencies(): Promise<Dependency[]> {
    // This would be a new method needed in storage
    return [];
  }
}

// Export singleton instance
export const impactAnalysisEngine = new ImpactAnalysisEngine();