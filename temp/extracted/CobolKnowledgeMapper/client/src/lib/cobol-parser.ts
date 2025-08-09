interface ParsedProgram {
  divisions: {
    identification?: IdentificationDivision;
    environment?: EnvironmentDivision;
    data?: DataDivision;
    procedure?: ProcedureDivision;
  };
  errors: ParseError[];
  warnings: ParseWarning[];
  dependencies: ProgramDependency[];
  crossReferences: CrossReference[];
}

interface IdentificationDivision {
  programId: string;
  author?: string;
  dateWritten?: string;
  dateCompiled?: string;
  security?: string;
  remarks?: string;
}

interface EnvironmentDivision {
  configurationSection?: ConfigurationSection;
  inputOutputSection?: InputOutputSection;
}

interface ConfigurationSection {
  sourceComputer?: string;
  objectComputer?: string;
  specialNames?: SpecialName[];
}

interface InputOutputSection {
  fileControl?: FileControlEntry[];
  ioControl?: string[];
}

interface FileControlEntry {
  fileName: string;
  assignTo: string;
  organization?: string;
  accessMode?: string;
  recordKey?: string;
  alternateRecordKey?: string[];
  fileStatus?: string;
}

interface DataDivision {
  fileSection?: FileSection[];
  workingStorageSection?: WorkingStorageSection[];
  linkageSection?: LinkageSection[];
  localStorageSection?: LocalStorageSection[];
}

interface FileSection {
  fileName: string;
  records: DataRecord[];
}

interface WorkingStorageSection {
  items: DataItem[];
}

interface LinkageSection {
  items: DataItem[];
}

interface LocalStorageSection {
  items: DataItem[];
}

interface DataRecord {
  level: number;
  name: string;
  picture?: string;
  value?: string;
  usage?: string;
  occurs?: number | string;
  redefines?: string;
  children?: DataRecord[];
}

interface DataItem extends DataRecord {}

interface ProcedureDivision {
  usingClause?: string[];
  givingClause?: string;
  paragraphs: Paragraph[];
  sections: Section[];
}

interface Paragraph {
  name: string;
  startLine: number;
  endLine: number;
  statements: Statement[];
}

interface Section {
  name: string;
  paragraphs: Paragraph[];
}

interface Statement {
  type: StatementType;
  line: number;
  content: string;
  verb: string;
  operands: string[];
  conditions?: Condition[];
}

type StatementType = 
  | 'MOVE' | 'COMPUTE' | 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE'
  | 'IF' | 'EVALUATE' | 'PERFORM' | 'CALL' | 'GOTO' | 'STOP'
  | 'OPEN' | 'CLOSE' | 'READ' | 'WRITE' | 'REWRITE' | 'DELETE'
  | 'DISPLAY' | 'ACCEPT' | 'INSPECT' | 'STRING' | 'UNSTRING'
  | 'SEARCH' | 'SORT' | 'MERGE' | 'COPY' | 'REPLACE'
  | 'EXIT' | 'CONTINUE' | 'NEXT' | 'INITIALIZE' | 'SET';

interface Condition {
  type: 'simple' | 'complex' | 'class' | 'sign';
  operand1: string;
  operator: string;
  operand2?: string;
}

interface ProgramDependency {
  type: 'CALL' | 'COPY' | 'INCLUDE';
  target: string;
  line: number;
  context: string;
  isCritical: boolean;
  parameters?: string[];
}

interface CrossReference {
  name: string;
  type: 'variable' | 'procedure' | 'file' | 'copybook';
  defined: number[];
  referenced: number[];
  modified: number[];
}

interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

interface ParseWarning extends ParseError {}

interface SpecialName {
  name: string;
  value: string;
}

export class CobolParser {
  private lines: string[] = [];
  private currentLine = 0;
  private errors: ParseError[] = [];
  private warnings: ParseWarning[] = [];
  private dependencies: ProgramDependency[] = [];
  private crossReferences: Map<string, CrossReference> = new Map();

  parse(content: string): ParsedProgram {
    this.lines = content.split('\n');
    this.currentLine = 0;
    this.errors = [];
    this.warnings = [];
    this.dependencies = [];
    this.crossReferences = new Map();

    const result: ParsedProgram = {
      divisions: {},
      errors: [],
      warnings: [],
      dependencies: [],
      crossReferences: []
    };

    try {
      // Parse each division
      result.divisions.identification = this.parseIdentificationDivision();
      result.divisions.environment = this.parseEnvironmentDivision();
      result.divisions.data = this.parseDataDivision();
      result.divisions.procedure = this.parseProcedureDivision();

      // Extract dependencies and cross-references
      this.extractDependencies();
      this.buildCrossReferences();

      result.dependencies = this.dependencies;
      result.crossReferences = Array.from(this.crossReferences.values());
      result.errors = this.errors;
      result.warnings = this.warnings;
    } catch (error) {
      this.addError(this.currentLine, 0, `Parse error: ${error}`, 'error', 'PARSE_ERROR');
      result.errors = this.errors;
    }

    return result;
  }

