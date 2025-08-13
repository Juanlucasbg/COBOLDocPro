import { storage } from "../storage";
import { CobolParser, type ParsedProgram } from "../cobol-parser";
import {
  generateClaudeBusinessRules,
  generateClaudeMermaidDiagram,
} from "../coco-llm";

type HybridAnalysisOptions = {
  deep?: boolean;
};

export type HybridAnalysisOutputs = {
  syntaxStructureIssues: string[]; // R
  inferredBusinessRules: Array<{ rule: string; condition?: string; action?: string; codeLocation?: string }>; // S
  mathematicalValidation: string[]; // T
  codeIntentAnalysis: string[]; // U
  qualityAssessments: string[]; // V
  correlation: {
    explanations: string; // X
    structureAdvice: string[]; // Y
    crossReferences: Array<{ type: string; source: string; target: string; note?: string }>; // Z
  };
  report: {
    markdown: string; // DD
    codeQualityMetrics: { linesOfCode: number; paragraphs: number; sections: number }; // EE
    businessLogicSummary: string[]; // FF
    improvementRecommendations: string[]; // GG
  };
  diagram?: { title: string; mermaid: string };
};

// Preprocessor (B)
function preprocessCobol(source: string): { preprocessed: string; comments: string[] } {
  const lines = source.split(/\r?\n/);
  const comments: string[] = [];
  const processed = lines
    .map((raw) => {
      const line = raw.replace(/\t/g, " ");
      // Capture comments (COBOL comment line often starts with *)
      if (/^\s*\*/.test(line)) {
        comments.push(line.replace(/^\s*\*/, "").trim());
        return "";
      }
      return line;
    })
    .join("\n");
  return { preprocessed: processed, comments };
}

// Traditional analyzers (C → E,F,G,H)
function fixedFormatHandler(parsed: ParsedProgram): string[] {
  const issues: string[] = [];
  if (parsed.divisions.length === 0) issues.push("No divisions detected");
  return issues;
}

function divisionStructureParser(parsed: ParsedProgram): { sections: number; paragraphs: number } {
  let sections = 0;
  let paragraphs = 0;
  for (const d of parsed.divisions) {
    sections += d.sections.length;
    for (const s of d.sections) {
      paragraphs += (s.paragraphs || []).length;
    }
  }
  return { sections, paragraphs };
}

function pictureClauseAnalyzer(parsed: ParsedProgram): string[] {
  const notes: string[] = [];
  for (const el of parsed.dataElements) {
    if (!el.picture) notes.push(`Data element ${el.name} has no PIC`);
  }
  return notes;
}

function controlFlowMapper(parsed: ParsedProgram): Array<{ from: string; to: string; type: string }> {
  // Very lightweight mapping from relationships
  return parsed.relationships.map((r) => ({ from: parsed.name, to: r.target, type: r.type }));
}

// LLM-assisted analyzers (D → I,J,K,L)
async function variableNameIntelligence(programName: string, parsed: ParsedProgram): Promise<string[]> {
  const variables = parsed.dataElements.map((e) => e.name).slice(0, 200); // cap to avoid prompt bloat
  if (variables.length === 0) return [];
  const rules = await generateClaudeBusinessRules(programName, variables.join("\n"));
  return rules.map((r) => r.rule);
}

async function mathematicalPatternRecognizer(programName: string, source: string): Promise<string[]> {
  // Reuse business rules extraction to surface math-related patterns by constraining the prompt indirectly
  const sample = source.slice(0, 4000);
  const rules = await generateClaudeBusinessRules(programName, sample);
  return rules
    .map((r) => r.rule)
    .filter((r) => /compute|calculate|formula|interest|rate|sum|average|divide|multiply/i.test(r));
}

async function commentAnalysisEngine(programName: string, comments: string[]): Promise<string[]> {
  if (comments.length === 0) return [];
  const joined = comments.slice(0, 300).join("\n");
  const rules = await generateClaudeBusinessRules(programName, joined);
  return rules.map((r) => r.rule);
}

async function codeStructureLearner(programName: string, parsed: ParsedProgram): Promise<string[]> {
  const outline = parsed.divisions
    .map((d) => `${d.name}:${d.sections.map((s) => s.name).join(',')}`)
    .join(" | ");
  const rules = await generateClaudeBusinessRules(programName, outline);
  return rules.map((r) => r.rule);
}

// Engines (M, N, O, P, Q)
function traditionalRuleEngine(
  fixedIssues: string[],
  pictureNotes: string[],
  controlFlow: Array<{ from: string; to: string; type: string }>
): string[] {
  const issues = [...fixedIssues, ...pictureNotes];
  if (controlFlow.length === 0) issues.push("No control flow relationships detected");
  return issues;
}

function domainInferenceEngine(varIntel: string[]): string[] {
  return varIntel.slice(0, 20);
}

function businessLogicValidator(mathPatterns: string[]): string[] {
  return mathPatterns.slice(0, 20);
}

function intentUnderstanding(commentIntents: string[]): string[] {
  return commentIntents.slice(0, 20);
}

function qualityPatternDetector(structurePatterns: string[]): string[] {
  return structurePatterns.slice(0, 20);
}

