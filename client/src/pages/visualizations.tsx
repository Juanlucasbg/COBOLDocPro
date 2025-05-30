import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, GitBranch, Eye, Download } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { Program } from "@shared/schema";

export default function Visualizations() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["/api/programs"],
  });

  const filteredPrograms = (programs as Program[]).filter((program: Program) => {
    const hasDiagram = program.mermaidDiagram;
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.filename.toLowerCase().includes(searchQuery.toLowerCase());
    return hasDiagram && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Program Visualizations
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Mermaid diagrams and flowcharts generated from COBOL programs
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search visualizations by program name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Visualizations */}
      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <GitBranch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No visualizations available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Mermaid diagrams will appear here once COBOL programs are analyzed with AI processing
              </p>
              <Link href="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program: Program) => (
            <Card key={program.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg mb-2">{program.name}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {program.filename}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                    {program.mermaidDiagram?.type || 'Diagram'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {program.mermaidDiagram && (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {program.mermaidDiagram.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {program.mermaidDiagram.description}
                      </p>
                      
                      {/* Mermaid code preview */}
                      <div className="bg-gray-100 dark:bg-gray-900 rounded p-3">
                        <code className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                          {program.mermaidDiagram.mermaidCode.split('\n').slice(0, 3).join('\n')}
                          {program.mermaidDiagram.mermaidCode.split('\n').length > 3 && '\n...'}
                        </code>
                      </div>
                    </div>
                  )}
                  
                  {/* Program Info */}
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Lines of Code:</span>
                      <span>{program.linesOfCode}</span>
                    </div>
                    {program.complexity && (
                      <div className="flex justify-between">
                        <span>Complexity:</span>
                        <Badge variant="outline" className="text-xs">
                          {program.complexity}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href={`/program/${program.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}