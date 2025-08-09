import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertCobolProgramSchema } from "@shared/schema";
import { z } from "zod";

interface MulterRequest extends Request {
  files?: Express.Multer.File[];
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.cob', '.cbl', '.txt'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .cob, .cbl, and .txt files are allowed.'));
    }
  },
});

async function generateDocumentation(content: string, filename: string): Promise<{
  documentation: string;
  structure: any;
  businessRules: any;
  diagrams: any;
}> {
  try {
    // Call CB77-instruct-7b API via Inferless
    const inferlessApiKey = "b7ec13e06dee09ac0cf712a8134dfd50cbb28d37950d87672280c56aa7796fb1b0837f4a31119bf98db376826c83a2727b32315668695e0e6ae498ce356f1658";
    const inferlessEndpoint = "https://serverless-region-v1.inferless.com/api/v1/cb77-instruct-7b_efda690be88d48dab1b51b5d852c564f/infer";

    const prompt = `Analyze this COBOL program and generate comprehensive documentation:

FILENAME: ${filename}

COBOL CODE:
${content}

Please provide:
1. Program overview and purpose
2. Detailed structure analysis (divisions, sections, paragraphs)
3. Data definitions and file descriptions
4. Business logic and calculations
5. Error handling procedures
6. Inter-program relationships

Format the response as structured markdown with clear sections and code blocks.`;

    const response = await fetch(inferlessEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inferlessApiKey}`,
      },
      body: JSON.stringify({
        inputs: [
          {
            name: "prompt",
            shape: [1],
            data: [prompt],
            datatype: "BYTES"
          },
          {
            name: "max_tokens",
            optional: true,
            shape: [1],
            data: [2048],
            datatype: "INT16"
          },
          {
            name: "temperature",
            optional: true,
            shape: [1],
            data: [0.3],
            datatype: "FP32"
          },
          {
            name: "top_p",
            optional: true,
            shape: [1],
            data: [0.9],
            datatype: "FP32"
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Inferless API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const documentation = result.outputs?.[0]?.data?.[0] || result.generated_text || "Documentation generation failed";

    // Parse COBOL structure using local parser
    const structure = parseCobolStructure(content);
    const businessRules = extractBusinessRules(content, structure);
    const diagrams = generateDiagramData(structure, businessRules);

    return {
      documentation,
      structure,
      businessRules,
      diagrams,
    };
  } catch (error) {
    console.error('Documentation generation error:', error);
    throw error;
  }
}

function parseCobolStructure(content: string): any {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('*'));
  
  const structure = {
    identification: {
      programId: '',
      author: '',
      dateWritten: '',
      installation: ''
    },
    environment: {
      configuration: [] as string[],
      inputOutput: [] as string[]
    },
    data: {
      workingStorage: [] as any[],
      fileSection: [] as any[],
      linkageSection: [] as any[]
    },
    procedure: {
      paragraphs: [] as any[],
      sections: [] as any[]
    }
  };

  let currentDivision = '';
  let currentSection = '';
  let currentParagraph: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Division detection
    if (upperLine.includes('IDENTIFICATION DIVISION')) {
      currentDivision = 'identification';
      continue;
    } else if (upperLine.includes('ENVIRONMENT DIVISION')) {
      currentDivision = 'environment';
      continue;
    } else if (upperLine.includes('DATA DIVISION')) {
      currentDivision = 'data';
      continue;
    } else if (upperLine.includes('PROCEDURE DIVISION')) {
      currentDivision = 'procedure';
      continue;
    }

    // Parse identification division
    if (currentDivision === 'identification') {
      if (upperLine.startsWith('PROGRAM-ID.')) {
        structure.identification.programId = line.substring(11).replace('.', '').trim();
      } else if (upperLine.startsWith('AUTHOR.')) {
        structure.identification.author = line.substring(7).replace('.', '').trim();
      } else if (upperLine.startsWith('DATE-WRITTEN.')) {
        structure.identification.dateWritten = line.substring(13).replace('.', '').trim();
      } else if (upperLine.startsWith('INSTALLATION.')) {
        structure.identification.installation = line.substring(13).replace('.', '').trim();
      }
    }

    // Parse environment division
    if (currentDivision === 'environment') {
      if (upperLine.includes('CONFIGURATION SECTION')) {
        currentSection = 'configuration';
      } else if (upperLine.includes('INPUT-OUTPUT SECTION')) {
        currentSection = 'inputOutput';
      } else if (currentSection && line.trim()) {
        if (currentSection === 'configuration') {
          structure.environment.configuration.push(line);
        } else if (currentSection === 'inputOutput') {
          structure.environment.inputOutput.push(line);
        }
      }
    }

    // Parse data division
    if (currentDivision === 'data') {
      if (upperLine.includes('WORKING-STORAGE SECTION')) {
        currentSection = 'workingStorage';
      } else if (upperLine.includes('FILE SECTION')) {
        currentSection = 'fileSection';
      } else if (upperLine.includes('LINKAGE SECTION')) {
        currentSection = 'linkageSection';
      } else if (currentSection && line.match(/^\s*\d+\s+/)) {
        // Parse data item
        const dataItem = parseDataItem(line);
        if (dataItem) {
          if (currentSection === 'workingStorage') {
            structure.data.workingStorage.push(dataItem);
          } else if (currentSection === 'linkageSection') {
            structure.data.linkageSection.push(dataItem);
          }
        }
      }
    }

    // Parse procedure division
    if (currentDivision === 'procedure') {
      // Check for paragraph names (word followed by period at start of line)
      if (line.match(/^[A-Z][A-Z0-9-]*\.\s*$/)) {
        // Save previous paragraph if exists
        if (currentParagraph) {
          structure.procedure.paragraphs.push(currentParagraph);
        }
        currentParagraph = {
          name: line.replace('.', '').trim(),
          statements: []
        };
      } else if (currentParagraph && line.trim()) {
        currentParagraph.statements.push(line);
      }
    }
  }

  // Save last paragraph
  if (currentParagraph) {
    structure.procedure.paragraphs.push(currentParagraph);
  }

  return structure;

  function parseDataItem(line: string): any {
    const match = line.match(/^\s*(\d+)\s+([A-Z0-9-]+)(?:\s+PIC\s+([A-Z0-9\(\)\/]+))?(?:\s+VALUE\s+(.+?))?(?:\s+OCCURS\s+(\d+))?/i);
    if (match) {
      return {
        level: parseInt(match[1]),
        name: match[2],
        picture: match[3] || undefined,
        value: match[4]?.replace(/['"]/g, '') || undefined,
        occurs: match[5] ? parseInt(match[5]) : undefined
      };
    }
    return null;
  }
}

function extractBusinessRules(content: string, structure: any): any[] {
  const rules: any[] = [];
  const lines = content.split('\n');
  
  let currentParagraph = 'MAIN';
  
  lines.forEach((line, index) => {
    const upperLine = line.toUpperCase().trim();
    
    // Track current paragraph
    if (line.match(/^[A-Z][A-Z0-9-]*\.\s*$/)) {
      currentParagraph = line.replace('.', '').trim();
      return;
    }
    
    // Skip empty lines and comments
    if (!upperLine || upperLine.startsWith('*')) return;
    
    // Arithmetic operations
    if (/\b(COMPUTE|ADD|SUBTRACT|MULTIPLY|DIVIDE)\b/.test(upperLine)) {
      rules.push({
        id: `calc_${index}`,
        type: 'calculation',
        title: 'Arithmetic Calculation',
        description: line.trim(),
        location: { division: 'procedure', paragraph: currentParagraph },
        conditions: [],
        actions: [line.trim()]
      });
    }
    
    // Conditional logic
    if (/\b(IF|EVALUATE|WHEN)\b/.test(upperLine)) {
      rules.push({
        id: `decision_${index}`,
        type: 'decision',
        title: 'Conditional Logic',
        description: line.trim(),
        location: { division: 'procedure', paragraph: currentParagraph },
        conditions: [line.trim()],
        actions: []
      });
    }
    
    // File operations
    if (/\b(READ|WRITE|OPEN|CLOSE|REWRITE)\b/.test(upperLine)) {
      rules.push({
        id: `dataflow_${index}`,
        type: 'data-flow',
        title: 'File Operation',
        description: line.trim(),
        location: { division: 'procedure', paragraph: currentParagraph },
        relatedItems: extractFileNames(line)
      });
    }
    
    // Validation patterns
    if (/\b(INSPECT|STRING|UNSTRING|VALIDATE)\b/.test(upperLine)) {
      rules.push({
        id: `validation_${index}`,
        type: 'validation',
        title: 'Data Validation',
        description: line.trim(),
        location: { division: 'procedure', paragraph: currentParagraph }
      });
    }
    
    // Process flow
    if (/\b(PERFORM|CALL|GOTO|EXIT)\b/.test(upperLine)) {
      rules.push({
        id: `process_${index}`,
        type: 'process',
        title: 'Process Control',
        description: line.trim(),
        location: { division: 'procedure', paragraph: currentParagraph },
        relatedItems: extractProcedureNames(line)
      });
    }
  });

  return rules;
  
  function extractFileNames(line: string): string[] {
    const filePattern = /\b([A-Z][A-Z0-9-]*-FILE|[A-Z][A-Z0-9-]*-REC)\b/g;
    const matches = line.match(filePattern) || [];
    return matches;
  }
  
  function extractProcedureNames(line: string): string[] {
    const procPattern = /\b([A-Z][A-Z0-9-]*)\b/g;
    const matches = line.match(procPattern) || [];
    return matches.filter(match => 
      !['PERFORM', 'CALL', 'GOTO', 'EXIT', 'UNTIL', 'TIMES', 'VARYING'].includes(match)
    );
  }
}

function generateDiagramData(structure: any, businessRules: any[]): any {
  // Generate program flow based on actual paragraphs
  const flowchart = generateProgramFlowDiagram(structure);
  
  // Generate data structure based on actual data items
  const dataStructure = generateDataStructureDiagram(structure);
  
  // Generate business rules diagram based on extracted rules
  const businessRulesDiagram = generateBusinessRulesDiagram(businessRules);
  
  // Generate program structure based on actual divisions
  const programStructure = generateProgramStructureDiagram(structure);
  
  return {
    flowchart,
    dataStructure,
    businessRules: businessRulesDiagram,
    programStructure
  };
}

function generateProgramFlowDiagram(structure: any): string {
  const paragraphs = structure.procedure?.paragraphs || [];
  
  if (paragraphs.length === 0) {
    return `graph TD
      A[Program Start] --> B[No Paragraphs Found]
      B --> C[Program End]`;
  }
  
  let diagram = 'graph TD\n';
  diagram += '    START[Program Start]\n';
  
  paragraphs.forEach((para: any, index: number) => {
    const nodeId = `P${index}`;
    const nextNodeId = index < paragraphs.length - 1 ? `P${index + 1}` : 'END';
    
    if (index === 0) {
      diagram += `    START --> ${nodeId}["${para.name}"]\n`;
    }
    
    // Add statements as sub-nodes if they exist
    if (para.statements && para.statements.length > 0) {
      const hasConditions = para.statements.some((stmt: string) => 
        /\b(IF|EVALUATE|WHEN)\b/i.test(stmt)
      );
      
      if (hasConditions) {
        diagram += `    ${nodeId} --> ${nodeId}_COND{Decision}\n`;
        diagram += `    ${nodeId}_COND -->|Yes| ${nextNodeId}\n`;
        diagram += `    ${nodeId}_COND -->|No| ${nextNodeId}\n`;
      } else {
        diagram += `    ${nodeId} --> ${nextNodeId}\n`;
      }
    } else {
      diagram += `    ${nodeId} --> ${nextNodeId}\n`;
    }
  });
  
  diagram += '    END[Program End]\n';
  return diagram;
}

function generateDataStructureDiagram(structure: any): string {
  let diagram = 'graph LR\n';
  
  // Input/Output files
  const envFiles = structure.environment?.inputOutput || [];
  const workingStorage = structure.data?.workingStorage || [];
  const fileSection = structure.data?.fileSection || [];
  
  if (envFiles.length > 0 || fileSection.length > 0) {
    diagram += '    FILES[Input Files] --> WS[Working Storage]\n';
    diagram += '    WS --> OUTPUT[Output Files]\n';
    
    // Add specific file references if found
    envFiles.forEach((file: string, index: number) => {
      if (file.includes('SELECT')) {
        const fileName = file.match(/SELECT\s+([A-Z0-9-]+)/i)?.[1];
        if (fileName) {
          diagram += `    F${index}["${fileName}"] --> WS\n`;
        }
      }
    });
  } else {
    diagram += '    INPUT[Program Input] --> WS[Working Storage]\n';
    diagram += '    WS --> OUTPUT[Program Output]\n';
  }
  
  // Add working storage items
  if (workingStorage.length > 0) {
    workingStorage.slice(0, 5).forEach((item: any, index: number) => {
      diagram += `    WS --> WS${index}["${item.name}"]\n`;
    });
  }
  
  return diagram;
}

function generateBusinessRulesDiagram(businessRules: any[]): string {
  if (businessRules.length === 0) {
    return `graph TD
      A[No Business Rules Found]`;
  }
  
  let diagram = 'graph TD\n';
  diagram += '    BR[Business Rules Engine]\n';
  
  const rulesByType = businessRules.reduce((acc: any, rule: any) => {
    if (!acc[rule.type]) acc[rule.type] = [];
    acc[rule.type].push(rule);
    return acc;
  }, {});
  
  Object.entries(rulesByType).forEach(([type, rules]: [string, any]) => {
    const typeNode = type.toUpperCase().replace('-', '_');
    diagram += `    BR --> ${typeNode}[${type.charAt(0).toUpperCase() + type.slice(1)} Rules]\n`;
    
    (rules as any[]).slice(0, 3).forEach((rule: any, index: number) => {
      const ruleNode = `${typeNode}_${index}`;
      const shortDesc = rule.description.substring(0, 30) + (rule.description.length > 30 ? '...' : '');
      diagram += `    ${typeNode} --> ${ruleNode}["${shortDesc}"]\n`;
    });
  });
  
  return diagram;
}

function generateProgramStructureDiagram(structure: any): string {
  let diagram = 'graph TD\n';
  
  // Always show the four main divisions
  diagram += '    ID[IDENTIFICATION DIVISION]\n';
  diagram += '    ENV[ENVIRONMENT DIVISION]\n';
  diagram += '    DATA[DATA DIVISION]\n';
  diagram += '    PROC[PROCEDURE DIVISION]\n';
  
  diagram += '    ID --> ENV\n';
  diagram += '    ENV --> DATA\n';
  diagram += '    DATA --> PROC\n';
  
  // Add program ID if available
  if (structure.identification?.programId) {
    diagram += `    ID --> PGMID["Program: ${structure.identification.programId}"]\n`;
  }
  
  // Add data sections if they have content
  if (structure.data?.workingStorage?.length > 0) {
    diagram += '    DATA --> WS[Working Storage Section]\n';
  }
  
  if (structure.data?.fileSection?.length > 0) {
    diagram += '    DATA --> FS[File Section]\n';
  }
  
  // Add procedure paragraphs if available
  const paragraphs = structure.procedure?.paragraphs || [];
  if (paragraphs.length > 0) {
    diagram += '    PROC --> PARAS[Paragraphs]\n';
    paragraphs.slice(0, 5).forEach((para: any, index: number) => {
      diagram += `    PARAS --> P${index}["${para.name}"]\n`;
    });
  }
  
  return diagram;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all programs
  app.get("/api/programs", async (req, res) => {
    try {
      const programs = await storage.getAllPrograms();
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  // Get single program
  app.get("/api/programs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const program = await storage.getProgram(id);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });

  // Upload and process COBOL files
  app.post("/api/programs/upload", upload.array('files'), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const results = [];

      for (const file of req.files as Express.Multer.File[]) {
        try {
          const content = file.buffer.toString('utf-8');
          
          // Create program record
          const program = await storage.createProgram({
            filename: file.originalname,
            originalContent: content,
            size: file.size,
            status: "processing",
            generatedDocumentation: null,
            programStructure: null,
            businessRules: null,
            diagrams: null,
            errorMessage: null,
          });

          results.push(program);

          // Process asynchronously
          generateDocumentation(content, file.originalname)
            .then(async ({ documentation, structure, businessRules, diagrams }) => {
              await storage.updateProgram(program.id, {
                status: "processed",
                generatedDocumentation: documentation,
                programStructure: JSON.stringify(structure),
                businessRules: JSON.stringify(businessRules),
                diagrams: JSON.stringify(diagrams),
              });
            })
            .catch(async (error) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              await storage.updateProgram(program.id, {
                status: "error",
                errorMessage: errorMessage,
              });
            });

        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            filename: file.originalname,
            error: errorMessage,
          });
        }
      }

      res.json(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Upload failed", error: errorMessage });
    }
  });

  // Regenerate documentation
  app.post("/api/programs/:id/regenerate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const program = await storage.getProgram(id);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // Update status to processing
      await storage.updateProgram(id, { status: "processing" });

      // Regenerate documentation asynchronously
      generateDocumentation(program.originalContent, program.filename)
        .then(async ({ documentation, structure, businessRules, diagrams }) => {
          await storage.updateProgram(id, {
            status: "processed",
            generatedDocumentation: documentation,
            programStructure: JSON.stringify(structure),
            businessRules: JSON.stringify(businessRules),
            diagrams: JSON.stringify(diagrams),
            errorMessage: null,
          });
        })
        .catch(async (error) => {
          await storage.updateProgram(id, {
            status: "error",
            errorMessage: error.message,
          });
        });

      res.json({ message: "Regeneration started" });
    } catch (error) {
      res.status(500).json({ message: "Regeneration failed" });
    }
  });

  // Delete program
  app.delete("/api/programs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProgram(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      res.json({ message: "Program deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete program" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
