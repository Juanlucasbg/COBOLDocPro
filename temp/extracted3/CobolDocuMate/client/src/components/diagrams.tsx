import { useState } from "react";
import { BarChart3, Download, ZoomIn } from "lucide-react";
import { type CobolProgram, type DiagramData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateDiagrams } from "@/lib/diagram-generator";

interface DiagramsProps {
  program: CobolProgram;
}

export default function Diagrams({ program }: DiagramsProps) {
  const [selectedDiagram, setSelectedDiagram] = useState<string | null>(null);

  if (program.status !== 'processed' || !program.diagrams) {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8 text-center">
            <BarChart3 className="h-16 w-16 text-carbon-gray-50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
              Diagrams Not Available
            </h3>
            <p className="text-carbon-gray-80">
              Program diagrams will be available once documentation processing is complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  let diagrams: DiagramData;
  try {
    diagrams = JSON.parse(program.diagrams);
  } catch {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8 text-center">
            <BarChart3 className="h-16 w-16 text-carbon-gray-50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
              Invalid Diagram Data
            </h3>
            <p className="text-carbon-gray-80">
              The diagram data appears to be corrupted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleExportDiagram = (diagramType: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${program.filename}-${diagramType}-diagram.mmd`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const DiagramViewer = ({ content, title }: { content: string; title: string }) => {
    const diagramId = `diagram-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-carbon-gray-100">{title}</h3>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportDiagram(title.toLowerCase().replace(/\s+/g, '-'), content)}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDiagram(selectedDiagram === diagramId ? null : diagramId)}
            >
              <ZoomIn className="h-4 w-4 mr-1" />
              {selectedDiagram === diagramId ? 'Normal' : 'Expand'}
            </Button>
          </div>
        </div>
        
        <div 
          className={`border border-carbon-gray-20 rounded-lg p-6 bg-white overflow-auto ${
            selectedDiagram === diagramId ? 'fixed inset-4 z-50 shadow-2xl' : ''
          }`}
        >
          <div id={diagramId} className="mermaid-diagram">
            {generateDiagrams(content, diagramId)}
          </div>
        </div>
        
        <details className="bg-carbon-gray-10 rounded-lg">
          <summary className="p-4 cursor-pointer font-medium text-carbon-gray-100">
            View Mermaid Source
          </summary>
          <div className="p-4 border-t border-carbon-gray-20">
            <pre className="text-sm font-mono text-carbon-gray-80 whitespace-pre-wrap overflow-x-auto">
              {content}
            </pre>
          </div>
        </details>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
      <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
        <div className="p-8">
          <h1 className="text-3xl font-semibold text-carbon-gray-100 mb-6">
            Program Diagrams
          </h1>

          <Tabs defaultValue="flowchart" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="flowchart">Program Flow</TabsTrigger>
              <TabsTrigger value="structure">Program Structure</TabsTrigger>
              <TabsTrigger value="data">Data Structure</TabsTrigger>
              <TabsTrigger value="business">Business Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="flowchart" className="mt-6">
              <DiagramViewer 
                content={diagrams.flowchart} 
                title="Program Flow Chart"
              />
            </TabsContent>

            <TabsContent value="structure" className="mt-6">
              <DiagramViewer 
                content={diagrams.programStructure} 
                title="Program Structure"
              />
            </TabsContent>

            <TabsContent value="data" className="mt-6">
              <DiagramViewer 
                content={diagrams.dataStructure} 
                title="Data Structure"
              />
            </TabsContent>

            <TabsContent value="business" className="mt-6">
              <DiagramViewer 
                content={diagrams.businessRules} 
                title="Business Rules"
              />
            </TabsContent>
          </Tabs>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">About These Diagrams</h4>
            <p className="text-sm text-blue-800">
              These diagrams are automatically generated from your COBOL program structure and business logic. 
              They use Mermaid.js syntax and can be exported for use in documentation or presentations.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              Click "Expand" to view diagrams in full screen, or "Export" to download the Mermaid source code.
            </p>
          </div>
        </div>
      </div>

      {/* Overlay for expanded diagrams */}
      {selectedDiagram && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSelectedDiagram(null)}
        />
      )}
    </div>
  );
}
