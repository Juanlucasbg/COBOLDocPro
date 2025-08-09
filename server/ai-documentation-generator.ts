/*
Fine-tuned LLM Integration for COBOL Documentation Platform
This module supports custom fine-tuned LLM endpoints for COBOL documentation generation
*/

import type { StaticAnalysisResult, Program, BusinessRule, CodeMetrics } from './cobol-analyzer';

// Configuration for fine-tuned LLM integration
interface FineTunedLLMConfig {
  endpoint: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// Default configuration - can be overridden via environment variables
const LLM_CONFIG: FineTunedLLMConfig = {
  endpoint: process.env.FINE_TUNED_LLM_ENDPOINT || 'http://localhost:8000/v1/chat/completions',
  apiKey: process.env.FINE_TUNED_LLM_API_KEY,
  model: process.env.FINE_TUNED_LLM_MODEL || 'cobol-docs-fine-tuned',
  maxTokens: parseInt(process.env.FINE_TUNED_LLM_MAX_TOKENS || '4000'),
  temperature: parseFloat(process.env.FINE_TUNED_LLM_TEMPERATURE || '0.1')
};

export interface DocumentationResult {
  overview: string;
  technicalDetails: string;
  businessLogic: string;
  dataFlow: string;
  architectureAnalysis: string;
  memberFile: string;
  qualityAssessment: QualityAssessment;
  recommendations: string[];
  diagrams: DiagramSpecification[];
}

export interface QualityAssessment {
  overallScore: number;
  maintainability: number;
  readability: number;
  testability: number;
  performance: number;
  security: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'MAINTAINABILITY' | 'PERFORMANCE' | 'SECURITY' | 'STYLE' | 'LOGIC';
  description: string;
  location: {
    program: string;
    lineNumber?: number;
    paragraph?: string;
  };
  recommendation: string;
}

export interface DiagramSpecification {
  type: 'FLOWCHART' | 'SEQUENCE' | 'ARCHITECTURE' | 'DATA_FLOW';
  title: string;
  mermaidCode: string;
  description: string;
}

export class AIDocumentationGenerator {
  private config: FineTunedLLMConfig;
  
  constructor(config?: Partial<FineTunedLLMConfig>) {
    this.config = { ...LLM_CONFIG, ...config };
  }
  
  async generateComprehensiveDocumentation(
    analysisResults: StaticAnalysisResult[],
    repositoryName: string
  ): Promise<DocumentationResult> {
    
    const staticContext = this.prepareStaticContext(analysisResults);
    
    try {
      // Generate different sections in parallel for efficiency
      const [
        overview,
        technicalDetails,
        businessLogic,
        dataFlow,
        architectureAnalysis,
        memberFile,
        qualityAssessment,
        recommendations,
        diagrams
      ] = await Promise.all([
        this.generateOverview(staticContext, repositoryName),
        this.generateTechnicalDetails(staticContext),
        this.generateBusinessLogic(staticContext),
        this.generateDataFlow(staticContext),
        this.generateArchitectureAnalysis(staticContext),
        this.generateMemberFile(staticContext),
        this.generateQualityAssessment(staticContext),
        this.generateRecommendations(staticContext),
        this.generateDiagrams(staticContext)
      ]);

      return {
        overview,
        technicalDetails,
        businessLogic,
        dataFlow,
        architectureAnalysis,
        memberFile,
        qualityAssessment,
        recommendations,
        diagrams
      };
    } catch (error) {
      console.error('Error generating AI documentation:', error);
      // Return fallback documentation based on static analysis
      return this.generateFallbackDocumentation(analysisResults, repositoryName);
    }
  }

