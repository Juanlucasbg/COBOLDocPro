import { safeParseJSON, retryOperation } from './error-handler';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

// Enhanced Gemini API caller with better error handling
async function callGeminiAPIEnhanced(prompt: string, options: any = {}): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Enhanced program summary with robust error handling
export async function generateEnhancedProgramSummary(
  programName: string,
  divisions: string,
  sourceCode?: string
): Promise<any> {
  return retryOperation(async () => {
    const prompt = `Analyze this COBOL program and provide a JSON response:
{
  "summary": "Brief description",
  "purpose": "Business purpose",
  "inputs": ["input1", "input2"],
  "outputs": ["output1", "output2"],
  "keyProcessingLogic": "Main processing steps",
  "complexity": "Low"
}

Program: ${programName}
Divisions: ${divisions}
${sourceCode ? `Code: ${sourceCode.substring(0, 1500)}` : ''}`;

    const responseContent = await callGeminiAPIEnhanced(prompt, {
      max_tokens: 1000,
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

// Enhanced business rules extraction
export async function generateEnhancedBusinessRules(
  programName: string,
  sourceCode: string
): Promise<any[]> {
  return retryOperation(async () => {
    const prompt = `Extract business rules from this COBOL program as JSON:
{
  "businessRules": [
    {
      "rule": "Rule description",
      "condition": "When condition",
      "action": "Then action",
      "codeLocation": "Line or section"
    }
  ]
}

Program: ${programName}
Code: ${sourceCode.substring(0, 1500)}`;

    const responseContent = await callGeminiAPIEnhanced(prompt, {
      max_tokens: 1000,
      temperature: 0.2,
    });

    const result = safeParseJSON(responseContent, { businessRules: [] });
    return Array.isArray(result.businessRules) ? result.businessRules : [];
  }, 2);
}

// Enhanced system explanation
export async function generateEnhancedSystemExplanation(
  programName: string,
  summary: string
): Promise<any> {
  return retryOperation(async () => {
    const prompt = `Create a plain English explanation of this COBOL system as JSON:
{
  "plainEnglishSummary": "Simple explanation",
  "keyBusinessProcesses": ["process1", "process2"],
  "dataFlow": "How data moves",
  "userImpact": "Impact on users",
  "technicalComplexity": "Complexity assessment"
}

Program: ${programName}
Summary: ${summary}`;

    const responseContent = await callGeminiAPIEnhanced(prompt, {
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

// Enhanced Mermaid diagram generation
export async function generateEnhancedMermaidDiagram(
  programName: string,
  description: string,
  diagramType: string = 'flowchart'
): Promise<any> {
  return retryOperation(async () => {
    const prompt = `Create a Mermaid ${diagramType} diagram as JSON:
{
  "title": "Diagram title",
  "description": "What the diagram shows",
  "mermaidCode": "flowchart TD\\n    A[Start] --> B[Process]\\n    B --> C[End]"
}

Program: ${programName}
Description: ${description}`;

    const responseContent = await callGeminiAPIEnhanced(prompt, {
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

// Enhanced data element descriptions
export async function generateEnhancedDataElementDescriptions(
  programName: string,
  dataElements: string[]
): Promise<any[]> {
  return retryOperation(async () => {
    const prompt = `Analyze data elements from this COBOL program as JSON:
{
  "descriptions": [
    {
      "name": "element name",
      "inferredPurpose": "what it's used for",
      "businessContext": "business meaning",
      "commonValues": ["value1", "value2"]
    }
  ]
}

Program: ${programName}
Elements: ${dataElements.join(', ')}`;

    const responseContent = await callGeminiAPIEnhanced(prompt, {
      max_tokens: 1000,
      temperature: 0.2,
    });

    const result = safeParseJSON(responseContent, { descriptions: [] });
    return Array.isArray(result.descriptions) ? result.descriptions : [];
  }, 2);
}