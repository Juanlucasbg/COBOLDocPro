import { storage } from "./storage";
import type { 
  BusinessRuleCandidate, 
  InsertBusinessRuleCandidate,
  Program 
} from "@shared/schema";

export interface RuleValidationWorkbench {
  candidates: EnhancedRuleCandidate[];
  validationSession: ValidationSession;
  recommendations: RuleRecommendation[];
  clusters: RuleCluster[];
}

export interface EnhancedRuleCandidate extends BusinessRuleCandidate {
  codeContext: CodeContext;
  relatedCandidates: string[]; // IDs of related candidates
  validationHistory: ValidationEvent[];
  businessContext?: BusinessContext;
}

export interface CodeContext {
  sourceLines: string[];
  startLine: number;
  endLine: number;
  paragraph?: string;
  section?: string;
  precedingContext: string[];
  followingContext: string[];
  controlFlowPath: string[];
}

export interface ValidationEvent {
  action: 'confirmed' | 'rejected' | 'modified' | 'merged' | 'split';
  userId: string;
  timestamp: Date;
  reason: string;
  previousState?: Partial<BusinessRuleCandidate>;
  changes?: Record<string, any>;
}

export interface BusinessContext {
  domain: string;
  process: string;
  stakeholders: string[];
  businessImpact: 'high' | 'medium' | 'low';
  frequency: 'always' | 'often' | 'sometimes' | 'rarely';
  exceptions: string[];
}

export interface ValidationSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  candidatesReviewed: number;
  candidatesConfirmed: number;
  candidatesRejected: number;
  notes: string[];
}

export interface RuleRecommendation {
  type: 'merge' | 'split' | 'refine' | 'investigate';
  candidateIds: string[];
  reason: string;
  confidence: number;
  suggestedAction: string;
}

export interface RuleCluster {
  id: string;
  name: string;
  description: string;
  candidates: string[];
  commonPattern: string;
  businessDomain: string;
  confidence: number;
}

export interface RuleCatalog {
  confirmedRules: ConfirmedBusinessRule[];
  categories: RuleCategory[];
  relationships: RuleRelationship[];
  coverage: CoverageMetrics;
}

export interface ConfirmedBusinessRule {
  id: string;
  name: string;
  description: string;
  category: string;
  businessDomain: string;
  formalDefinition: string;
  conditions: string[];
  actions: string[];
  exceptions: string[];
  sourcePrograms: number[];
  codeReferences: CodeReference[];
  businessStakeholder: string;
  lastReviewed: Date;
  version: number;
  status: 'active' | 'deprecated' | 'draft';
}

export interface CodeReference {
  programId: number;
  programName: string;
  location: {
    line: number;
    paragraph?: string;
    section?: string;
  };
  codeSlice: string;
  explanation: string;
}

export interface RuleCategory {
  id: string;
  name: string;
  description: string;
  parent?: string;
  ruleCount: number;
}

export interface RuleRelationship {
  fromRuleId: string;
  toRuleId: string;
  type: 'depends-on' | 'conflicts-with' | 'complements' | 'overrides';
  description: string;
}

export interface CoverageMetrics {
  totalPrograms: number;
  programsWithRules: number;
  averageRulesPerProgram: number;
  coveragePercentage: number;
  uncoveredPrograms: number[];
}

export class BusinessRuleWorkbench {
  /**
   * Create a validation workbench for a specific program
   */
  async createWorkbench(programId: number, userId: string): Promise<RuleValidationWorkbench> {
    const program = await storage.getProgram(programId);
    if (!program) {
      throw new Error(`Program with id ${programId} not found`);
    }

    // Get all rule candidates for this program
    const candidates = await storage.getBusinessRuleCandidatesByProgram(programId);
    
    // Enhance candidates with additional context
    const enhancedCandidates = await this.enhanceCandidates(candidates, program);
    
    // Create validation session
    const validationSession: ValidationSession = {
      id: this.generateSessionId(),
      userId,
      startTime: new Date(),
      candidatesReviewed: 0,
      candidatesConfirmed: 0,
      candidatesRejected: 0,
      notes: []
    };

    // Generate recommendations
    const recommendations = await this.generateRecommendations(enhancedCandidates);
    
    // Create rule clusters
    const clusters = await this.clusterRules(enhancedCandidates);

    return {
      candidates: enhancedCandidates,
      validationSession,
      recommendations,
      clusters
    };
  }