// Correlation engine (W → X,Y,Z)
function correlate(
  r: string[],
  s: string[],
  t: string[],
  u: string[],
  v: string[]
): { explanations: string; structureAdvice: string[]; crossReferences: Array<{ type: string; source: string; target: string; note?: string }> } {
  const explanations = [
    `Structural issues: ${r.length}`,
    `Inferred business rules: ${s.length}`,
    `Math validations: ${t.length}`,
    `Intent signals: ${u.length}`,
    `Quality patterns: ${v.length}`,
  ].join("\n");

  const structureAdvice = [] as string[];
  if (r.length > 0) structureAdvice.push("Address syntax/structure issues first");
  if (v.length > 0) structureAdvice.push("Refactor common anti-patterns detected in structure");

  const crossReferences = s.slice(0, 10).map((rule, idx) => ({ type: "rule", source: `S${idx + 1}`, target: "CODE", note: rule }));

  return { explanations, structureAdvice, crossReferences };
}

function buildReport(
  programName: string,
  parsed: ParsedProgram,
  outputs: {
    r: string[];
    s: string[];
    t: string[];
    u: string[];
    v: string[];
    correlation: { explanations: string; structureAdvice: string[]; crossReferences: Array<{ type: string; source: string; target: string; note?: string }> };
  }
) {
  const metrics = {
    linesOfCode: parsed.linesOfCode,
    paragraphs: parsed.divisions.reduce((acc, d) => acc + d.sections.reduce((a, s) => a + (s.paragraphs || []).length, 0), 0),
    sections: parsed.divisions.reduce((acc, d) => acc + d.sections.length, 0),
  };

  const md = `# ${programName} — Hybrid Code-Only Analysis\n\n## Summary\n${outputs.correlation.explanations}\n\n## Structural Issues (R)\n${outputs.r.map((i) => `- ${i}`).join("\n") || 'None detected'}\n\n## Inferred Business Rules (S)\n${outputs.s.map((i) => `- ${i}`).join("\n") || 'None inferred'}\n\n## Mathematical Validation (T)\n${outputs.t.map((i) => `- ${i}`).join("\n") || 'No math patterns detected'}\n\n## Code Intent (U)\n${outputs.u.map((i) => `- ${i}`).join("\n") || 'No explicit intent found'}\n\n## Quality Assessments (V)\n${outputs.v.map((i) => `- ${i}`).join("\n") || 'No issues detected'}\n\n## Structure Advice (Y)\n${outputs.correlation.structureAdvice.map((i) => `- ${i}`).join("\n") || 'No advice'}\n\n## Cross References (Z)\n${outputs.correlation.crossReferences.map((cr) => `- ${cr.type} ${cr.source} -> ${cr.target}: ${cr.note || ''}`).join("\n") || 'None'}\n\n## Metrics (EE)\n- Lines of Code: ${metrics.linesOfCode}\n- Sections: ${metrics.sections}\n- Paragraphs: ${metrics.paragraphs}\n`;

  return {
    markdown: md,
    codeQualityMetrics: metrics,
    businessLogicSummary: outputs.s.slice(0, 20),
    improvementRecommendations: outputs.correlation.structureAdvice,
  };
}

export async function runHybridAnalysis(programId: number, options: HybridAnalysisOptions = {}): Promise<HybridAnalysisOutputs> {
  const program = await storage.getProgram(programId);
  if (!program) throw new Error("Program not found");

  // A → B
  const { preprocessed, comments } = preprocessCobol(program.sourceCode);

  // B → C (Traditional parsing)
  const parser = new CobolParser();
  const parsed = parser.parse(preprocessed);

  // C → E,F,G,H
  const fixedIssues = fixedFormatHandler(parsed);
  const structureInfo = divisionStructureParser(parsed);
  const pictureNotes = pictureClauseAnalyzer(parsed);
  const controlFlow = controlFlowMapper(parsed);

  // D → I,J,K,L (LLM assisted)
  const [varIntel, mathPatterns, commentIntent, structPatterns] = await Promise.all([
    variableNameIntelligence(program.name, parsed),
    mathematicalPatternRecognizer(program.name, preprocessed),
    commentAnalysisEngine(program.name, comments),
    codeStructureLearner(program.name, parsed),
  ]);

  // Engines M,N,O,P,Q
  const r = traditionalRuleEngine(fixedIssues, pictureNotes, controlFlow);
  const s = domainInferenceEngine(varIntel);
  const t = businessLogicValidator(mathPatterns);
  const u = intentUnderstanding(commentIntent);
  const v = qualityPatternDetector(structPatterns);

  // W → X,Y,Z
  const correlation = correlate(r, s, t, u, v);

  // Optional diagram
  const diag = await generateClaudeMermaidDiagram(program.name, "Flow diagram for program");

  // Report DD + EE/FF/GG
  const report = buildReport(program.name, parsed, { r, s, t, u, v, correlation });

  return {
    syntaxStructureIssues: r,
    inferredBusinessRules: s.map((rule) => ({ rule })),
    mathematicalValidation: t,
    codeIntentAnalysis: u,
    qualityAssessments: v,
    correlation,
    report,
    diagram: { title: diag.title, mermaid: diag.mermaidCode },
  };
}


