import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Users, 
  ArrowRight, 
  TrendingUp, 
  Settings,
  Eye,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import mermaid from "mermaid";

interface SystemExplanationProps {
  program: {
    name: string;
    systemExplanation?: {
      plainEnglishSummary: string;
      keyBusinessProcesses: string[];
      dataFlow: string;
      userImpact: string;
      technicalComplexity: string;
    } | null;
    mermaidDiagram?: {
      type: string;
      title: string;
      description: string;
      mermaidCode: string;
    } | null;
  };
}

export default function SystemExplanation({ program }: SystemExplanationProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    if (program.mermaidDiagram && mermaidRef.current) {
      mermaidRef.current.innerHTML = program.mermaidDiagram.mermaidCode;
      mermaid.init(undefined, mermaidRef.current);
    }
  }, [program.mermaidDiagram]);

  if (!program.systemExplanation && !program.mermaidDiagram) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-2" />
            <p>System explanation and diagrams are being generated...</p>
            <p className="text-sm mt-2">This usually takes a few moments.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plain English Summary */}
      {program.systemExplanation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="text-primary" size={20} />
              What This System Does (Plain English)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Summary */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                System Overview
              </h3>
              <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                {program.systemExplanation.plainEnglishSummary}
              </p>
            </div>

            {/* Key Business Processes */}
            {program.systemExplanation.keyBusinessProcesses.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Settings size={18} />
                  Key Business Processes
                </h3>
                <div className="grid gap-3">
                  {program.systemExplanation.keyBusinessProcesses.map((process, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{process}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Flow */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <ArrowRight size={18} />
                How Data Moves Through the System
              </h3>
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200">
                  {program.systemExplanation.dataFlow}
                </p>
              </div>
            </div>

            {/* User Impact */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Users size={18} />
                Impact on Users and Customers
              </h3>
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <p className="text-orange-800 dark:text-orange-200">
                  {program.systemExplanation.userImpact}
                </p>
              </div>
            </div>

            {/* Technical Complexity */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <TrendingUp size={18} />
                Technical Complexity Assessment
              </h3>
              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <p className="text-purple-800 dark:text-purple-200">
                  {program.systemExplanation.technicalComplexity}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mermaid Diagram */}
      {program.mermaidDiagram && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="text-primary" size={20} />
                  {program.mermaidDiagram.title}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {program.mermaidDiagram.description}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Download size={16} className="mr-2" />
                Export Diagram
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 overflow-x-auto">
              <div ref={mermaidRef} className="mermaid min-h-[300px] flex items-center justify-center">
                {program.mermaidDiagram.mermaidCode}
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <Badge variant="outline" className="mr-2">
                {program.mermaidDiagram.type}
              </Badge>
              Interactive diagram showing program flow and relationships
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}