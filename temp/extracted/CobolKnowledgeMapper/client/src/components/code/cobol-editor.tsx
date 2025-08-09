import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Info, 
  Bookmark, 
  ExternalLink,
  Copy,
  Search,
  MessageCircle
} from "lucide-react";
import type { CobolProgram, Dependency, Annotation } from "@shared/schema";

interface CobolEditorProps {
  program: CobolProgram;
  dependencies: Dependency[];
  annotations: Annotation[];
  crossReferences: Array<{
    name: string;
    lines: number[];
    type: 'variable' | 'procedure' | 'copybook';
  }>;
  syntaxErrors: Array<{
    line: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}

interface LineAnnotation {
  line: number;
  type: 'dependency' | 'annotation' | 'error' | 'reference';
  content: string;
  severity?: 'error' | 'warning' | 'info';
}

export default function CobolEditor({ 
  program, 
  dependencies, 
  annotations, 
  crossReferences,
  syntaxErrors 
}: CobolEditorProps) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedLines, setHighlightedLines] = useState<Set<number>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);

  // Parse content into lines
  const lines = program.content.split('\n');

  // Create line annotations map
  const lineAnnotations = new Map<number, LineAnnotation[]>();

  // Add dependency annotations
  dependencies.forEach(dep => {
    if (dep.lineNumber) {
      const existing = lineAnnotations.get(dep.lineNumber) || [];
      existing.push({
        line: dep.lineNumber,
        type: 'dependency',
        content: `${dep.dependencyType.toUpperCase()}: Program ${dep.toProgramId}`,
        severity: dep.isCritical ? 'error' : 'info'
      });
      lineAnnotations.set(dep.lineNumber, existing);
    }
  });

  // Add user annotations
  annotations.forEach(annotation => {
    const existing = lineAnnotations.get(annotation.lineNumber) || [];
    existing.push({
      line: annotation.lineNumber,
      type: 'annotation',
      content: annotation.content,
      severity: annotation.type === 'warning' ? 'warning' : 'info'
    });
    lineAnnotations.set(annotation.lineNumber, existing);
  });

  // Add syntax errors
  syntaxErrors.forEach(error => {
    const existing = lineAnnotations.get(error.line) || [];
    existing.push({
      line: error.line,
      type: 'error',
      content: error.message,
      severity: error.severity
    });
    lineAnnotations.set(error.line, existing);
  });

  // Add cross-reference annotations
  crossReferences.forEach(ref => {
    ref.lines.forEach(lineNum => {
      const existing = lineAnnotations.get(lineNum) || [];
      existing.push({
        line: lineNum,
        type: 'reference',
        content: `Reference: ${ref.name} (${ref.type})`,
        severity: 'info'
      });
      lineAnnotations.set(lineNum, existing);
    });
  });

  // COBOL syntax highlighting
  const highlightCobolSyntax = (line: string): string => {
    let highlighted = line;
    
    // COBOL keywords
    const keywords = [
      'IDENTIFICATION', 'PROGRAM-ID', 'ENVIRONMENT', 'DATA', 'PROCEDURE',
      'DIVISION', 'SECTION', 'WORKING-STORAGE', 'FILE-SECTION', 'LINKAGE',
      'PERFORM', 'CALL', 'COPY', 'MOVE', 'IF', 'ELSE', 'END-IF', 'EVALUATE',
      'WHEN', 'OTHER', 'DISPLAY', 'ACCEPT', 'OPEN', 'CLOSE', 'READ', 'WRITE',
      'REWRITE', 'DELETE', 'START', 'STOP', 'RUN', 'GOTO', 'EXIT', 'RETURN',
      'COMPUTE', 'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'PIC', 'PICTURE',
      'VALUE', 'OCCURS', 'REDEFINES', 'USAGE', 'COMP', 'COMP-3', 'BINARY'
    ];

    // Highlight keywords
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<span class="syntax-keyword">${keyword}</span>`);
    });

    // Highlight strings
    highlighted = highlighted.replace(
      /'([^']*)'/g, 
      '<span class="syntax-string">\'$1\'</span>'
    );
    highlighted = highlighted.replace(
      /"([^"]*)"/g, 
      '<span class="syntax-string">"$1"</span>'
    );

    // Highlight comments
    highlighted = highlighted.replace(
      /^\s*\*.*$/g, 
      '<span class="syntax-comment">$&</span>'
    );

    // Highlight numbers
    highlighted = highlighted.replace(
      /\b\d+(\.\d+)?\b/g, 
      '<span class="syntax-number">$&</span>'
    );

    // Highlight operators
    highlighted = highlighted.replace(
      /(\+|\-|\*|\/|=|>|<|>=|<=)/g, 
      '<span class="syntax-operator">$1</span>'
    );

    // Highlight CALL and COPY statements specially
    highlighted = highlighted.replace(
      /\b(CALL|COPY)\s+([A-Z0-9\-]+)/gi,
      '<span class="syntax-keyword">$1</span> <span class="bg-blue-900 text-blue-300 px-1 rounded cursor-pointer hover:bg-blue-800">$2</span>'
    );

    return highlighted;
  };

  // Handle line click
  const handleLineClick = (lineNumber: number) => {
    setSelectedLine(selectedLine === lineNumber ? null : lineNumber);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const highlighted = new Set<number>();
    
    if (query.trim()) {
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
          highlighted.add(index + 1);
        }
      });
    }
    
    setHighlightedLines(highlighted);
  };

  // Get line class names
  const getLineClassName = (lineNumber: number) => {
    const classes = ['code-line', 'flex', 'hover:bg-slate-800/50', 'transition-colors'];
    
    if (selectedLine === lineNumber) {
      classes.push('bg-blue-900/30', 'border-l-4', 'border-blue-500');
    } else if (hoveredLine === lineNumber) {
      classes.push('bg-slate-800/30');
    }
    
    if (highlightedLines.has(lineNumber)) {
      classes.push('bg-yellow-900/20');
    }
    
    const annotations = lineAnnotations.get(lineNumber);
    if (annotations?.some(a => a.severity === 'error')) {
      classes.push('border-l-2', 'border-red-500');
    } else if (annotations?.some(a => a.severity === 'warning')) {
      classes.push('border-l-2', 'border-yellow-500');
    } else if (annotations?.length) {
      classes.push('border-l-2', 'border-blue-500');
    }
    
    return classes.join(' ');
  };

  // Get line indicators
  const getLineIndicators = (lineNumber: number) => {
    const annotations = lineAnnotations.get(lineNumber) || [];
    return annotations.map(annotation => {
      switch (annotation.type) {
        case 'dependency':
          return <ExternalLink className="w-3 h-3 text-blue-400" key={`dep-${lineNumber}`} />;
        case 'annotation':
          return <MessageCircle className="w-3 h-3 text-purple-400" key={`ann-${lineNumber}`} />;
        case 'error':
          return <AlertTriangle className="w-3 h-3 text-red-400" key={`err-${lineNumber}`} />;
        case 'reference':
          return <Info className="w-3 h-3 text-teal-400" key={`ref-${lineNumber}`} />;
        default:
          return null;
      }
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search in code..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {highlightedLines.size > 0 && (
            <Badge variant="outline" className="text-xs">
              {highlightedLines.size} matches
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {lines.length} lines
          </Badge>
          <Badge variant="outline" className="text-xs">
            {lineAnnotations.size} annotations
          </Badge>
          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers and Code */}
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div ref={editorRef} className="font-mono text-sm">
              {lines.map((line, index) => {
                const lineNumber = index + 1;
                const annotations = lineAnnotations.get(lineNumber) || [];
                
                return (
                  <div key={lineNumber}>
                    <div
                      className={getLineClassName(lineNumber)}
                      onClick={() => handleLineClick(lineNumber)}
                      onMouseEnter={() => setHoveredLine(lineNumber)}
                      onMouseLeave={() => setHoveredLine(null)}
                    >
                      {/* Line Number */}
                      <div className="w-16 text-right text-slate-500 select-none px-3 py-1 flex items-center justify-end space-x-1">
                        <span>{lineNumber}</span>
                        <div className="flex space-x-1">
                          {getLineIndicators(lineNumber)}
                        </div>
                      </div>
                      
                      {/* Code Content */}
                      <div 
                        className="flex-1 px-3 py-1 text-slate-100 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightCobolSyntax(line) 
                        }}
                      />
                    </div>
                    
                    {/* Annotations */}
                    {selectedLine === lineNumber && annotations.length > 0 && (
                      <div className="bg-slate-800 border-l-4 border-blue-500 ml-16 mr-4 mb-2">
                        {annotations.map((annotation, idx) => (
                          <div key={idx} className="p-3 border-b border-slate-700 last:border-b-0">
                            <div className="flex items-start space-x-2">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                annotation.severity === 'error' ? 'bg-red-500' :
                                annotation.severity === 'warning' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      annotation.type === 'dependency' ? 'text-blue-300' :
                                      annotation.type === 'annotation' ? 'text-purple-300' :
                                      annotation.type === 'error' ? 'text-red-300' :
                                      'text-teal-300'
                                    }`}
                                  >
                                    {annotation.type.toUpperCase()}
                                  </Badge>
                                  {annotation.severity && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        annotation.severity === 'error' ? 'text-red-300' :
                                        annotation.severity === 'warning' ? 'text-yellow-300' :
                                        'text-blue-300'
                                      }`}
                                    >
                                      {annotation.severity.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-300">{annotation.content}</p>
                                {annotation.type === 'dependency' && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 p-0"
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    View Dependency
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Minimap (simplified) */}
        <div className="w-20 bg-slate-800 border-l border-slate-700 overflow-hidden">
          <div className="p-2">
            <div className="space-y-px">
              {lines.map((_, index) => {
                const lineNumber = index + 1;
                const hasAnnotation = lineAnnotations.has(lineNumber);
                const isHighlighted = highlightedLines.has(lineNumber);
                const isSelected = selectedLine === lineNumber;
                
                return (
                  <div
                    key={lineNumber}
                    className={`h-1 w-full rounded-sm cursor-pointer ${
                      isSelected ? 'bg-blue-500' :
                      isHighlighted ? 'bg-yellow-500' :
                      hasAnnotation ? 'bg-slate-600' :
                      'bg-slate-700'
                    }`}
                    onClick={() => handleLineClick(lineNumber)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-4">
          <span>Line {selectedLine || 1} of {lines.length}</span>
          <span>{program.programType.toUpperCase()}</span>
          <span>{program.linesOfCode} lines</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>{dependencies.length} dependencies</span>
          <span>{annotations.length} annotations</span>
          <span>{syntaxErrors.length} errors</span>
        </div>
      </div>
    </div>
  );
}
