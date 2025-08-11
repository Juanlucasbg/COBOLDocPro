/**
 * OpenRouter Client for AI-powered COBOL documentation generation
 * Using GLM-4.5 model for intelligent code analysis and business rule extraction
 */

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CobolDocumentationRequest {
  sourceCode: string;
  programName: string;
  context?: string;
}

export interface AIGeneratedDocumentation {
  summary: string;
  businessPurpose: string;
  keyBusinessRules: Array<{
    rule: string;
    description: string;
    location: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  dataFlowDescription: string;
  riskAssessment: {
    complexity: 'HIGH' | 'MEDIUM' | 'LOW';
    maintainability: 'HIGH' | 'MEDIUM' | 'LOW';
    businessCriticality: 'HIGH' | 'MEDIUM' | 'LOW';
    recommendations: string[];
  };
  technicalNotes: string[];
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private model = 'deepseek/deepseek-chat'; // Using DeepSeek as a reliable alternative

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }

  /**
   * Generate comprehensive AI documentation for COBOL code
   */
  async generateCobolDocumentation(request: CobolDocumentationRequest): Promise<AIGeneratedDocumentation> {
    const prompt = this.buildCobolAnalysisPrompt(request);
    
    try {
      const response = await this.chatCompletion([
        {
          role: 'system',
          content: 'You are an expert COBOL analyst and technical writer specializing in legacy system documentation and business rule extraction. Provide detailed, accurate analysis in the requested JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      return this.parseDocumentationResponse(response);
    } catch (error) {
      console.error('OpenRouter API error:', error);
      return this.generateFallbackDocumentation(request);
    }
  }

  /**
   * Generate business rule explanations
   */
  async extractBusinessRules(sourceCode: string, programName: string): Promise<Array<{
    rule: string;
    description: string;
    location: string;
    confidence: number;
  }>> {
    const prompt = `
Analyze this COBOL program and extract all business rules, logic patterns, and decision points:

Program: ${programName}

\`\`\`cobol
${sourceCode}
\`\`\`

Extract business rules in this JSON format:
{
  "businessRules": [
    {
      "rule": "Brief rule description",
      "description": "Detailed explanation of the business logic",
      "location": "Line number or paragraph name",
      "confidence": 0.95
    }
  ]
}

Focus on:
- Conditional logic (IF statements, EVALUATE)
- Data validation rules
- Calculation formulas
- Business decision points
- Error handling patterns
- Data transformation rules
`;

    try {
      const response = await this.chatCompletion([
        {
          role: 'system',
          content: 'You are a COBOL business analyst. Extract business rules accurately and provide confidence scores.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const parsed = JSON.parse(response.choices[0].message.content);
      return parsed.businessRules || [];
    } catch (error) {
      console.error('Error extracting business rules:', error);
      return [];
    }
  }

  /**
   * Generate plain English explanation of COBOL code
   */
  async generatePlainEnglishSummary(sourceCode: string, programName: string): Promise<string> {
    const prompt = `
Explain this COBOL program in plain English that a business user could understand:

Program: ${programName}

\`\`\`cobol
${sourceCode}
\`\`\`

Provide a clear, concise explanation focusing on:
1. What the program does from a business perspective
2. What data it processes
3. What outputs it produces
4. Key business logic or decisions
5. Any important business rules

Keep the explanation simple and avoid technical jargon.
`;

    try {
      const response = await this.chatCompletion([
        {
          role: 'system',
          content: 'You are a technical translator who explains complex COBOL programs in simple business terms.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating summary:', error);
      return `This COBOL program (${programName}) performs data processing operations. Unable to generate detailed summary at this time.`;
    }
  }

  /**
   * Assess code quality and provide recommendations
   */
  async assessCodeQuality(sourceCode: string, programName: string): Promise<{
    qualityScore: number;
    issues: Array<{
      type: 'COMPLEXITY' | 'MAINTAINABILITY' | 'SECURITY' | 'PERFORMANCE';
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      description: string;
      recommendation: string;
    }>;
    strengths: string[];
  }> {
    const prompt = `
Analyze this COBOL program for code quality, maintainability, and potential issues:

Program: ${programName}

\`\`\`cobol
${sourceCode}
\`\`\`

Provide analysis in this JSON format:
{
  "qualityScore": 85,
  "issues": [
    {
      "type": "COMPLEXITY",
      "severity": "MEDIUM",
      "description": "High cyclomatic complexity in main logic",
      "recommendation": "Consider breaking down into smaller paragraphs"
    }
  ],
  "strengths": [
    "Good error handling patterns",
    "Clear data structure definitions"
  ]
}

Evaluate:
- Code complexity and readability
- Error handling patterns
- Data structure design
- Performance considerations
- Security implications
- Maintainability factors
`;

    try {
      const response = await this.chatCompletion([
        {
          role: 'system',
          content: 'You are a COBOL code quality expert. Provide thorough, actionable analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error assessing code quality:', error);
      return {
        qualityScore: 70,
        issues: [],
        strengths: ['Program structure appears standard']
      };
    }
  }

  private async chatCompletion(messages: OpenRouterMessage[]): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cobol-clarity-engine.replit.app',
        'X-Title': 'COBOL ClarityEngine'
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 4000,
        temperature: 0.1,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  private buildCobolAnalysisPrompt(request: CobolDocumentationRequest): string {
    return `
Analyze this COBOL program and provide comprehensive documentation:

Program: ${request.programName}
${request.context ? `Context: ${request.context}` : ''}

\`\`\`cobol
${request.sourceCode}
\`\`\`

Provide analysis in this exact JSON format:
{
  "summary": "Brief program overview",
  "businessPurpose": "What this program accomplishes from a business perspective",
  "keyBusinessRules": [
    {
      "rule": "Rule name",
      "description": "Detailed explanation",
      "location": "Line/paragraph reference",
      "impact": "HIGH"
    }
  ],
  "dataFlowDescription": "How data flows through the program",
  "riskAssessment": {
    "complexity": "MEDIUM",
    "maintainability": "HIGH",
    "businessCriticality": "HIGH",
    "recommendations": ["Specific actionable recommendations"]
  },
  "technicalNotes": ["Important technical observations"]
}

Focus on business value, not just technical details.
`;
  }

  private parseDocumentationResponse(response: OpenRouterResponse): AIGeneratedDocumentation {
    try {
      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Error parsing OpenRouter response:', error);
      return this.generateFallbackDocumentation({
        sourceCode: '',
        programName: 'Unknown'
      });
    }
  }

  private generateFallbackDocumentation(request: CobolDocumentationRequest): AIGeneratedDocumentation {
    return {
      summary: `COBOL program ${request.programName} performs data processing operations.`,
      businessPurpose: 'This program handles business data processing requirements.',
      keyBusinessRules: [],
      dataFlowDescription: 'Data is processed according to program logic.',
      riskAssessment: {
        complexity: 'MEDIUM',
        maintainability: 'MEDIUM',
        businessCriticality: 'MEDIUM',
        recommendations: ['Manual review recommended', 'Consider modernization assessment']
      },
      technicalNotes: ['AI analysis temporarily unavailable - manual review recommended']
    };
  }
}