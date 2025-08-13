import { safeParseJSON, retryOperation } from './error-handler';

const DEFAULT_COCO_URL = process.env.COCO_LLM_URL || 'http://localhost:8000/generate';

type CocoOptions = {
  max_length?: number;
  temperature?: number;
  top_p?: number;
  num_return_sequences?: number;
  repetition_penalty?: number;
};

async function callCocoAPI(prompt: string, options: CocoOptions = {}): Promise<string> {
  const body = {
    prompt,
    max_length: options.max_length ?? 1500,
    temperature: options.temperature ?? 0.2,
    top_p: options.top_p ?? 0.9,
    num_return_sequences: options.num_return_sequences ?? 1,
    repetition_penalty: options.repetition_penalty ?? 1.1,
  };

  const res = await fetch(DEFAULT_COCO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`COCO LLM error: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  const generated = data.generated_text as string;
  if (typeof generated !== 'string') {
    throw new Error('COCO LLM returned invalid response');
  }
  return generated;
}

export async function generateClaudeProgramSummary(
  programName: string,
  divisions: string,
  sourceCode?: string
): Promise<{ summary: string; purpose: string; inputs: string[]; outputs: string[]; keyProcessingLogic: string; complexity: 'Low'|'Medium'|'High' }>{
  return retryOperation(async () => {
    const prompt = `You are a COBOL expert. Output ONLY JSON with this shape:
{
  "summary": "",
  "purpose": "",
  "inputs": [],
  "outputs": [],
  "keyProcessingLogic": "",
  "complexity": "Low|Medium|High"
}

Program Name: ${programName}
Divisions: ${divisions}
${sourceCode ? `Source Code (truncated):\n${sourceCode.substring(0, 2000)}` : ''}`;

    const responseText = await callCocoAPI(prompt, { max_length: 800, temperature: 0.1 });
    const result = safeParseJSON(responseText, {
      summary: 'Program analysis not available',
      purpose: 'Purpose unclear',
      inputs: [],
      outputs: [],
      keyProcessingLogic: 'Processing logic not identified',
      complexity: 'Medium',
    });

    return {
      summary: result.summary || 'Program analysis not available',
      purpose: result.purpose || 'Purpose unclear',
      inputs: Array.isArray(result.inputs) ? result.inputs : [],
      outputs: Array.isArray(result.outputs) ? result.outputs : [],
      keyProcessingLogic: result.keyProcessingLogic || 'Processing logic not identified',
      complexity: ['Low', 'Medium', 'High'].includes(result.complexity) ? result.complexity : 'Medium',
    };
  }, 2);
}

export async function generateClaudeBusinessRules(
  programName: string,
  sourceCode: string
): Promise<Array<{ rule: string; condition: string; action: string; codeLocation: string }>> {
  return retryOperation(async () => {
    const prompt = `Extract business rules from this COBOL program. Output ONLY JSON:
{
  "businessRules": [
    { "rule": "", "condition": "", "action": "", "codeLocation": "" }
  ]
}

Program: ${programName}
Code (truncated):\n${sourceCode.substring(0, 2000)}`;

    const responseText = await callCocoAPI(prompt, { max_length: 1000, temperature: 0.1 });
    const result = safeParseJSON(responseText, { businessRules: [] });
    return Array.isArray(result.businessRules) ? result.businessRules : [];
  }, 2);
}

export async function generateClaudeSystemExplanation(
  programName: string,
  summary: string
): Promise<{ plainEnglishSummary: string; keyBusinessProcesses: string[]; dataFlow: string; userImpact: string; technicalComplexity: string }>{
  return retryOperation(async () => {
    const prompt = `Provide a plain-English system explanation. Output ONLY JSON:
{
  "plainEnglishSummary": "",
  "keyBusinessProcesses": [],
  "dataFlow": "",
  "userImpact": "",
  "technicalComplexity": ""
}

Program: ${programName}
Summary: ${summary}`;

    const responseText = await callCocoAPI(prompt, { max_length: 1000, temperature: 0.1 });
    const result = safeParseJSON(responseText, {
      plainEnglishSummary: 'System explanation not available',
      keyBusinessProcesses: [],
      dataFlow: 'Data flow not analyzed',
      userImpact: 'Impact not assessed',
      technicalComplexity: 'Complexity not determined',
    });
    return {
      plainEnglishSummary: result.plainEnglishSummary || 'System explanation not available',
      keyBusinessProcesses: Array.isArray(result.keyBusinessProcesses) ? result.keyBusinessProcesses : [],
      dataFlow: result.dataFlow || 'Data flow not analyzed',
      userImpact: result.userImpact || 'Impact not assessed',
      technicalComplexity: result.technicalComplexity || 'Complexity not determined',
    };
  }, 2);
}

export async function generateClaudeMermaidDiagram(
  programName: string,
  description: string,
  diagramType: string = 'flowchart'
): Promise<{ type: string; title: string; description: string; mermaidCode: string }>{
  return retryOperation(async () => {
    const prompt = `Create a Mermaid ${diagramType} diagram. Output ONLY JSON:
{
  "title": "",
  "description": "",
  "mermaidCode": "flowchart TD\\n  A[Start] --> B[Step]"
}

Program: ${programName}
Description: ${description}
Requirements: Ensure mermaidCode is valid Mermaid syntax.`;

    const responseText = await callCocoAPI(prompt, { max_length: 800, temperature: 0.1 });
    const result = safeParseJSON(responseText, {
      title: `${programName} Flow`,
      description: 'Program flow visualization',
      mermaidCode: `flowchart TD\n  A[${programName}] --> B[Processing]\n  B --> C[End]`,
    });
    return {
      type: diagramType,
      title: result.title || `${programName} Flow`,
      description: result.description || 'Program flow visualization',
      mermaidCode: result.mermaidCode || `flowchart TD\n  A[${programName}] --> B[Processing]\n  B --> C[End]`,
    };
  }, 2);
}

export async function generateClaudeDataElementDescriptions(
  programName: string,
  dataElements: string[]
): Promise<Array<{ name: string; inferredPurpose: string; businessContext: string; commonValues?: string[] }>> {
  return retryOperation(async () => {
    const prompt = `Infer business-friendly descriptions for data elements. Output ONLY JSON:
{
  "descriptions": [
    { "name": "", "inferredPurpose": "", "businessContext": "", "commonValues": [] }
  ]
}

Program: ${programName}
Elements: ${dataElements.join(', ')}`;

    const responseText = await callCocoAPI(prompt, { max_length: 1000, temperature: 0.1 });
    const result = safeParseJSON(responseText, { descriptions: [] });
    return Array.isArray(result.descriptions) ? result.descriptions : [];
  }, 2);
}


