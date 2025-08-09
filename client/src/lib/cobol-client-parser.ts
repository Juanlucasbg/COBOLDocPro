// Client-side COBOL parser for immediate feedback and diagram generation
export interface CobolDivision {
  name: string;
  startLine: number;
  endLine: number;
  content: string[];
}

export interface CobolDataItem {
  level: number;
  name: string;
  picture?: string;
  value?: string;
  occurs?: number;
  redefines?: string;
  usage?: string;
  line: number;
}

export interface CobolParagraph {
  name: string;
  startLine: number;
  endLine: number;
  statements: string[];
  calls: string[];
}

export interface CobolStructure {
  programId: string;
  divisions: CobolDivision[];
  dataItems: CobolDataItem[];
  paragraphs: CobolParagraph[];
  fileDescriptions: string[];
  businessRules: string[];
  linesOfCode: number;
  complexity: number;
}

export class ClientCobolParser {
  private lines: string[];
  private currentLine: number = 0;

  constructor(content: string) {
    this.lines = content
      .split('\n')
      .map((line, index) => ({
        content: line.trim(),
        number: index + 1,
        isComment: line.trim().startsWith('*') || line.trim().startsWith('/'),
        isEmpty: !line.trim()
      }))
      .filter(line => !line.isEmpty && !line.isComment)
      .map(line => line.content);
  }

  parse(): CobolStructure {
    const structure: CobolStructure = {
      programId: '',
      divisions: [],
      dataItems: [],
      paragraphs: [],
      fileDescriptions: [],
      businessRules: [],
      linesOfCode: this.lines.length,
      complexity: 1
    };

    this.currentLine = 0;
    
    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      
      if (this.isDivisionHeader(line)) {
        const division = this.parseDivision();
        structure.divisions.push(division);
        
        // Extract specific content based on division type
        if (division.name.includes('IDENTIFICATION')) {
          structure.programId = this.extractProgramId(division.content);
        } else if (division.name.includes('DATA')) {
          structure.dataItems.push(...this.extractDataItems(division.content));
          structure.fileDescriptions.push(...this.extractFileDescriptions(division.content));
        } else if (division.name.includes('PROCEDURE')) {
          structure.paragraphs.push(...this.extractParagraphs(division.content));
          structure.businessRules.push(...this.extractBusinessRules(division.content));
        }
      } else {
        this.currentLine++;
      }
    }

