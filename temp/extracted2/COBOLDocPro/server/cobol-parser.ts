export interface ParsedProgram {
  name: string;
  divisions: Division[];
  dataElements: ParsedDataElement[];
  relationships: ParsedRelationship[];
  linesOfCode: number;
}

export interface Division {
  name: string;
  sections: Section[];
}

export interface Section {
  name: string;
  paragraphs: string[];
}

export interface ParsedDataElement {
  name: string;
  level: string;
  picture?: string;
  usage?: string;
  parentElement?: string;
  lineNumber: number;
}

export interface ParsedRelationship {
  type: "CALL" | "PERFORM" | "INCLUDE" | "GO_TO";
  target: string;
  location: string;
}

export class CobolParser {
  private sourceLines: string[] = [];
  private currentLineIndex = 0;
  private memoryItems: Array<{type: string, content: any, timestamp: string}> = [];
  private userPreferences: Record<string, any> = {};

  parse(sourceCode: string): ParsedProgram {
    this.sourceLines = sourceCode.split('\n').map(line => line.trim());
    this.currentLineIndex = 0;

    const programName = this.extractProgramName();
    const divisions = this.parseDivisions();
    const dataElements = this.parseDataElements();
    const relationships = this.parseRelationships();

    return {
      name: programName,
      divisions,
      dataElements,
      relationships,
      linesOfCode: this.sourceLines.filter(line => line.length > 0 && !line.startsWith('*')).length
    };
  }

  private extractProgramName(): string {
    for (const line of this.sourceLines) {
      const match = line.match(/PROGRAM-ID\.\s+([A-Z0-9-]+)/i);
      if (match) {
        return match[1];
      }
    }
    return "UNKNOWN";
  }

  private parseDivisions(): Division[] {
    const divisions: Division[] = [];
    const divisionNames = ["IDENTIFICATION", "ENVIRONMENT", "DATA", "PROCEDURE"];

    for (const divName of divisionNames) {
      const division = this.parseDivision(divName);
      if (division) {
        divisions.push(division);
      }
    }

    return divisions;
  }

  private parseDivision(divisionName: string): Division | null {
    const divisionRegex = new RegExp(`${divisionName}\\s+DIVISION`, 'i');
    let startIndex = -1;
    let endIndex = this.sourceLines.length;

    // Find division start
    for (let i = 0; i < this.sourceLines.length; i++) {
      if (divisionRegex.test(this.sourceLines[i])) {
        startIndex = i;
        break;
      }
    }

    if (startIndex === -1) return null;

    // Find division end (next division or end of file)
    for (let i = startIndex + 1; i < this.sourceLines.length; i++) {
      if (this.sourceLines[i].match(/\b(IDENTIFICATION|ENVIRONMENT|DATA|PROCEDURE)\s+DIVISION/i)) {
        endIndex = i;
        break;
      }
    }

    const sections = this.parseSections(startIndex, endIndex, divisionName);

    return {
      name: divisionName,
      sections
    };
  }

  private parseSections(startIndex: number, endIndex: number, divisionName: string): Section[] {
    const sections: Section[] = [];
    
    if (divisionName === "DATA") {
      // Parse DATA DIVISION sections
      const sectionNames = ["FILE", "WORKING-STORAGE", "LOCAL-STORAGE", "LINKAGE"];
      for (const sectionName of sectionNames) {
        const section = this.parseDataSection(sectionName, startIndex, endIndex);
        if (section) {
          sections.push(section);
        }
      }
    } else if (divisionName === "PROCEDURE") {
      // Parse PROCEDURE DIVISION paragraphs
      const paragraphs = this.parseParagraphs(startIndex, endIndex);
      if (paragraphs.length > 0) {
        sections.push({
          name: "MAIN",
          paragraphs
        });
      }
    } else {
      // For IDENTIFICATION and ENVIRONMENT, just collect all content
      sections.push({
        name: "MAIN",
        paragraphs: []
      });
    }

    return sections;
  }

  private parseDataSection(sectionName: string, startIndex: number, endIndex: number): Section | null {
    const sectionRegex = new RegExp(`${sectionName}\\s+SECTION`, 'i');
    let sectionStart = -1;

    for (let i = startIndex; i < endIndex; i++) {
      if (sectionRegex.test(this.sourceLines[i])) {
        sectionStart = i;
        break;
      }
    }

    if (sectionStart === -1) return null;

    return {
      name: sectionName,
      paragraphs: []
    };
  }

  private parseParagraphs(startIndex: number, endIndex: number): string[] {
    const paragraphs: string[] = [];
    
    for (let i = startIndex; i < endIndex; i++) {
      const line = this.sourceLines[i];
      // Look for paragraph names (lines that end with a period and don't start with numbers)
      if (line.match(/^[A-Z][A-Z0-9-]*\.\s*$/)) {
        const paragraphName = line.replace('.', '').trim();
        paragraphs.push(paragraphName);
      }
    }

    return paragraphs;
  }

  private parseDataElements(): ParsedDataElement[] {
    const dataElements: ParsedDataElement[] = [];
    let inDataDivision = false;
    let inWorkingStorage = false;

    for (let i = 0; i < this.sourceLines.length; i++) {
      const line = this.sourceLines[i];

      if (line.match(/DATA\s+DIVISION/i)) {
        inDataDivision = true;
        continue;
      }

      if (line.match(/PROCEDURE\s+DIVISION/i)) {
        inDataDivision = false;
        break;
      }

      if (inDataDivision && line.match(/WORKING-STORAGE\s+SECTION/i)) {
        inWorkingStorage = true;
        continue;
      }

      if (inWorkingStorage && line.match(/^\s*(\d{2})\s+([A-Z0-9-]+)/)) {
        const match = line.match(/^\s*(\d{2})\s+([A-Z0-9-]+)(?:\s+PIC\s+([X9V\(\)]+))?(?:\s+USAGE\s+([A-Z-]+))?/i);
        if (match) {
          const [, level, name, picture, usage] = match;
          dataElements.push({
            name,
            level,
            picture,
            usage,
            lineNumber: i + 1
          });
        }
      }
    }

    return dataElements;
  }

  private parseRelationships(): ParsedRelationship[] {
    const relationships: ParsedRelationship[] = [];

    for (let i = 0; i < this.sourceLines.length; i++) {
      const line = this.sourceLines[i];

      // Parse CALL statements
      const callMatch = line.match(/CALL\s+['"]([A-Z0-9-]+)['"]/i);
      if (callMatch) {
        relationships.push({
          type: "CALL",
          target: callMatch[1],
          location: `Line ${i + 1}`
        });
      }

      // Parse PERFORM statements
      const performMatch = line.match(/PERFORM\s+([A-Z0-9-]+)/i);
      if (performMatch) {
        relationships.push({
          type: "PERFORM",
          target: performMatch[1],
          location: `Line ${i + 1}`
        });
      }

      // Parse COPY statements (includes)
      const copyMatch = line.match(/COPY\s+([A-Z0-9-]+)/i);
      if (copyMatch) {
        relationships.push({
          type: "INCLUDE",
          target: copyMatch[1],
          location: `Line ${i + 1}`
        });
      }
    }

    return relationships;
  }
}
