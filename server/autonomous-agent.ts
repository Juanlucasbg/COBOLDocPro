// Autonomous COBOL Documentation Agent
// Inspired by the Flask application's agent system for intelligent analysis

import { observabilityTracker, agentMonitor } from './observability';
import { generateClaudeProgramSummary, generateClaudeSystemExplanation, generateClaudeMermaidDiagram } from './coco-llm';
import { CobolParser, type ParsedProgram } from './cobol-parser';

interface AgentMemoryItem {
  type: 'analysis' | 'decision' | 'preference' | 'feedback';
  content: any;
  timestamp: string;
  programId?: number;
}

interface UserPreferences {
  detailLevel?: 'low' | 'medium' | 'high';
  audience?: 'technical' | 'business';
  aiProvider?: 'friendli' | 'openai';
  diagramType?: 'flowchart' | 'sequence' | 'class';
  analysisDepth?: 'basic' | 'comprehensive';
}

export class COBOLDocumentationAgent {
  private sessionId: string;
  private memory: AgentMemoryItem[] = [];
  private userPreferences: UserPreferences = {};
  private maxMemoryItems = 10;

  constructor(sessionId?: string, userId?: string) {
    this.sessionId = agentMonitor.startSession(
      sessionId,
      userId,
      { agent_type: "cobol_documentation" }
    );
    
    // Set default preferences
    this.userPreferences = {
      detailLevel: 'medium',
      audience: 'technical',
      aiProvider: 'friendli',
      diagramType: 'flowchart',
      analysisDepth: 'comprehensive'
    };
    
    console.log(`[Agent] Initialized COBOL Documentation Agent with session ${this.sessionId}`);
  }

  setUserPreference(key: keyof UserPreferences, value: any): void {
    this.userPreferences[key] = value;
    this.remember('preference', { key, value });
    console.log(`[Agent] Set user preference: ${key} = ${value}`);
  }

  getUserPreference(key: keyof UserPreferences, defaultValue?: any): any {
    return this.userPreferences[key] || defaultValue;
  }

  private remember(type: AgentMemoryItem['type'], content: any, programId?: number): void {
    const memoryItem: AgentMemoryItem = {
      type,
      content,
      timestamp: new Date().toISOString(),
      programId
    };

    this.memory.push(memoryItem);

    // Limit memory size
    if (this.memory.length > this.maxMemoryItems) {
      this.memory.shift();
    }

    console.log(`[Agent] Added memory item: ${type}`);
  }

  async analyzeCobolStructure(sourceCode: string, programId?: number): Promise<any> {
    const operationSpan = observabilityTracker.startSpan(
      "autonomous_cobol_analysis",
      { 
        code_length: sourceCode.length,
        program_id: programId,
        user_preferences: this.userPreferences
      }
    );

    try {
      // Agent decision: Determine parsing approach
      const parsingDecision = agentMonitor.logDecision(
        "parsing_approach_selection",
        { 
          code_sample: sourceCode.substring(0, 200) + "...",
          code_length: sourceCode.length,
          user_preferences: this.userPreferences
        },
        "Analyzing code complexity and structure to determine optimal parsing strategy"
      );

      // Parse the COBOL code
      const parser = new CobolParser();
      const parsedStructure = parser.parse(sourceCode);
      
      this.remember('analysis', { 
        type: 'parsing_completed',
        structure: parsedStructure,
        lines_of_code: parsedStructure.linesOfCode
      }, programId);

      // Agent decision: Identify focus areas based on code complexity
      const focusAreas = this.identifyFocusAreas(parsedStructure);
      const focusDecision = agentMonitor.logDecision(
        "code_focus_identification",
        { parsed_structure: parsedStructure },
        `Identified key areas to focus on: ${focusAreas.join(', ')}`,
        { focus_areas: focusAreas }
      );

      // Prepare analysis based on user preferences
      const analysisPrompt = this.buildAnalysisPrompt(sourceCode, parsedStructure, focusAreas);
      
      // Agent decision: Select AI analysis strategy
      const aiStrategyDecision = agentMonitor.logDecision(
        "ai_analysis_strategy",
        { 
          focus_areas: focusAreas,
          user_audience: this.userPreferences.audience,
          detail_level: this.userPreferences.detailLevel
        },
        `Using ${this.userPreferences.audience} audience approach with ${this.userPreferences.detailLevel} detail level`
      );

      // Generate comprehensive analysis
      const results = await this.performAIAnalysis(analysisPrompt, parsedStructure, programId);
      
      this.remember('analysis', {
        type: 'ai_analysis_completed',
        results,
        focus_areas: focusAreas
      }, programId);

      observabilityTracker.endSpan(operationSpan, results);
      return results;

    } catch (error) {
      agentMonitor.logError("cobol_analysis", error as Error, {
        program_id: programId,
        session_id: this.sessionId
      });
      observabilityTracker.endSpan(operationSpan, null, (error as Error).message);
      throw error;
    }
  }