  /**
   * Validate a business rule candidate
   */
  async validateCandidate(
    candidateId: string,
    action: ValidationEvent['action'],
    userId: string,
    reason: string,
    modifications?: Partial<BusinessRuleCandidate>
  ): Promise<EnhancedRuleCandidate> {
    const candidate = await storage.getBusinessRuleCandidate(candidateId);
    if (!candidate) {
      throw new Error(`Candidate with id ${candidateId} not found`);
    }

    // Record validation event
    const validationEvent: ValidationEvent = {
      action,
      userId,
      timestamp: new Date(),
      reason,
      previousState: { ...candidate },
      changes: modifications
    };

    // Update candidate based on action
    let updatedCandidate = candidate;
    
    switch (action) {
      case 'confirmed':
        updatedCandidate = await this.confirmCandidate(candidate, userId);
        break;
      case 'rejected':
        updatedCandidate = await this.rejectCandidate(candidate, userId, reason);
        break;
      case 'modified':
        if (modifications) {
          updatedCandidate = await this.modifyCandidate(candidate, modifications, userId);
        }
        break;
      case 'merged':
        // Handle merging with other candidates
        break;
      case 'split':
        // Handle splitting into multiple candidates
        break;
    }

    // Add validation event to history
    const enhancedCandidate = await this.getEnhancedCandidate(updatedCandidate.id);
    enhancedCandidate.validationHistory.push(validationEvent);

    return enhancedCandidate;
  }

  /**
   * Get the business rule catalog
   */
  async getRuleCatalog(programId?: number): Promise<RuleCatalog> {
    const confirmedRules = await this.getConfirmedRules(programId);
    const categories = await this.getRuleCategories();
    const relationships = await this.getRuleRelationships();
    const coverage = await this.calculateCoverage();

    return {
      confirmedRules,
      categories,
      relationships,
      coverage
    };
  }

  /**
   * Search rules by various criteria
   */
  async searchRules(criteria: {
    text?: string;
    category?: string;
    businessDomain?: string;
    programId?: number;
    stakeholder?: string;
  }): Promise<ConfirmedBusinessRule[]> {
    // Implementation for searching confirmed business rules
    return [];
  }

