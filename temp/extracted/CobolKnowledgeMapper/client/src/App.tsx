import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, FileText, GitBranch, Brain, Upload, Play } from "lucide-react";
import { useCobolAnalysis } from "./hooks/use-cobol-analysis";

function CobolNavigator() {
  const [cobolCode, setCobolCode] = useState("");
  const [documentation, setDocumentation] = useState("");
  const { analyzeCode, isAnalyzing, result, error } = useCobolAnalysis();

  const handleAnalyze = async () => {
    if (!cobolCode.trim()) return;
    
    await analyzeCode(cobolCode);
    
    setDocumentation("Generating documentation...");
    setTimeout(() => {
      setDocumentation(`# ${result?.programId || 'COBOL Program'} Documentation

## Overview
This COBOL program contains ${result?.metrics.linesOfCode || 0} lines of code with a complexity score of ${result?.metrics.complexity || 0}.

## Program Structure
- **Program ID**: ${result?.programId || 'Unknown'}
- **Divisions Found**: ${Object.values(result?.divisions || {}).flat().length || 0}
- **Dependencies**: ${result?.dependencies.calls.length || 0} calls, ${result?.dependencies.copybooks.length || 0} copybooks

## Key Components
${result?.dependencies.calls.map(call => `- Calls: ${call}`).join('\n') || '- No external calls found'}
${result?.dependencies.copybooks.map(copy => `- Copybook: ${copy}`).join('\n') || '- No copybooks found'}

## Maintainability
- **Maintainability Index**: ${result?.metrics.maintainabilityIndex || 0}/100
- **Complexity**: ${result?.metrics.complexity || 0}/10

## Recommendations
- Consider breaking down complex procedures into smaller modules
- Ensure proper error handling is implemented
- Document business logic for junior developers`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">COBOL Navigator Pro</h1>
          <p className="text-blue-200">AI-Powered Legacy Code Analysis & Documentation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800/90 border-blue-600/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Code className="h-5 w-5" />
                COBOL Code Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your COBOL code here..."
                value={cobolCode}
                onChange={(e) => setCobolCode(e.target.value)}
                className="min-h-[400px] bg-slate-900 text-green-400 font-mono text-sm border-slate-600"
              />
              <div className="mt-4 flex gap-2">
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !cobolCode.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Analyze & Document
                    </>
                  )}
                </Button>
                <Button variant="outline" className="border-slate-600 text-slate-300">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/90 border-blue-600/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAnalyzing && (
                <div className="space-y-4">
                  <div className="text-blue-300">Processing COBOL code...</div>
                  <Progress value={33} className="bg-slate-700" />
                  <div className="text-sm text-slate-400">
                    AI is analyzing structure, dependencies, and generating documentation...
                  </div>
                </div>
              )}

              {result && !isAnalyzing && (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                    <TabsTrigger value="docs">Documentation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 p-3 rounded">
                        <div className="text-sm text-slate-400">Program ID</div>
                        <div className="text-white font-mono">{result.programId}</div>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded">
                        <div className="text-sm text-slate-400">Lines of Code</div>
                        <div className="text-white">{result.metrics.linesOfCode}</div>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded">
                        <div className="text-sm text-slate-400">Complexity</div>
                        <div className="text-white">{result.metrics.complexity}/10</div>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded">
                        <div className="text-sm text-slate-400">Maintainability</div>
                        <div className="text-white">{result.metrics.maintainabilityIndex}/100</div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="dependencies" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-slate-400 mb-2">Program Calls</div>
                        <div className="flex flex-wrap gap-2">
                          {result.dependencies.calls.length > 0 ? (
                            result.dependencies.calls.map((call, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-blue-900/50 text-blue-200">
                                <GitBranch className="h-3 w-3 mr-1" />
                                {call}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-500">No external calls found</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-2">Copybooks</div>
                        <div className="flex flex-wrap gap-2">
                          {result.dependencies.copybooks.length > 0 ? (
                            result.dependencies.copybooks.map((copy, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-green-900/50 text-green-200">
                                <FileText className="h-3 w-3 mr-1" />
                                {copy}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-500">No copybooks found</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="docs" className="mt-4">
                    <div className="bg-slate-900/50 p-4 rounded max-h-[350px] overflow-y-auto">
                      <pre className="text-slate-300 text-sm whitespace-pre-wrap">
                        {documentation || "No documentation generated yet"}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-600/50 p-4 rounded">
                  <div className="text-red-400">Analysis Error</div>
                  <div className="text-red-300 text-sm">{error}</div>
                </div>
              )}

              {!result && !isAnalyzing && !error && (
                <div className="text-center py-12 text-slate-400">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Upload or paste COBOL code to begin AI analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {result && (
          <Card className="mt-6 bg-slate-800/90 border-blue-600/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{Object.values(result.divisions).flat().length}</div>
                  <div className="text-sm text-slate-400">Divisions Found</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{result.dependencies.calls.length + result.dependencies.copybooks.length}</div>
                  <div className="text-sm text-slate-400">Dependencies</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{result.metrics.complexity}</div>
                  <div className="text-sm text-slate-400">Complexity Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-400">{result.metrics.maintainabilityIndex}%</div>
                  <div className="text-sm text-slate-400">Maintainability</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <CobolNavigator />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
