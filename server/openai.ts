// Using AIML API endpoint
const AIML_ENDPOINT = "https://api.aimlapi.com/v1";

async function callAIMLAPI(prompt: string, options: any = {}): Promise<string> {
  const response = await fetch(`${AIML_ENDPOINT}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AIML_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // Using a cost-effective model for COBOL analysis
      messages: [{ role: "user", content: prompt }],
      max_tokens: options.max_tokens || 2000,
      temperature: options.temperature || 0.7,
      stream: false,
      ...options
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AIML API error:', response.status, errorText);
    throw new Error(`AIML API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content || "";
}

export interface ProgramSummary {
  summary: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  keyProcessingLogic: string;
  complexity: "Low" | "Medium" | "High";
}

export interface BusinessRule {
  rule: string;
  condition: string;
  action: string;
  codeLocation: string;
}

export interface DataElementDescription {
  name: string;
  inferredPurpose: string;
  businessContext: string;
  commonValues?: string[];
}

export interface SystemExplanation {
  plainEnglishSummary: string;
  keyBusinessProcesses: string[];
  dataFlow: string;
  userImpact: string;
  technicalComplexity: string;
}

export interface MermaidDiagram {
  type: "flowchart" | "sequenceDiagram" | "classDiagram" | "erDiagram";
  title: string;
  description: string;
  mermaidCode: string;
}

export async function generateProgramSummary(
  programName: string,
  sourceCode: string
): Promise<ProgramSummary> {
  try {
    const prompt = `Analyze this COBOL program and provide a comprehensive summary. Respond with JSON in this exact format:
{
  "summary": "Brief overview of what this program does",
  "purpose": "Main business purpose and functionality",
  "inputs": ["list", "of", "input", "sources"],
  "outputs": ["list", "of", "output", "destinations"],
  "keyProcessingLogic": "Description of main processing steps",
  "complexity": "Low|Medium|High"
}

COBOL Program: ${programName}
Source Code:
${sourceCode.substring(0, 8000)}`;

    const responseContent = await callAIMLAPI(`You are a COBOL expert that analyzes legacy code and generates clear, business-friendly documentation.

${prompt}`, {
      max_tokens: 1500,
      temperature: 0.3,
    });

    const result = JSON.parse(responseContent || "{}");
    
    return {
      summary: result.summary || "No summary available",
      purpose: result.purpose || "Purpose unclear",
      inputs: Array.isArray(result.inputs) ? result.inputs : [],
      outputs: Array.isArray(result.outputs) ? result.outputs : [],
      keyProcessingLogic: result.keyProcessingLogic || "Processing logic not identified",
      complexity: ["Low", "Medium", "High"].includes(result.complexity) ? result.complexity : "Medium"
    };
  } catch (error) {
    console.error("Failed to generate program summary:", error);
    throw new Error("Failed to generate program summary: " + (error as Error).message);
  }
}

export async function extractBusinessRules(
  programName: string,
  sourceCode: string
): Promise<BusinessRule[]> {
  try {
    const prompt = `Analyze this COBOL program and extract business rules from conditional logic, data validations, and decision points. Respond with JSON in this format:
{
  "businessRules": [
    {
      "rule": "Name of the business rule",
      "condition": "What condition triggers this rule",
      "action": "What action is taken",
      "codeLocation": "Paragraph or section name where this rule is implemented"
    }
  ]
}

Focus on IF statements, EVALUATE statements, data validation logic, and business calculations.

COBOL Program: ${programName}
Source Code:
${sourceCode.substring(0, 8000)}`;

    const responseContent = await callAIMLAPI(`You are a business analyst expert at identifying business rules embedded in COBOL code.

${prompt}`, {
      max_tokens: 1500,
      temperature: 0.3,
    });

    const result = JSON.parse(responseContent || "{}");
    
    return Array.isArray(result.businessRules) ? result.businessRules : [];
  } catch (error) {
    console.error("Failed to extract business rules:", error);
    return [];
  }
}

export async function generateDataElementDescriptions(
  dataElements: Array<{ name: string; picture?: string; level?: string }>
): Promise<DataElementDescription[]> {
  try {
    const prompt = `Analyze these COBOL data elements and provide business-friendly descriptions. Respond with JSON in this format:
{
  "descriptions": [
    {
      "name": "DATA-ELEMENT-NAME",
      "inferredPurpose": "What this field is used for",
      "businessContext": "Business meaning and usage",
      "commonValues": ["possible", "values", "if", "applicable"]
    }
  ]
}

Data Elements:
${dataElements.map(el => `${el.name} (Level: ${el.level}, Picture: ${el.picture})`).join('\n')}`;

    const responseContent = await callAIMLAPI(`You are a data analyst expert at interpreting COBOL data structures and their business meanings.

${prompt}`, {
      max_tokens: 1500,
      temperature: 0.3,
    });

    const result = JSON.parse(responseContent || "{}");
    
    return Array.isArray(result.descriptions) ? result.descriptions : [];
  } catch (error) {
    console.error("Failed to generate data element descriptions:", error);
    return [];
  }
}

export async function generateSystemExplanation(
  programName: string,
  sourceCode: string,
  businessRules: BusinessRule[]
): Promise<SystemExplanation> {
  try {
    const prompt = `Analyze this COBOL program and provide a comprehensive plain English explanation. Respond with JSON in this format:
{
  "plainEnglishSummary": "A clear, non-technical explanation of what this system does and why it matters to the business",
  "keyBusinessProcesses": ["Process 1", "Process 2", "Process 3"],
  "dataFlow": "Explain how data moves through the system in simple terms",
  "userImpact": "Describe how this system affects end users or customers",
  "technicalComplexity": "Assess the complexity level and explain any technical challenges"
}

Focus on making this understandable to business stakeholders, not technical people.

Program: ${programName}
Source Code Sample:
${sourceCode.substring(0, 4000)}

Business Rules Found:
${businessRules.map(rule => `- ${rule.rule}: ${rule.condition} → ${rule.action}`).join('\n')}`;

    const responseContent = await callAIMLAPI(`You are a business analyst expert at translating technical COBOL systems into clear business language that non-technical stakeholders can understand.

${prompt}`, {
      max_tokens: 2000,
      temperature: 0.3,
    });

    const result = JSON.parse(responseContent || "{}");
    
    return {
      plainEnglishSummary: result.plainEnglishSummary || "System analysis not available",
      keyBusinessProcesses: Array.isArray(result.keyBusinessProcesses) ? result.keyBusinessProcesses : [],
      dataFlow: result.dataFlow || "Data flow analysis not available",
      userImpact: result.userImpact || "User impact analysis not available",
      technicalComplexity: result.technicalComplexity || "Complexity analysis not available"
    };
  } catch (error) {
    console.error("Failed to generate system explanation:", error);
    throw new Error("Failed to generate system explanation: " + (error as Error).message);
  }
}

export async function generateMermaidDiagram(
  programName: string,
  sourceCode: string,
  relationships: Array<{ type: string; target: string; location: string }>,
  diagramType: "flowchart" | "sequenceDiagram" = "flowchart"
): Promise<MermaidDiagram> {
  try {
    const prompt = `Create a Mermaid diagram for this COBOL program. Respond with JSON in this format:
{
  "type": "${diagramType}",
  "title": "Descriptive title for the diagram",
  "description": "Brief explanation of what the diagram shows",
  "mermaidCode": "Valid Mermaid syntax code"
}

Program: ${programName}
Relationships: ${relationships.map(rel => `${rel.type}: ${rel.target} (at ${rel.location})`).join(', ')}

For flowchart, show the program flow including:
- Start/End points
- Main processing sections
- Decision points
- Called programs
- Data flows

Use proper Mermaid flowchart syntax with:
- A[Start] --> B[Process]
- B --> C{Decision?}
- C -->|Yes| D[Action]
- C -->|No| E[Alternative]

Source Code Sample:
${sourceCode.substring(0, 3000)}`;

    const responseContent = await callAIMLAPI(`You are an expert at creating Mermaid diagrams from COBOL code. Generate valid Mermaid syntax that clearly shows program flow and relationships.

${prompt}`, {
      max_tokens: 1500,
      temperature: 0.3,
    });

    const result = JSON.parse(responseContent || "{}");
    
    return {
      type: diagramType,
      title: result.title || `${programName} Flow Diagram`,
      description: result.description || "Program flow visualization",
      mermaidCode: result.mermaidCode || `flowchart TD\n    A[${programName}] --> B[Processing]\n    B --> C[End]`
    };
  } catch (error) {
    console.error("Failed to generate Mermaid diagram:", error);
    throw new Error("Failed to generate Mermaid diagram: " + (error as Error).message);
  }
}