  private parseIdentificationDivision(): IdentificationDivision | undefined {
    const divisionLine = this.findLine(/^\s*IDENTIFICATION\s+DIVISION/i);
    if (divisionLine === -1) {
      this.addError(0, 0, 'IDENTIFICATION DIVISION not found', 'error', 'MISSING_DIVISION');
      return undefined;
    }

    this.currentLine = divisionLine + 1;
    const identification: IdentificationDivision = { programId: '' };

    // Parse PROGRAM-ID
    const programIdLine = this.findLine(/^\s*PROGRAM-ID\.\s*(.+?)\.?\s*$/i);
    if (programIdLine !== -1) {
      const match = this.lines[programIdLine].match(/^\s*PROGRAM-ID\.\s*(.+?)\.?\s*$/i);
      if (match) {
        identification.programId = match[1].trim();
      }
    } else {
      this.addError(this.currentLine, 0, 'PROGRAM-ID not found', 'error', 'MISSING_PROGRAM_ID');
    }

    // Parse other optional entries
    this.parseOptionalIdEntry(identification, 'AUTHOR', 'author');
    this.parseOptionalIdEntry(identification, 'DATE-WRITTEN', 'dateWritten');
    this.parseOptionalIdEntry(identification, 'DATE-COMPILED', 'dateCompiled');
    this.parseOptionalIdEntry(identification, 'SECURITY', 'security');
    this.parseOptionalIdEntry(identification, 'REMARKS', 'remarks');

    return identification;
  }

  private parseEnvironmentDivision(): EnvironmentDivision | undefined {
    const divisionLine = this.findLine(/^\s*ENVIRONMENT\s+DIVISION/i);
    if (divisionLine === -1) {
      return undefined; // Environment division is optional
    }

    this.currentLine = divisionLine + 1;
    const environment: EnvironmentDivision = {};

    // Parse CONFIGURATION SECTION
    const configSection = this.findLine(/^\s*CONFIGURATION\s+SECTION/i);
    if (configSection !== -1) {
      environment.configurationSection = this.parseConfigurationSection();
    }

    // Parse INPUT-OUTPUT SECTION
    const ioSection = this.findLine(/^\s*INPUT-OUTPUT\s+SECTION/i);
    if (ioSection !== -1) {
      environment.inputOutputSection = this.parseInputOutputSection();
    }

    return environment;
  }

  private parseDataDivision(): DataDivision | undefined {
    const divisionLine = this.findLine(/^\s*DATA\s+DIVISION/i);
    if (divisionLine === -1) {
      return undefined; // Data division is optional
    }

    this.currentLine = divisionLine + 1;
    const data: DataDivision = {};

    // Parse FILE SECTION
    const fileSection = this.findLine(/^\s*FILE\s+SECTION/i);
    if (fileSection !== -1) {
      data.fileSection = this.parseFileSection();
    }

    // Parse WORKING-STORAGE SECTION
    const wsSection = this.findLine(/^\s*WORKING-STORAGE\s+SECTION/i);
    if (wsSection !== -1) {
      data.workingStorageSection = this.parseWorkingStorageSection();
    }

    // Parse LINKAGE SECTION
    const linkageSection = this.findLine(/^\s*LINKAGE\s+SECTION/i);
    if (linkageSection !== -1) {
      data.linkageSection = this.parseLinkageSection();
    }

    return data;
  }

  private parseProcedureDivision(): ProcedureDivision | undefined {
    const divisionLine = this.findLine(/^\s*PROCEDURE\s+DIVISION/i);
    if (divisionLine === -1) {
      this.addError(this.currentLine, 0, 'PROCEDURE DIVISION not found', 'error', 'MISSING_DIVISION');
      return undefined;
    }

    this.currentLine = divisionLine;
    const procedure: ProcedureDivision = {
      paragraphs: [],
      sections: []
    };

    // Parse USING clause
    const usingMatch = this.lines[divisionLine].match(/USING\s+(.+?)(?:\s+GIVING|\.)/i);
    if (usingMatch) {
      procedure.usingClause = usingMatch[1].split(/\s+/);
    }

    // Parse GIVING clause
    const givingMatch = this.lines[divisionLine].match(/GIVING\s+(.+?)\./i);
    if (givingMatch) {
      procedure.givingClause = givingMatch[1].trim();
    }

    this.currentLine = divisionLine + 1;

    // Parse paragraphs and sections
    procedure.paragraphs = this.parseParagraphs();
    procedure.sections = this.parseSections();

    return procedure;
  }