  private identifyFocusAreas(parsedStructure: ParsedProgram): string[] {
    const focusAreas: string[] = [];
    
    // Analyze program complexity
    if (parsedStructure.linesOfCode > 1000) {
      focusAreas.push('modularization', 'performance_optimization');
    }
    
    if (parsedStructure.dataElements.length > 50) {
      focusAreas.push('data_management', 'variable_optimization');
    }
    
    if (parsedStructure.relationships.length > 20) {
      focusAreas.push('program_flow', 'dependency_analysis');
    }
    
    // Always include basic areas
    focusAreas.push('business_logic', 'documentation_quality');
    
    return focusAreas;
  }

  private buildAnalysisPrompt(sourceCode: string, parsedStructure: ParsedProgram, focusAreas: string[]): string {
    let prompt = `Analyze this COBOL program with the following structure:\n\n`;
    prompt += `Program: ${parsedStructure.name}\n`;
    prompt += `Lines of Code: ${parsedStructure.linesOfCode}\n`;
    prompt += `Divisions: ${parsedStructure.divisions.length}\n`;
    prompt += `Data Elements: ${parsedStructure.dataElements.length}\n`;
    prompt += `Relationships: ${parsedStructure.relationships.length}\n\n`;

    // Add user preference-based instructions
    if (this.userPreferences.audience === 'business') {
      prompt += `Target audience: Business stakeholders with limited technical knowledge.\n`;
      prompt += `Focus on business impact, process flows, and practical implications.\n`;
    } else {
      prompt += `Target audience: Technical developers with COBOL expertise.\n`;
      prompt += `Include technical details, code structure, and implementation specifics.\n`;
    }

    if (this.userPreferences.detailLevel === 'high') {
      prompt += `Provide highly detailed analysis with comprehensive breakdown of all code elements.\n`;
    } else if (this.userPreferences.detailLevel === 'low') {
      prompt += `Provide a simplified overview focusing only on key program elements.\n`;
    }

    prompt += `\nFocus Areas: ${focusAreas.join(', ')}\n\n`;
    prompt += `Source Code:\n${sourceCode}\n\n`;
    prompt += `Provide analysis in JSON format with comprehensive insights.`;

    return prompt;
  }

