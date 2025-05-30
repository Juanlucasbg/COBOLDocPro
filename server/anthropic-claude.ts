import Anthropic from '@anthropic-ai/sdk';
import { safeParseJSON, retryOperation } from './error-handler';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released after your knowledge cutoff
const MODEL = "claude-3-5-sonnet-20241022";

// Enhanced Anthropic API caller with better error handling
async function callAnthropicAPI(prompt: string, options: any = {}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }

  const message = await anthropic.messages.create({
    max_tokens: options.max_tokens || 2000,
    messages: [
      {
        role: 'user', 
        content: `${prompt}

CRITICAL: Your response must be ONLY valid JSON. No explanations, no markdown, no code blocks. Start with { and end with }.`
      }
    ],
    model: MODEL,
    temperature: options.temperature || 0.1, // Lower temperature for more consistent JSON
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}

// Program summary generation using Claude
export async function generateClaudeProgramSummary(
  programName: string,
  divisions: string,
  sourceCode?: string
): Promise<any> {
  return retryOperation(async () => {
    const prompt = `Analyze this COBOL program and provide a JSON response with the following structure:
{
  "summary": "Brief description of what the program does",
  "purpose": "Main business purpose",
  "inputs": ["list", "of", "input", "sources"],
  "outputs": ["list", "of", "outputs"],
  "keyProcessingLogic": "Description of main processing steps",
  "complexity": "Low|Medium|High"
}

Program Name: ${programName}
Divisions: ${divisions}
${sourceCode ? `Source Code: ${sourceCode.substring(0, 2000)}` : ''}

Please provide only the JSON response without any markdown formatting.`;

    const responseContent = await callAnthropicAPI(prompt, {
      max_tokens: 1500,
      temperature: 0.2,
    });

    const result = safeParseJSON(responseContent, {
      summary: "Program analysis not available",
      purpose: "Purpose unclear",
      inputs: [],
      outputs: [],
      keyProcessingLogic: "Processing logic not identified",
      complexity: "Medium"
    });
    
    return {
      summary: result.summary || "Program analysis not available",
      purpose: result.purpose || "Purpose unclear", 
      inputs: Array.isArray(result.inputs) ? result.inputs : [],
      outputs: Array.isArray(result.outputs) ? result.outputs : [],
      keyProcessingLogic: result.keyProcessingLogic || "Processing logic not identified",
      complexity: ["Low", "Medium", "High"].includes(result.complexity) ? result.complexity : "Medium"
    };
  }, 2);
}

// Business rules extraction using Claude
export async function generateClaudeBusinessRules(
  programName: string,
  sourceCode: string
): Promise<any[]> {
  return retryOperation(async () => {
    const prompt = `Extract business rules from this COBOL program and provide a JSON response:
{
  "businessRules": [
    {
      "rule": "Rule description",
      "condition": "When condition occurs",
      "action": "Then this action is taken",
      "codeLocation": "Line number or section reference"
    }
  ]
}

Program Name: ${programName}
Source Code: ${sourceCode.substring(0, 1500)}

Please provide only the JSON response without any markdown formatting.`;

    const responseContent = await callAnthropicAPI(prompt, {
      max_tokens: 1000,
      temperature: 0.2,
    });

    const result = safeParseJSON(responseContent, { businessRules: [] });
    return Array.isArray(result.businessRules) ? result.businessRules : [];
  }, 2);
}

// System explanation using Claude
export async function generateClaudeSystemExplanation(
  programName: string,
  summary: string
): Promise<any> {
  return retryOperation(async () => {
    const prompt = `Create a plain English explanation of this COBOL system and provide a JSON response:
{
  "plainEnglishSummary": "Simple explanation that non-technical users can understand",
  "keyBusinessProcesses": ["process1", "process2", "process3"],
  "dataFlow": "Description of how data moves through the system",
  "userImpact": "How this system affects end users or business operations",
  "technicalComplexity": "Assessment of the system's technical complexity"
}

Program Name: ${programName}
Summary: ${summary}

Please provide only the JSON response without any markdown formatting.`;

    const responseContent = await callAnthropicAPI(prompt, {
      max_tokens: 1200,
      temperature: 0.2,
    });

    const result = safeParseJSON(responseContent, {
      plainEnglishSummary: "System explanation not available",
      keyBusinessProcesses: [],
      dataFlow: "Data flow not analyzed",
      userImpact: "Impact not assessed",
      technicalComplexity: "Complexity not determined"
    });
    
    return {
      plainEnglishSummary: result.plainEnglishSummary || "System explanation not available",
      keyBusinessProcesses: Array.isArray(result.keyBusinessProcesses) ? result.keyBusinessProcesses : [],
      dataFlow: result.dataFlow || "Data flow not analyzed",
      userImpact: result.userImpact || "Impact not assessed",
      technicalComplexity: result.technicalComplexity || "Complexity not determined"
    };
  }, 2);
}

// Mermaid diagram generation using Claude
export async function generateClaudeMermaidDiagram(
  programName: string,
  description: string,
  diagramType: string = 'flowchart'
): Promise<any> {
  return retryOperation(async () => {
    const prompt = `Create a Mermaid ${diagramType} diagram for this COBOL program and provide a JSON response:
{
  "title": "Descriptive title for the diagram",
  "description": "What the diagram shows and represents",
  "mermaidCode": "flowchart TD\\n    A[Start] --> B[Process Step]\\n    B --> C[Decision Point]\\n    C -->|Yes| D[Action 1]\\n    C -->|No| E[Action 2]\\n    D --> F[End]\\n    E --> F"
}

Program Name: ${programName}
Description: ${description}
Diagram Type: ${diagramType}

Please provide only the JSON response without any markdown formatting. Ensure the mermaidCode uses proper Mermaid syntax.`;

    const responseContent = await callAnthropicAPI(prompt, {
      max_tokens: 800,
      temperature: 0.2,
    });

    const result = safeParseJSON(responseContent, {
      title: `${programName} Flow`,
      description: "Program flow visualization",
      mermaidCode: `flowchart TD\n    A[${programName}] --> B[Processing]\n    B --> C[End]`
    });
    
    return {
      type: diagramType,
      title: result.title || `${programName} Flow`,
      description: result.description || "Program flow visualization",
      mermaidCode: result.mermaidCode || `flowchart TD\n    A[${programName}] --> B[Processing]\n    B --> C[End]`
    };
  }, 2);
}

// Data element descriptions using Claude
export async function generateClaudeDataElementDescriptions(
  programName: string,
  dataElements: string[]
): Promise<any[]> {
  return retryOperation(async () => {
    const prompt = `Analyze these data elements from a COBOL program and provide a JSON response:
{
  "descriptions": [
    {
      "name": "data element name",
      "inferredPurpose": "what this data element is used for",
      "businessContext": "business meaning and significance",
      "commonValues": ["example1", "example2", "example3"]
    }
  ]
}

Program Name: ${programName}
Data Elements: ${dataElements.join(', ')}

Please provide only the JSON response without any markdown formatting.`;

    const responseContent = await callAnthropicAPI(prompt, {
      max_tokens: 1000,
      temperature: 0.2,
    });

    const result = safeParseJSON(responseContent, { descriptions: [] });
    return Array.isArray(result.descriptions) ? result.descriptions : [];
  }, 2);
}