  private parseOptionalIdEntry(
    identification: IdentificationDivision, 
    keyword: string, 
    property: keyof IdentificationDivision
  ): void {
    const line = this.findLine(new RegExp(`^\\s*${keyword}\\.\\s*(.+?)\\.*\\s*$`, 'i'));
    if (line !== -1) {
      const match = this.lines[line].match(new RegExp(`^\\s*${keyword}\\.\\s*(.+?)\\.*\\s*$`, 'i'));
      if (match) {
        (identification as any)[property] = match[1].trim();
      }
    }
  }

  private parseConfigurationSection(): ConfigurationSection {
    const config: ConfigurationSection = {};
    
    // Parse SOURCE-COMPUTER
    const sourceCompLine = this.findLine(/^\s*SOURCE-COMPUTER\.\s*(.+?)\.?\s*$/i);
    if (sourceCompLine !== -1) {
      const match = this.lines[sourceCompLine].match(/^\s*SOURCE-COMPUTER\.\s*(.+?)\.?\s*$/i);
      if (match) {
        config.sourceComputer = match[1].trim();
      }
    }

    // Parse OBJECT-COMPUTER
    const objectCompLine = this.findLine(/^\s*OBJECT-COMPUTER\.\s*(.+?)\.?\s*$/i);
    if (objectCompLine !== -1) {
      const match = this.lines[objectCompLine].match(/^\s*OBJECT-COMPUTER\.\s*(.+?)\.?\s*$/i);
      if (match) {
        config.objectComputer = match[1].trim();
      }
    }

    return config;
  }

  private parseInputOutputSection(): InputOutputSection {
    const io: InputOutputSection = {};
    
    // Parse FILE-CONTROL
    const fileControlLine = this.findLine(/^\s*FILE-CONTROL\./i);
    if (fileControlLine !== -1) {
      io.fileControl = this.parseFileControl();
    }

    return io;
  }

  private parseFileControl(): FileControlEntry[] {
    const entries: FileControlEntry[] = [];
    
    for (let i = this.currentLine; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      if (line.match(/^\s*SELECT\s+/i)) {
        const entry = this.parseSelectStatement(i);
        if (entry) {
          entries.push(entry);
        }
      }
      
      // Stop at next section
      if (line.match(/^\s*(DATA|PROCEDURE)\s+DIVISION/i) || 
          line.match(/^\s*I-O-CONTROL\./i)) {
        break;
      }
    }
    
    return entries;
  }

  private parseSelectStatement(startLine: number): FileControlEntry | null {
    const selectMatch = this.lines[startLine].match(/^\s*SELECT\s+(.+?)\s+ASSIGN/i);
    if (!selectMatch) return null;

    const entry: FileControlEntry = {
      fileName: selectMatch[1].trim(),
      assignTo: ''
    };

    // Parse multi-line SELECT statement
    let fullStatement = '';
    for (let i = startLine; i < this.lines.length; i++) {
      fullStatement += this.lines[i].trim() + ' ';
      if (this.lines[i].includes('.')) break;
    }

    // Extract ASSIGN TO
    const assignMatch = fullStatement.match(/ASSIGN\s+TO\s+(.+?)(?:\s|$)/i);
    if (assignMatch) {
      entry.assignTo = assignMatch[1].trim();
    }

    // Extract other optional clauses
    const orgMatch = fullStatement.match(/ORGANIZATION\s+IS\s+(.+?)(?:\s|$)/i);
    if (orgMatch) {
      entry.organization = orgMatch[1].trim();
    }

    const accessMatch = fullStatement.match(/ACCESS\s+MODE\s+IS\s+(.+?)(?:\s|$)/i);
    if (accessMatch) {
      entry.accessMode = accessMatch[1].trim();
    }

    return entry;
  }

  private parseFileSection(): FileSection[] {
    const sections: FileSection[] = [];
    // Implementation for parsing file section
    return sections;
  }

  private parseWorkingStorageSection(): WorkingStorageSection[] {
    const sections: WorkingStorageSection[] = [];
    
    const wsSection: WorkingStorageSection = {
      items: this.parseDataItems()
    };
    sections.push(wsSection);
    
    return sections;
  }