    structure.complexity = this.calculateComplexity(structure);
    return structure;
  }

  private isDivisionHeader(line: string): boolean {
    return line.includes('DIVISION') && 
           (line.includes('IDENTIFICATION') || 
            line.includes('ENVIRONMENT') || 
            line.includes('DATA') || 
            line.includes('PROCEDURE'));
  }

  private parseDivision(): CobolDivision {
    const startLine = this.currentLine;
    const headerLine = this.lines[this.currentLine];
    const content: string[] = [headerLine];
    
    this.currentLine++;
    
    // Read until next division or end of file
    while (this.currentLine < this.lines.length && 
           !this.isDivisionHeader(this.lines[this.currentLine])) {
      content.push(this.lines[this.currentLine]);
      this.currentLine++;
    }

    return {
      name: headerLine,
      startLine,
      endLine: this.currentLine - 1,
      content
    };
  }

  private extractProgramId(content: string[]): string {
    for (const line of content) {
      if (line.includes('PROGRAM-ID')) {
        return line.replace(/PROGRAM-ID\.?\s*/i, '').replace(/\.$/, '').trim();
      }
    }
    return 'UNKNOWN';
  }

  private extractDataItems(content: string[]): CobolDataItem[] {
    const dataItems: CobolDataItem[] = [];
    let lineNumber = 0;

    for (const line of content) {
      lineNumber++;
      const match = line.match(/^(\d+)\s+([A-Z0-9-]+)(?:\s+PIC\s+([X9S\(\)]+))?(?:\s+VALUE\s+([^.\s]+))?/i);
      
      if (match) {
        const [, level, name, picture, value] = match;
        dataItems.push({
          level: parseInt(level),
          name,
          picture,
          value,
          line: lineNumber
        });
      }
    }

    return dataItems;
  }

  private extractFileDescriptions(content: string[]): string[] {
    const files: string[] = [];
    
    for (const line of content) {
      if (line.includes('SELECT') || line.includes('FD')) {
        files.push(line.trim());
      }
    }

    return files;
  }

  private extractParagraphs(content: string[]): CobolParagraph[] {
    const paragraphs: CobolParagraph[] = [];
    let currentParagraph: CobolParagraph | null = null;
    let lineNumber = 0;

    for (const line of content) {
      lineNumber++;
      
      // Check if this line is a paragraph header (ends with period and no spaces before name)
      if (line.match(/^[A-Z][A-Z0-9-]*\.\s*$/)) {
        // Save previous paragraph
        if (currentParagraph) {
          paragraphs.push(currentParagraph);
        }
        
        // Start new paragraph
        currentParagraph = {
          name: line.replace('.', ''),
          startLine: lineNumber,
          endLine: lineNumber,
          statements: [],
          calls: []
        };
      } else if (currentParagraph) {
        // Add to current paragraph
        currentParagraph.statements.push(line);
        currentParagraph.endLine = lineNumber;
        
        // Extract CALL statements
        if (line.includes('CALL')) {
          const callMatch = line.match(/CALL\s+['"]([^'"]+)['"]/i);
          if (callMatch) {
            currentParagraph.calls.push(callMatch[1]);
          }
        }
      }
    }

    // Don't forget the last paragraph
    if (currentParagraph) {
      paragraphs.push(currentParagraph);
    }

    return paragraphs;
  }

  private extractBusinessRules(content: string[]): string[] {
    const rules: string[] = [];
    
    for (const line of content) {
      // Look for common business rule patterns
      if (line.includes('IF') || 
          line.includes('WHEN') || 
          line.includes('EVALUATE') ||
          line.includes('COMPUTE') ||
          line.includes('ADD') ||
          line.includes('SUBTRACT') ||
          line.includes('MULTIPLY') ||
          line.includes('DIVIDE')) {
        rules.push(line.trim());
      }
    }

    return rules;
  }

  private calculateComplexity(structure: CobolStructure): number {
    let complexity = 1; // Base complexity
    
    // Add complexity for each decision point
    for (const paragraph of structure.paragraphs) {
      for (const statement of paragraph.statements) {
        if (statement.includes('IF')) complexity++;
        if (statement.includes('WHEN')) complexity++;
        if (statement.includes('EVALUATE')) complexity++;
        if (statement.includes('PERFORM') && statement.includes('UNTIL')) complexity++;
      }
    }
    
    return complexity;
  }

  // Generate Mermaid flowchart from parsed structure
  generateFlowchart(): string {
    const structure = this.parse();
    
    let mermaid = 'flowchart TD\n';
    mermaid += '  Start([Program Start]) --> Init[Initialize Variables]\n';
    
    // Add paragraphs as nodes
    structure.paragraphs.forEach((paragraph, index) => {
      const nodeId = `P${index}`;
      mermaid += `  ${index === 0 ? 'Init' : `P${index-1}`} --> ${nodeId}[${paragraph.name}]\n`;
      
      // Add calls as connections
      paragraph.calls.forEach(call => {
        mermaid += `  ${nodeId} --> CALL_${call.replace(/[^A-Z0-9]/g, '_')}[Call ${call}]\n`;
      });
    });
    
    mermaid += `  P${structure.paragraphs.length - 1} --> End([Program End])\n`;
    
    return mermaid;
  }

  // Generate data structure diagram
  generateDataDiagram(): string {
    const structure = this.parse();
    
    let mermaid = 'graph LR\n';
    
    // Group data items by level
    const levels = new Map<number, CobolDataItem[]>();
    structure.dataItems.forEach(item => {
      if (!levels.has(item.level)) {
        levels.set(item.level, []);
      }
      levels.get(item.level)!.push(item);
    });
    
    // Create hierarchy
    levels.forEach((items, level) => {
      items.forEach(item => {
        const nodeId = item.name.replace(/[^A-Z0-9]/g, '_');
        mermaid += `  ${nodeId}[${item.name}${item.picture ? `<br/>PIC ${item.picture}` : ''}]\n`;
      });
    });
    
    return mermaid;
  }
}

// Utility functions for immediate use
export function parseCobolQuick(content: string): CobolStructure {
  const parser = new ClientCobolParser(content);
  return parser.parse();
}

export function generateQuickDiagram(content: string): string {
  const parser = new ClientCobolParser(content);
  return parser.generateFlowchart();
}