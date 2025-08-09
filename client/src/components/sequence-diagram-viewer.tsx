import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MermaidDiagram } from "@/lib/mermaid-renderer";
import { ClientCobolParser } from "@/lib/cobol-client-parser";
import { generateSequenceDiagram, generateSystemSequenceDiagram } from "@/lib/mermaid-renderer";
import { Download, GitBranch, Clock, Database } from "lucide-react";
import type { Program } from "@shared/schema";

interface SequenceDiagramViewerProps {
  programs: Program[];
  selectedProgramId?: number;
}

export default function SequenceDiagramViewer({ programs, selectedProgramId }: SequenceDiagramViewerProps) {
  const [viewMode, setViewMode] = useState<'single' | 'system'>('single');
  const [selectedProgram, setSelectedProgram] = useState<number>(selectedProgramId || programs[0]?.id || 0);
  
  const currentProgram = programs.find(p => p.id === selectedProgram);
  
  const generateSingleProgramSequence = (program: Program) => {
    if (!program.sourceCode) return '';
    
    const parser = new ClientCobolParser(program.sourceCode);
    const structure = parser.parse();
    
    return generateSequenceDiagram(
      program.name,
      structure.paragraphs,
      structure.dataItems
    );
  };
  
  const generateMultiProgramSequence = () => {
    // Find programs that call each other
    const programsWithCalls = programs
      .filter(p => p.sourceCode)
      .map(program => {
        const parser = new ClientCobolParser(program.sourceCode!);
        const structure = parser.parse();
        
        const fileOperations = structure.businessRules.filter(rule =>
          rule.toLowerCase().includes('read') ||
          rule.toLowerCase().includes('write') ||
          rule.toLowerCase().includes('file')
        );
        
        return {
          name: program.name,
          calls: structure.paragraphs.flatMap(p => p.calls),
          fileOperations,
          businessRules: program.businessRules?.map(br => {
            if (typeof br === 'string') return br;
            return br.rule || br.condition || br.action || 'Business Rule';
          }) || []
        };
      });
    
    return generateSystemSequenceDiagram(programsWithCalls);
  };
  
  const downloadDiagram = (format: 'svg' | 'png' = 'svg') => {
    // Implementation for downloading diagram
    console.log(`Downloading ${viewMode} sequence diagram as ${format}`);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GitBranch className="h-5 w-5 text-blue-400" />
              <span>Sequence Diagrams</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadDiagram('svg')}
                className="border-gray-600 text-gray-300"
              >
                <Download className="h-4 w-4 mr-1" />
                Export SVG
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">View Mode:</label>
              <Select value={viewMode} onValueChange={(value: 'single' | 'system') => setViewMode(value)}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="single">Single Program</SelectItem>
                  <SelectItem value="system">System Interaction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {viewMode === 'single' && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-400">Program:</label>
                <Select value={selectedProgram.toString()} onValueChange={(value) => setSelectedProgram(parseInt(value))}>
                  <SelectTrigger className="w-48 bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {programs.map(program => (
                      <SelectItem key={program.id} value={program.id.toString()}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diagram Display */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-400" />
            <span>
              {viewMode === 'single' 
                ? `Execution Sequence - ${currentProgram?.name || 'Unknown'}` 
                : 'System Interaction Sequence'
              }
            </span>
            <Badge variant="outline" className="border-green-600 text-green-400">
              Sequence Diagram
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'single' && currentProgram ? (
            <div className="space-y-4">
              {/* Program Info */}
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <h4 className="font-medium text-white mb-2">Program Overview</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Lines of Code:</span>
                    <span className="text-white ml-2">{currentProgram.linesOfCode}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Complexity:</span>
                    <span className="text-white ml-2">{currentProgram.complexity || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <Badge className="ml-2" variant={currentProgram.status === 'completed' ? 'default' : 'secondary'}>
                      {currentProgram.status || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Sequence Diagram */}
              <MermaidDiagram
                code={generateSingleProgramSequence(currentProgram)}
                id={`sequence-single-${currentProgram.id}`}
                className="border border-gray-700 rounded-lg min-h-96"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* System Info */}
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <h4 className="font-medium text-white mb-2">System Overview</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Total Programs:</span>
                    <span className="text-white ml-2">{programs.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Inter-program Calls:</span>
                    <span className="text-white ml-2">
                      {programs.reduce((total, p) => {
                        if (!p.sourceCode) return total;
                        const parser = new ClientCobolParser(p.sourceCode);
                        const structure = parser.parse();
                        return total + structure.paragraphs.flatMap(para => para.calls).length;
                      }, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Data Operations:</span>
                    <span className="text-white ml-2">
                      {programs.reduce((total, p) => {
                        return total + (p.businessRules?.length || 0);
                      }, 0)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* System Sequence Diagram */}
              <MermaidDiagram
                code={generateMultiProgramSequence()}
                id="sequence-system"
                className="border border-gray-700 rounded-lg min-h-96"
              />
            </div>
          )}
          
          {/* Diagram Legend */}
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <h5 className="text-sm font-medium text-blue-400 mb-2">Sequence Diagram Legend:</h5>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-300">
              <div className="space-y-1">
                <div>→ Function Call</div>
                <div>⟵ Return Value</div>
                <div>⎕ Activation Box</div>
              </div>
              <div className="space-y-1">
                <div>📄 File Operations</div>
                <div>🔄 Business Logic</div>
                <div>💾 Database Access</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}