  private async callFineTunedLLM(prompt: string, systemMessage?: string): Promise<string> {
    try {
      const messages = [];
      
      if (systemMessage) {
        messages.push({ role: 'system', content: systemMessage });
      }
      
      messages.push({ role: 'user', content: prompt });

      const requestBody = {
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`LLM API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      
      throw new Error('Invalid response format from fine-tuned LLM');
    } catch (error) {
      console.error('Fine-tuned LLM call failed:', error);
      throw error;
    }
  }

  private generateFallbackDocumentation(
    analysisResults: StaticAnalysisResult[],
    repositoryName: string
  ): DocumentationResult {
    // Generate basic documentation from static analysis when LLM is unavailable
    const totalFiles = analysisResults.length;
    const totalPrograms = analysisResults.reduce((sum, result) => sum + result.programs.length, 0);
    const totalLines = analysisResults.reduce((sum, result) => sum + result.metrics.linesOfCode, 0);
    
    return {
      overview: `# ${repositoryName} - Static Analysis Overview\n\nRepository contains ${totalFiles} COBOL files with ${totalPrograms} programs and ${totalLines} lines of code.\n\n## Files Analyzed:\n${analysisResults.map(r => `- ${r.fileName} (${r.metrics.linesOfCode} LOC)`).join('\n')}`,
      technicalDetails: `# Technical Details\n\nStatic analysis completed for ${repositoryName}. Detailed technical analysis requires fine-tuned LLM integration.`,
      businessLogic: `# Business Logic\n\nBusiness rule extraction completed. Advanced analysis requires fine-tuned LLM integration.`,
      dataFlow: `# Data Flow\n\nData flow analysis based on static code inspection. Enhanced analysis requires fine-tuned LLM integration.`,
      architectureAnalysis: `# Architecture Analysis\n\nBasic architectural overview from static analysis. Comprehensive analysis requires fine-tuned LLM integration.`,
      memberFile: `# Member File\n\nProgram inventory and basic relationships identified. Detailed member file generation requires fine-tuned LLM integration.`,
      qualityAssessment: {
        overallScore: 75,
        maintainability: 70,
        readability: 75,
        testability: 60,
        performance: 80,
        security: 70,
        issues: []
      },
      recommendations: [
        "Set up fine-tuned LLM integration for comprehensive documentation",
        "Review static analysis results for immediate insights",
        "Configure LLM endpoint in environment variables"
      ],
      diagrams: [{
        type: 'FLOWCHART',
        title: 'Repository Structure',
        mermaidCode: 'graph TD\n    A[Repository] --> B[COBOL Files]\n    B --> C[Programs]\n    C --> D[Analysis]',
        description: 'Basic repository structure overview'
      }]
    };
  }

  private prepareStaticContext(analysisResults: StaticAnalysisResult[]): string {
    let context = "# COBOL Repository Static Analysis Context\n\n";
    
    for (const result of analysisResults) {
      context += `## File: ${result.fileName}\n`;
      context += `Path: ${result.filePath}\n\n`;
      
      // Programs information
      if (result.programs.length > 0) {
        context += "### Programs:\n";
        for (const program of result.programs) {
          context += `- **${program.name}** (${program.type})\n`;
          context += `  - Author: ${program.author || 'Unknown'}\n`;
          context += `  - Divisions: ${program.division}\n`;
          context += `  - Paragraphs: ${program.paragraphs.length}\n`;
          context += `  - Variables: ${program.variables.length}\n`;
          
          // Key paragraphs
          if (program.paragraphs.length > 0) {
            context += "  - Key Paragraphs:\n";
            program.paragraphs.slice(0, 5).forEach(p => {
              context += `    - ${p.name} (Line ${p.lineNumber}): ${p.statements.length} statements\n`;
            });
          }
        }
        context += "\n";
      }
      
      // Data elements
      if (result.dataElements.length > 0) {
        context += "### Data Elements:\n";
        result.dataElements.slice(0, 10).forEach(de => {
          context += `- ${de.name}: ${de.type} (Used ${de.usageCount} times)\n`;
        });
        context += "\n";
      }
      
      // Dependencies
      if (result.dependencies.length > 0) {
        context += "### Dependencies:\n";
        result.dependencies.forEach(dep => {
          context += `- ${dep.type}: ${dep.from} → ${dep.to}\n`;
        });
        context += "\n";
      }
      
      // Metrics
      context += "### Code Metrics:\n";
      context += `- Lines of Code: ${result.metrics.linesOfCode}\n`;
      context += `- Cyclomatic Complexity: ${result.metrics.cyclomaticComplexity}\n`;
      context += `- Maintainability Index: ${result.metrics.maintainabilityIndex}\n`;
      context += `- Procedures: ${result.metrics.procedures}\n`;
      context += `- Data Items: ${result.metrics.dataItems}\n\n`;
      
      // Business Rules
      if (result.businessRules.length > 0) {
        context += "### Business Rules:\n";
        result.businessRules.forEach(rule => {
          context += `- ${rule.type}: ${rule.description}\n`;
          context += `  - Location: ${rule.location.program} line ${rule.location.lineNumber}\n`;
          if (rule.conditions.length > 0) {
            context += `  - Conditions: ${rule.conditions.join(', ')}\n`;
          }
        });
        context += "\n";
      }
    }
    
    return context;
  }

  private async generateOverview(staticContext: string, repositoryName: string): Promise<string> {
    const systemMessage = "You are a COBOL documentation expert specializing in enterprise-level code analysis and documentation generation.";
    
    const prompt = `Based on the static analysis below, generate a comprehensive overview of the ${repositoryName} COBOL repository.

${staticContext}

Generate a clear, professional overview that includes:
1. Repository purpose and main functionality
2. Key programs and their roles
3. Overall architecture and design patterns
4. Business domain and use cases
5. Technology stack and dependencies

Write in a professional, technical style suitable for enterprise documentation.`;

    return await this.callFineTunedLLM(prompt, systemMessage);
  }

  private async generateTechnicalDetails(staticContext: string): Promise<string> {
    const systemMessage = "You are a COBOL technical documentation specialist with deep knowledge of enterprise COBOL systems.";
    
    const prompt = `Based on the static analysis context, generate detailed technical documentation covering:

${staticContext}

Generate comprehensive technical details including:
1. Program structure and organization
2. Data structures and file layouts
3. Control flow and program logic
4. Error handling mechanisms
5. Performance considerations
6. Integration points and interfaces

Focus on technical implementation details that would help developers understand and maintain the code.`;

    return await this.callFineTunedLLM(prompt, systemMessage);
  }

  private async generateBusinessLogic(staticContext: string): Promise<string> {
    const systemMessage = "You are a business analyst specializing in COBOL legacy systems and business rule extraction.";
    
    const prompt = `Analyze the business logic embedded in this COBOL code and generate documentation covering:

${staticContext}

Generate business logic documentation including:
1. Business rules and validations
2. Calculation logic and formulas
3. Decision trees and conditional processing
4. Data transformation rules
5. Business process workflows
6. Compliance and regulatory requirements

Focus on the business meaning and purpose of the code logic.`;

    return await this.callFineTunedLLM(prompt, systemMessage);
  }

  private async generateDataFlow(staticContext: string): Promise<string> {
    const systemMessage = "You are a data flow analyst with expertise in COBOL data processing and transformation patterns.";
    
    const prompt = `Analyze the data flow in this COBOL system and generate documentation covering:

${staticContext}

Generate data flow documentation including:
1. Input/output data structures
2. Data transformation processes
3. Variable usage and scope
4. File processing patterns
5. Data validation and verification
6. Inter-program data exchange

Focus on how data moves through the system and is transformed.`;

    return await this.callFineTunedLLM(prompt, systemMessage);
  }

  private async generateArchitectureAnalysis(staticContext: string): Promise<string> {
    const systemMessage = "You are a software architect specializing in legacy COBOL system architecture and modernization.";
    
    const prompt = `Analyze the architecture of this COBOL system and generate documentation covering:

${staticContext}

Generate architecture analysis including:
1. System components and modules
2. Program relationships and dependencies
3. Layered architecture patterns
4. Coupling and cohesion analysis
5. Scalability and maintainability aspects
6. Integration patterns and interfaces

Focus on high-level architectural decisions and design patterns.`;

    return await this.callFineTunedLLM(prompt, systemMessage);
  }

  private async generateMemberFile(staticContext: string): Promise<string> {
    const systemMessage = "You are a COBOL documentation specialist creating comprehensive member files and decision trees for enterprise systems.";
    
    const prompt = `Generate a comprehensive member file (decision tree) documentation for this COBOL system:

${staticContext}

Create a structured member file that includes:
1. Program inventory and descriptions
2. Module dependencies and call trees
3. Decision trees for key business logic
4. Data element cross-references
5. File and copybook relationships
6. Processing flow diagrams

Format as a professional technical reference document with clear hierarchical structure.`;

    return await this.callFineTunedLLM(prompt, systemMessage);
  }

  private async generateQualityAssessment(staticContext: string): Promise<QualityAssessment> {
    const systemMessage = "You are a COBOL code quality assessor. Respond only with valid JSON format.";
    
    const prompt = `Perform a comprehensive quality assessment of this COBOL code:

${staticContext}

Analyze and provide scores (0-100) for:
1. Maintainability
2. Readability  
3. Testability
4. Performance
5. Security

Also identify specific quality issues with severity levels and recommendations.

Respond in JSON format with the following structure:
{
  "overallScore": number,
  "maintainability": number,
  "readability": number,
  "testability": number,
  "performance": number,
  "security": number,
  "issues": [
    {
      "severity": "HIGH|MEDIUM|LOW",
      "category": "MAINTAINABILITY|PERFORMANCE|SECURITY|STYLE|LOGIC",
      "description": "Issue description",
      "location": {
        "program": "program name",
        "lineNumber": number,
        "paragraph": "paragraph name"
      },
      "recommendation": "How to fix this issue"
    }
  ]
}`;

    try {
      const jsonText = await this.callFineTunedLLM(prompt, systemMessage);
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Error parsing quality assessment JSON:', error);
      return {
        overallScore: 75,
        maintainability: 70,
        readability: 75,
        testability: 65,
        performance: 80,
        security: 70,
        issues: []
      };
    }
  }

  private async generateRecommendations(staticContext: string): Promise<string[]> {
    const systemMessage = "You are a COBOL modernization consultant. Respond only with a valid JSON array of recommendation strings.";
    
    const prompt = `Based on the analysis of this COBOL system, provide specific recommendations for improvement:

${staticContext}

Generate actionable recommendations covering:
1. Code refactoring opportunities
2. Performance optimizations
3. Maintainability improvements
4. Security enhancements
5. Documentation gaps
6. Testing strategies
7. Modernization approaches

Return as a JSON array of recommendation strings.`;

    try {
      const jsonText = await this.callFineTunedLLM(prompt, systemMessage);
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Error parsing recommendations JSON:', error);
      return [
        "Review code structure for optimization opportunities",
        "Implement comprehensive error handling",
        "Add detailed inline documentation",
        "Consider modularization of large programs",
        "Implement automated testing procedures"
      ];
    }
  }

  private async generateDiagrams(staticContext: string): Promise<DiagramSpecification[]> {
    const systemMessage = "You are a COBOL system visualization expert. Respond only with valid JSON format.";
    
    const prompt = `Generate Mermaid diagram specifications for this COBOL system:

${staticContext}

Create diagram specifications in JSON format for:
1. System flowchart showing program flow
2. Architecture diagram showing system components
3. Data flow diagram showing data movement
4. Dependency diagram showing program relationships

Return as JSON array with this structure:
[
  {
    "type": "FLOWCHART|SEQUENCE|ARCHITECTURE|DATA_FLOW",
    "title": "Diagram title",
    "mermaidCode": "Valid Mermaid syntax",
    "description": "Diagram description"
  }
]`;

    try {
      const jsonText = await this.callFineTunedLLM(prompt, systemMessage);
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Error parsing diagrams JSON:', error);
      return [
        {
          type: 'FLOWCHART',
          title: 'System Overview',
          mermaidCode: 'graph TD\n    A[Start] --> B[Process]\n    B --> C[End]',
          description: 'High-level system flow'
        }
      ];
    }
  }
}