  /**
   * Export rules for external systems
   */
  async exportRules(format: 'json' | 'xml' | 'csv' | 'business-glossary', filter?: any): Promise<string> {
    const rules = await this.getConfirmedRules();
    
    switch (format) {
      case 'json':
        return JSON.stringify(rules, null, 2);
      case 'xml':
        return this.convertToXML(rules);
      case 'csv':
        return this.convertToCSV(rules);
      case 'business-glossary':
        return this.generateBusinessGlossary(rules);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate rule recommendations based on patterns
   */
  private async generateRecommendations(candidates: EnhancedRuleCandidate[]): Promise<RuleRecommendation[]> {
    const recommendations: RuleRecommendation[] = [];

    // Look for merge opportunities
    const mergeOpportunities = this.findMergeOpportunities(candidates);
    recommendations.push(...mergeOpportunities);

    // Look for split opportunities
    const splitOpportunities = this.findSplitOpportunities(candidates);
    recommendations.push(...splitOpportunities);

    // Look for refinement opportunities
    const refineOpportunities = this.findRefinementOpportunities(candidates);
    recommendations.push(...refineOpportunities);

    return recommendations;
  }

  /**
   * Cluster similar business rules
   */
  private async clusterRules(candidates: EnhancedRuleCandidate[]): Promise<RuleCluster[]> {
    const clusters: RuleCluster[] = [];

    // Group by similar patterns
    const patternGroups = this.groupByPatterns(candidates);
    
    for (const [pattern, groupCandidates] of patternGroups) {
      clusters.push({
        id: this.generateClusterId(),
        name: `Pattern: ${pattern}`,
        description: `Rules following the ${pattern} pattern`,
        candidates: groupCandidates.map(c => c.id),
        commonPattern: pattern,
        businessDomain: this.inferBusinessDomain(groupCandidates),
        confidence: this.calculateClusterConfidence(groupCandidates)
      });
    }

    return clusters;
  }

  /**
   * Enhance candidates with additional context
   */
  private async enhanceCandidates(
    candidates: BusinessRuleCandidate[], 
    program: Program
  ): Promise<EnhancedRuleCandidate[]> {
    const enhanced: EnhancedRuleCandidate[] = [];

    for (const candidate of candidates) {
      const codeContext = this.extractCodeContext(candidate, program);
      const relatedCandidates = this.findRelatedCandidates(candidate, candidates);
      const validationHistory = await this.getValidationHistory(candidate.id);
      const businessContext = await this.inferBusinessContext(candidate, program);

      enhanced.push({
        ...candidate,
        codeContext,
        relatedCandidates,
        validationHistory,
        businessContext
      });
    }

    return enhanced;
  }

  /**
   * Extract code context around a business rule
   */
  private extractCodeContext(candidate: BusinessRuleCandidate, program: Program): CodeContext {
    const sourceLines = program.sourceCode.split('\n');
    const candidateLine = typeof candidate.location === 'object' ? candidate.location.line : 0;
    
    const contextSize = 5;
    const startLine = Math.max(0, candidateLine - contextSize);
    const endLine = Math.min(sourceLines.length - 1, candidateLine + contextSize);
    
    return {
      sourceLines: sourceLines.slice(startLine, endLine + 1),
      startLine,
      endLine,
      paragraph: typeof candidate.location === 'object' ? candidate.location.paragraph : undefined,
      precedingContext: sourceLines.slice(Math.max(0, startLine - 3), startLine),
      followingContext: sourceLines.slice(endLine + 1, Math.min(sourceLines.length, endLine + 4)),
      controlFlowPath: [] // Would be populated from CFG analysis
    };
  }

  /**
   * Find related business rule candidates
   */
  private findRelatedCandidates(
    candidate: BusinessRuleCandidate, 
    allCandidates: BusinessRuleCandidate[]
  ): string[] {
    const related: string[] = [];

    for (const other of allCandidates) {
      if (other.id === candidate.id) continue;

      // Check for variable overlap
      const variableOverlap = this.calculateVariableOverlap(candidate.variables, other.variables);
      
      // Check for location proximity
      const locationProximity = this.calculateLocationProximity(candidate.location, other.location);
      
      // Check for condition similarity
      const conditionSimilarity = this.calculateConditionSimilarity(candidate.conditions, other.conditions);

      if (variableOverlap > 0.3 || locationProximity < 10 || conditionSimilarity > 0.5) {
        related.push(other.id);
      }
    }

    return related;
  }

  /**
   * Confirm a business rule candidate
   */
  private async confirmCandidate(candidate: BusinessRuleCandidate, userId: string): Promise<BusinessRuleCandidate> {
    const confirmed = await storage.updateBusinessRuleCandidate(candidate.id, {
      status: 'confirmed',
      reviewedBy: userId,
      reviewedAt: new Date(),
      confidence: Math.min(100, candidate.confidence + 20) // Boost confidence
    });

    // Create entry in confirmed rules catalog
    await this.addToRuleCatalog(confirmed, userId);

    return confirmed;
  }

  /**
   * Reject a business rule candidate
   */
  private async rejectCandidate(
    candidate: BusinessRuleCandidate, 
    userId: string, 
    reason: string
  ): Promise<BusinessRuleCandidate> {
    return await storage.updateBusinessRuleCandidate(candidate.id, {
      status: 'rejected',
      reviewedBy: userId,
      reviewedAt: new Date(),
      confidence: 0
    });
  }

  /**
   * Modify a business rule candidate
   */
  private async modifyCandidate(
    candidate: BusinessRuleCandidate,
    modifications: Partial<BusinessRuleCandidate>,
    userId: string
  ): Promise<BusinessRuleCandidate> {
    return await storage.updateBusinessRuleCandidate(candidate.id, {
      ...modifications,
      reviewedBy: userId,
      reviewedAt: new Date()
    });
  }

  // Helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateClusterId(): string {
    return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getEnhancedCandidate(candidateId: string): Promise<EnhancedRuleCandidate> {
    // Implementation to get enhanced candidate
    throw new Error('Not implemented');
  }

  private async getValidationHistory(candidateId: string): Promise<ValidationEvent[]> {
    // Implementation to get validation history
    return [];
  }

  private async inferBusinessContext(candidate: BusinessRuleCandidate, program: Program): Promise<BusinessContext> {
    // Implementation to infer business context
    return {
      domain: 'Unknown',
      process: 'Unknown',
      stakeholders: [],
      businessImpact: 'medium',
      frequency: 'often',
      exceptions: []
    };
  }

  private findMergeOpportunities(candidates: EnhancedRuleCandidate[]): RuleRecommendation[] {
    // Implementation to find merge opportunities
    return [];
  }

  private findSplitOpportunities(candidates: EnhancedRuleCandidate[]): RuleRecommendation[] {
    // Implementation to find split opportunities
    return [];
  }

  private findRefinementOpportunities(candidates: EnhancedRuleCandidate[]): RuleRecommendation[] {
    // Implementation to find refinement opportunities
    return [];
  }

  private groupByPatterns(candidates: EnhancedRuleCandidate[]): Map<string, EnhancedRuleCandidate[]> {
    // Implementation to group by patterns
    return new Map();
  }

  private inferBusinessDomain(candidates: EnhancedRuleCandidate[]): string {
    // Implementation to infer business domain
    return 'Unknown';
  }

  private calculateClusterConfidence(candidates: EnhancedRuleCandidate[]): number {
    // Implementation to calculate cluster confidence
    return 0.5;
  }

  private calculateVariableOverlap(vars1: string[], vars2: string[]): number {
    const set1 = new Set(vars1);
    const set2 = new Set(vars2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private calculateLocationProximity(loc1: any, loc2: any): number {
    // Implementation to calculate location proximity
    return 0;
  }

  private calculateConditionSimilarity(cond1: string[], cond2: string[]): number {
    // Implementation to calculate condition similarity
    return 0;
  }

  private async addToRuleCatalog(candidate: BusinessRuleCandidate, userId: string): Promise<void> {
    // Implementation to add to rule catalog
  }

  private async getConfirmedRules(programId?: number): Promise<ConfirmedBusinessRule[]> {
    // Implementation to get confirmed rules
    return [];
  }

  private async getRuleCategories(): Promise<RuleCategory[]> {
    // Implementation to get rule categories
    return [];
  }

  private async getRuleRelationships(): Promise<RuleRelationship[]> {
    // Implementation to get rule relationships
    return [];
  }

  private async calculateCoverage(): Promise<CoverageMetrics> {
    // Implementation to calculate coverage
    return {
      totalPrograms: 0,
      programsWithRules: 0,
      averageRulesPerProgram: 0,
      coveragePercentage: 0,
      uncoveredPrograms: []
    };
  }

  private convertToXML(rules: ConfirmedBusinessRule[]): string {
    // Implementation to convert to XML
    return '';
  }

  private convertToCSV(rules: ConfirmedBusinessRule[]): string {
    // Implementation to convert to CSV
    return '';
  }

  private generateBusinessGlossary(rules: ConfirmedBusinessRule[]): string {
    // Implementation to generate business glossary
    return '';
  }
}

// Export singleton instance
export const businessRuleWorkbench = new BusinessRuleWorkbench();