  private async performAIAnalysis(prompt: string, parsedStructure: ParsedProgram, programId?: number): Promise<any> {
    const analysisSpan = observabilityTracker.startSpan(
      "ai_comprehensive_analysis",
      { program_id: programId }
    );

    try {
      // Generate program summary using Anthropic Claude
      const summaryResult = await generateClaudeProgramSummary(
        parsedStructure.name,
        parsedStructure.divisions.map(d => d.name).join(', ')
      );

      // Generate system explanation using Claude
      const systemExplanation = await generateClaudeSystemExplanation(
        parsedStructure.name,
        summaryResult.summary
      );

      // Generate Mermaid diagram based on user preference using Claude
      const diagramType = this.userPreferences.diagramType === 'sequence' ? 'sequenceDiagram' : 'flowchart';
      const mermaidDiagram = await generateClaudeMermaidDiagram(
        parsedStructure.name,
        systemExplanation.plainEnglishSummary,
        diagramType
      );

      const results = {
        programSummary: summaryResult,
        systemExplanation,
        mermaidDiagram,
        parsedStructure,
        analysisMetadata: {
          focusAreas: this.identifyFocusAreas(parsedStructure),
          userPreferences: this.userPreferences,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        }
      };

      observabilityTracker.endSpan(analysisSpan, results);
      return results;

    } catch (error) {
      agentMonitor.logError("ai_analysis", error as Error, {
        program_id: programId,
        session_id: this.sessionId
      });
      observabilityTracker.endSpan(analysisSpan, null, (error as Error).message);
      throw error;
    }
  }

  async evaluateDocumentationQuality(documentation: any, programId?: number): Promise<{
    score: number;
    suggestions: string[];
    completeness: number;
  }> {
    const evaluationSpan = observabilityTracker.startSpan(
      "documentation_quality_evaluation",
      { program_id: programId }
    );

    try {
      // Agent decision: Evaluate documentation completeness
      const completenessScore = this.calculateCompleteness(documentation);
      const qualityScore = this.calculateQualityScore(documentation);
      
      const suggestions: string[] = [];
      
      if (!documentation.systemExplanation) {
        suggestions.push("Add system explanation for better understanding");
      }
      
      if (!documentation.mermaidDiagram) {
        suggestions.push("Include visual diagrams for better comprehension");
      }
      
      if (completenessScore < 0.7) {
        suggestions.push("Improve documentation completeness");
      }

      const evaluation = {
        score: qualityScore,
        suggestions,
        completeness: completenessScore
      };

      agentMonitor.logDecision(
        "documentation_quality_assessment",
        { documentation_sections: Object.keys(documentation) },
        `Documentation quality score: ${qualityScore.toFixed(2)}, completeness: ${completenessScore.toFixed(2)}`,
        evaluation
      );

      this.remember('feedback', {
        type: 'quality_evaluation',
        evaluation,
        program_id: programId
      }, programId);

      observabilityTracker.endSpan(evaluationSpan, evaluation);
      return evaluation;

    } catch (error) {
      agentMonitor.logError("quality_evaluation", error as Error, {
        program_id: programId
      });
      observabilityTracker.endSpan(evaluationSpan, null, (error as Error).message);
      throw error;
    }
  }

  private calculateCompleteness(documentation: any): number {
    const requiredSections = ['programSummary', 'systemExplanation', 'mermaidDiagram'];
    const presentSections = requiredSections.filter(section => documentation[section]);
    return presentSections.length / requiredSections.length;
  }

  private calculateQualityScore(documentation: any): number {
    let score = 0.5; // Base score
    
    if (documentation.programSummary?.summary?.length > 100) score += 0.2;
    if (documentation.systemExplanation?.plainEnglishSummary?.length > 200) score += 0.2;
    if (documentation.mermaidDiagram?.mermaidCode?.length > 100) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  getSessionMetrics(): any {
    return {
      sessionId: this.sessionId,
      memoryItems: this.memory.length,
      userPreferences: this.userPreferences,
      recentAnalyses: this.memory.filter(item => item.type === 'analysis').slice(-5),
      observabilityData: observabilityTracker.getSessionMetrics(this.sessionId)
    };
  }

  cleanup(): void {
    try {
      agentMonitor.endSession(this.sessionId);
      console.log(`[Agent] Cleaned up session ${this.sessionId}`);
    } catch (error) {
      console.error(`[Agent] Error during cleanup:`, error);
    }
  }
}