  private parseLinkageSection(): LinkageSection[] {
    const sections: LinkageSection[] = [];
    
    const linkageSection: LinkageSection = {
      items: this.parseDataItems()
    };
    sections.push(linkageSection);
    
    return sections;
  }

  private parseDataItems(): DataItem[] {
    const items: DataItem[] = [];
    
    for (let i = this.currentLine; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Stop at next section or division
      if (line.match(/^\s*(PROCEDURE|FILE|LINKAGE|LOCAL-STORAGE)\s+(DIVISION|SECTION)/i)) {
        break;
      }
      
      // Parse data item
      const levelMatch = line.match(/^\s*(\d{2})\s+(.+)/);
      if (levelMatch) {
        const item = this.parseDataItem(i);
        if (item) {
          items.push(item);
        }
      }
    }
    
    return items;
  }

  private parseDataItem(lineIndex: number): DataItem | null {
    const line = this.lines[lineIndex].trim();
    const levelMatch = line.match(/^\s*(\d{2})\s+(.+)/);
    
    if (!levelMatch) return null;

    const level = parseInt(levelMatch[1]);
    const rest = levelMatch[2];

    // Extract name
    const nameMatch = rest.match(/^([A-Z0-9\-]+)/i);
    if (!nameMatch) return null;

    const item: DataItem = {
      level,
      name: nameMatch[1]
    };

    // Extract PICTURE clause
    const picMatch = rest.match(/PIC(?:TURE)?\s+IS\s+(.+?)(?:\s|$)/i);
    if (picMatch) {
      item.picture = picMatch[1].trim();
    }

    // Extract VALUE clause
    const valueMatch = rest.match(/VALUE\s+IS\s+(.+?)(?:\s|$)/i);
    if (valueMatch) {
      item.value = valueMatch[1].trim();
    }

    // Extract OCCURS clause
    const occursMatch = rest.match(/OCCURS\s+(.+?)(?:\s+TIMES)?(?:\s|$)/i);
    if (occursMatch) {
      const occursValue = occursMatch[1].trim();
      item.occurs = isNaN(parseInt(occursValue)) ? occursValue : parseInt(occursValue);
    }

    // Extract REDEFINES clause
    const redefinesMatch = rest.match(/REDEFINES\s+(.+?)(?:\s|$)/i);
    if (redefinesMatch) {
      item.redefines = redefinesMatch[1].trim();
    }

    return item;
  }

  private parseParagraphs(): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    for (let i = this.currentLine; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Check for paragraph name (ends with period, not indented)
      if (line.match(/^[A-Z0-9\-]+\.\s*$/i) && !line.startsWith(' ')) {
        const paragraphName = line.replace('.', '').trim();
        const paragraph = this.parseParagraph(paragraphName, i);
        if (paragraph) {
          paragraphs.push(paragraph);
        }
      }
    }
    
