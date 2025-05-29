import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a COBOL expert that analyzes legacy code and generates clear, business-friendly documentation."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a business analyst expert at identifying business rules embedded in COBOL code."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a data analyst expert at interpreting COBOL data structures and their business meanings."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return Array.isArray(result.descriptions) ? result.descriptions : [];
  } catch (error) {
    console.error("Failed to generate data element descriptions:", error);
    return [];
  }
}
