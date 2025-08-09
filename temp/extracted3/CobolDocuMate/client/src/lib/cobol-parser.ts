import { type CobolStructure, type BusinessRule } from "@shared/schema";

export class CobolParser {
  private lines: string[];
  private currentLine: number = 0;

  constructor(content: string) {
    this.lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*')); // Remove comments and empty lines
  }

  parse(): CobolStructure {
    const structure: CobolStructure = {
      identification: {
        programId: '',
      },
      data: {
        workingStorage: [],
        fileSection: [],
      },
      procedure: {
        paragraphs: [],
        sections: [],
      },
    };

    this.currentLine = 0;
    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      
      if (line.includes('IDENTIFICATION DIVISION')) {
        this.parseIdentificationDivision(structure);
      } else if (line.includes('ENVIRONMENT DIVISION')) {
        this.parseEnvironmentDivision(structure);
      } else if (line.includes('DATA DIVISION')) {
        this.parseDataDivision(structure);
      } else if (line.includes('PROCEDURE DIVISION')) {
        this.parseProcedureDivision(structure);
      }
      
      this.currentLine++;
    }

    return structure;
  }

  private parseIdentificationDivision(structure: CobolStructure) {
    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      
      if (line.includes('DIVISION')) {
        break;
      }
      
      if (line.startsWith('PROGRAM-ID.')) {
        structure.identification.programId = line.replace('PROGRAM-ID.', '').trim().replace('.', '');
      } else if (line.startsWith('AUTHOR.')) {
        structure.identification.author = line.replace('AUTHOR.', '').trim().replace('.', '');
      } else if (line.startsWith('DATE-WRITTEN.')) {
        structure.identification.dateWritten = line.replace('DATE-WRITTEN.', '').trim().replace('.', '');
      }
      
      this.currentLine++;
    }
  }

  private parseEnvironmentDivision(structure: CobolStructure) {
    const environment = {
      configuration: [] as string[],
      inputOutput: [] as string[],
    };

    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      
      if (line.includes('DIVISION')) {
        break;
      }
      
      if (line.includes('CONFIGURATION SECTION') || line.includes('INPUT-OUTPUT SECTION')) {
        environment.configuration.push(line);
      }
      
      this.currentLine++;
    }

    if (environment.configuration.length > 0 || environment.inputOutput.length > 0) {
      structure.environment = environment;
    }
  }

  private parseDataDivision(structure: CobolStructure) {
    let currentSection = '';
    
    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      
      if (line.includes('DIVISION')) {
        break;
      }
      
      if (line.includes('WORKING-STORAGE SECTION')) {
        currentSection = 'working-storage';
      } else if (line.includes('FILE SECTION')) {
        currentSection = 'file';
      } else if (line.includes('LINKAGE SECTION')) {
        currentSection = 'linkage';
      } else if (currentSection && line.match(/^\d+\s+/)) {
        // Data item definition
        const dataItem = this.parseDataItem(line);
        if (dataItem) {
          if (currentSection === 'working-storage') {
            structure.data.workingStorage.push(dataItem);
          }
        }
      }
      
      this.currentLine++;
    }
  }

  private parseDataItem(line: string) {
    const parts = line.split(/\s+/);
    if (parts.length < 2) return null;

    const level = parseInt(parts[0]);
    const name = parts[1];
    
    let picture = '';
    let value = '';
    
    // Look for PIC clause
    const picMatch = line.match(/PIC\s+([A-Z0-9\(\)\/]+)/i);
    if (picMatch) {
      picture = picMatch[1];
    }
    
    // Look for VALUE clause
    const valueMatch = line.match(/VALUE\s+([^.\s]+)/i);
    if (valueMatch) {
      value = valueMatch[1];
    }

    return {
      level,
      name,
      picture: picture || undefined,
      value: value || undefined,
    };
  }

  private parseProcedureDivision(structure: CobolStructure) {
    let currentParagraph = '';
    let statements: string[] = [];
    
    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      
      // Check if this is a paragraph name (ends with period)
      if (line.match(/^[A-Z][A-Z0-9-]*\.$/) && !line.includes(' ')) {
        // Save previous paragraph if exists
        if (currentParagraph && statements.length > 0) {
          structure.procedure.paragraphs.push({
            name: currentParagraph,
            statements: [...statements],
          });
        }
        
        currentParagraph = line.replace('.', '');
        statements = [];
      } else if (currentParagraph && line) {
        statements.push(line);
      }
      
      this.currentLine++;
    }
    
    // Save last paragraph
    if (currentParagraph && statements.length > 0) {
      structure.procedure.paragraphs.push({
        name: currentParagraph,
        statements,
      });
    }
  }

  static extractBusinessRules(content: string, structure: CobolStructure): BusinessRule[] {
    const rules: BusinessRule[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Look for calculation patterns
      if (/COMPUTE|ADD|SUBTRACT|MULTIPLY|DIVIDE/i.test(trimmedLine)) {
        rules.push({
          id: `calc_${index}`,
          type: 'calculation',
          title: 'Arithmetic Operation',
          description: trimmedLine,
          location: {
            division: 'procedure',
            paragraph: 'unknown',
          },
        });
      }
      
      // Look for decision patterns
      if (/IF|WHEN|EVALUATE/i.test(trimmedLine)) {
        rules.push({
          id: `decision_${index}`,
          type: 'decision',
          title: 'Conditional Logic',
          description: trimmedLine,
          location: {
            division: 'procedure',
            paragraph: 'unknown',
          },
        });
      }
      
      // Look for validation patterns
      if (/VALIDATE|CHECK|VERIFY/i.test(trimmedLine)) {
        rules.push({
          id: `validation_${index}`,
          type: 'validation',
          title: 'Data Validation',
          description: trimmedLine,
          location: {
            division: 'procedure',
            paragraph: 'unknown',
          },
        });
      }
      
      // Look for file operations
      if (/READ|WRITE|OPEN|CLOSE/i.test(trimmedLine)) {
        rules.push({
          id: `dataflow_${index}`,
          type: 'data-flow',
          title: 'File Operation',
          description: trimmedLine,
          location: {
            division: 'procedure',
            paragraph: 'unknown',
          },
        });
      }
    });
    
    return rules;
  }
}