    return paragraphs;
  }

  private parseParagraph(name: string, startLine: number): Paragraph | null {
    const paragraph: Paragraph = {
      name,
      startLine: startLine + 1,
      endLine: startLine + 1,
      statements: []
    };

    // Find end of paragraph
    for (let i = startLine + 1; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Stop at next paragraph or section
      if ((line.match(/^[A-Z0-9\-]+\.\s*$/i) && !line.startsWith(' ')) ||
          line.match(/^\s*[A-Z0-9\-]+\s+SECTION\./i)) {
        paragraph.endLine = i - 1;
        break;
      }
      
      // Parse statement
      if (line && !line.startsWith('*')) {
        const statement = this.parseStatement(line, i + 1);
        if (statement) {
          paragraph.statements.push(statement);
        }
      }
    }

    return paragraph;
  }

  private parseSections(): Section[] {
    const sections: Section[] = [];
    
    for (let i = this.currentLine; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Check for section name
      if (line.match(/^\s*[A-Z0-9\-]+\s+SECTION\./i)) {
        const sectionName = line.replace(/\s+SECTION\..*$/i, '').trim();
        // Parse section content...
      }
    }
    
    return sections;
  }

  private parseStatement(line: string, lineNumber: number): Statement | null {
    // Remove leading/trailing whitespace and comments
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('*')) return null;

    // Extract verb (first word)
    const verbMatch = cleanLine.match(/^([A-Z\-]+)/i);
    if (!verbMatch) return null;

    const verb = verbMatch[1].toUpperCase();
    const rest = cleanLine.substring(verb.length).trim();

    const statement: Statement = {
      type: verb as StatementType,
      line: lineNumber,
      content: cleanLine,
      verb,
      operands: this.parseOperands(rest)
    };

    // Parse conditions for IF statements
    if (verb === 'IF') {
      statement.conditions = this.parseConditions(rest);
    }

    return statement;
  }

  private parseOperands(operandString: string): string[] {
    // Simple operand parsing - can be enhanced
    return operandString.split(/\s+/).filter(op => op.length > 0);
  }

  private parseConditions(conditionString: string): Condition[] {
    const conditions: Condition[] = [];
    
    // Simple condition parsing - can be enhanced
    const simpleCondMatch = conditionString.match(/(\S+)\s+(=|>|<|>=|<=|NOT\s*=)\s+(\S+)/i);
    if (simpleCondMatch) {
      conditions.push({
        type: 'simple',
        operand1: simpleCondMatch[1],
        operator: simpleCondMatch[2],
        operand2: simpleCondMatch[3]
      });
    }

    return conditions;
  }

  private extractDependencies(): void {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Extract CALL dependencies
      const callMatch = line.match(/CALL\s+['"]([^'"]+)['"]/i);
      if (callMatch) {
        this.dependencies.push({
          type: 'CALL',
          target: callMatch[1],
          line: i + 1,
          context: line,
          isCritical: this.isCriticalDependency(line),
          parameters: this.extractCallParameters(line)
        });
      }

      // Extract COPY dependencies
      const copyMatch = line.match(/COPY\s+([A-Z0-9\-]+)/i);
      if (copyMatch) {
        this.dependencies.push({
          type: 'COPY',
          target: copyMatch[1],
          line: i + 1,
          context: line,
          isCritical: false
        });
      }
    }
  }

  private isCriticalDependency(line: string): boolean {
    // Determine if dependency is critical based on context
    return line.toLowerCase().includes('critical') || 
           line.toLowerCase().includes('essential') ||
           line.toLowerCase().includes('required');
  }

  private extractCallParameters(line: string): string[] {
    const usingMatch = line.match(/USING\s+(.+?)(?:\s+GIVING|$)/i);
    if (usingMatch) {
      return usingMatch[1].split(/\s+/);
    }
    return [];
  }

  private buildCrossReferences(): void {
    // Build cross-reference table for variables, procedures, etc.
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Simple variable reference detection
      const words = line.split(/\s+/);
      words.forEach(word => {
        if (word.match(/^[A-Z][A-Z0-9\-]*$/)) {
          this.addCrossReference(word, 'variable', i + 1, 'referenced');
        }
      });
    }
  }

  private addCrossReference(
    name: string, 
    type: CrossReference['type'], 
    line: number, 
    usage: 'defined' | 'referenced' | 'modified'
  ): void {
    if (!this.crossReferences.has(name)) {
      this.crossReferences.set(name, {
        name,
        type,
        defined: [],
        referenced: [],
        modified: []
      });
    }

    const ref = this.crossReferences.get(name)!;
    switch (usage) {
      case 'defined':
        ref.defined.push(line);
        break;
      case 'referenced':
        ref.referenced.push(line);
        break;
      case 'modified':
        ref.modified.push(line);
        break;
    }
  }

  private findLine(pattern: RegExp): number {
    for (let i = this.currentLine; i < this.lines.length; i++) {
      if (pattern.test(this.lines[i])) {
        return i;
      }
    }
    return -1;
  }

  private addError(
    line: number, 
    column: number, 
    message: string, 
    severity: ParseError['severity'], 
    code: string
  ): void {
    this.errors.push({ line, column, message, severity, code });
  }

  private addWarning(
    line: number, 
    column: number, 
    message: string, 
    code: string
  ): void {
    this.warnings.push({ line, column, message, severity: 'warning', code });
  }
}

// Export a simple parsing function for the application
export function parseCobolCode(code: string) {
  const parser = new CobolParser();
  const result = parser.parse(code);
  
  return {
    programId: result.divisions.identification?.programId || 'UNKNOWN',
    divisions: {
      identification: result.divisions.identification ? ['IDENTIFICATION DIVISION'] : [],
      environment: result.divisions.environment ? ['ENVIRONMENT DIVISION'] : [],
      data: result.divisions.data ? ['DATA DIVISION'] : [],
      procedure: result.divisions.procedure ? ['PROCEDURE DIVISION'] : []
    },
    errors: result.errors,
    warnings: result.warnings,
    dependencies: result.dependencies
  };
}

export type {
  ParsedProgram,
  ProgramDependency,
  CrossReference,
  ParseError,
  ParseWarning,
  Statement,
  StatementType
};
