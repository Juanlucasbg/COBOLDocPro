import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileCode, 
  Folder, 
  Database, 
  Copy, 
  ExternalLink, 
  BookOpen,
  Search,
  Settings,
  Maximize2
} from "lucide-react";
import CobolEditor from "@/components/code/cobol-editor";
import { useCobolAnalysis } from "@/hooks/use-cobol-analysis";
import type { CobolProgram, Dependency, Annotation } from "@shared/schema";

interface FileNode {
  id: number;
  name: string;
  type: 'folder' | 'cobol' | 'copybook' | 'jcl';
  children?: FileNode[];
  program?: CobolProgram;
}

export default function CodeEditorPage() {
  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState("files");

  const { data: programs, isLoading: loadingPrograms } = useQuery({
    queryKey: ['/api/programs'],
  });

  const { data: selectedProgram } = useQuery({
    queryKey: ['/api/programs', selectedProgramId],
    enabled: !!selectedProgramId,
  });

  const { data: dependencies } = useQuery({
    queryKey: ['/api/dependencies', selectedProgramId],
    enabled: !!selectedProgramId,
  });

  const { data: annotations } = useQuery({
    queryKey: ['/api/annotations', selectedProgramId],
    enabled: !!selectedProgramId,
  });

  const {
    parsedCode,
    crossReferences,
    syntaxErrors,
    isAnalyzing
  } = useCobolAnalysis(selectedProgram);

  // Transform programs into file tree structure
  const fileTree: FileNode[] = programs ? programs.reduce((acc: FileNode[], program: CobolProgram) => {
    const folderName = program.programType === 'copybook' ? 'copybooks' : 
                     program.programType === 'jcl' ? 'jcl' : 'src';
    
    let folder = acc.find(f => f.name === folderName);
    if (!folder) {
      folder = {
        id: Date.now() + Math.random(),
        name: folderName,
        type: 'folder',
        children: []
      };
      acc.push(folder);
    }

    folder.children!.push({
      id: program.id,
      name: program.filename,
      type: program.programType as any,
      program
    });

    return acc;
  }, []) : [];

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <div 
          className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-slate-700 transition-colors ${
            selectedProgramId === node.id ? 'bg-blue-900' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => node.program && setSelectedProgramId(node.program.id)}
        >
          {node.type === 'folder' && <Folder className="w-4 h-4 text-blue-400" />}
          {node.type === 'cobol' && <FileCode className="w-4 h-4 text-green-400" />}
          {node.type === 'copybook' && <Copy className="w-4 h-4 text-purple-400" />}
          {node.type === 'jcl' && <Database className="w-4 h-4 text-yellow-400" />}
          
          <span className={`text-sm ${selectedProgramId === node.id ? 'text-white' : 'text-slate-300'}`}>
            {node.name}
          </span>
          
          {node.program && (
            <div className="ml-auto flex items-center space-x-1">
              <div 
                className={`w-2 h-2 rounded-full ${
                  node.program.isActive ? 'bg-green-400' : 'bg-red-400'
                }`} 
                title={node.program.isActive ? 'Active' : 'Inactive'}
              />
              <span className="text-xs text-slate-400">
                {node.program.linesOfCode > 0 ? `${node.program.linesOfCode}L` : ''}
              </span>
            </div>
          )}
        </div>
        
        {node.children && renderFileTree(node.children, depth + 1)}
      </div>
    ));
  };

  if (loadingPrograms) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-6 h-96">
            <div className="bg-slate-800 rounded-xl"></div>
            <div className="col-span-2 bg-slate-800 rounded-xl"></div>
            <div className="bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Enhanced Code Editor</h1>
        <p className="text-slate-400">Advanced COBOL editor with dependency highlighting and cross-references</p>
      </div>

      {/* Editor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
        
        {/* File Explorer */}
        <Card className="bg-slate-800 border-slate-700 flex flex-col">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-slate-100 text-lg">Project Files</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {fileTree.length > 0 ? renderFileTree(fileTree) : (
                  <div className="text-center py-8">
                    <FileCode className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No COBOL files found</p>
                    <p className="text-sm text-slate-500 mt-1">Upload files to get started</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Editor */}
        <Card className="lg:col-span-2 bg-slate-800 border-slate-700 flex flex-col">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {selectedProgram ? (
                  <div className="flex items-center space-x-2">
                    <FileCode className="w-5 h-5 text-blue-400" />
                    <span className="text-slate-100 font-medium">{selectedProgram.filename}</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedProgram.programType.toUpperCase()}
                    </Badge>
                    {isAnalyzing && (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">No file selected</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {selectedProgram && (
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Dependencies'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-slate-400">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 flex-1">
            {selectedProgram ? (
              <CobolEditor
                program={selectedProgram}
                dependencies={dependencies || []}
                annotations={annotations || []}
                crossReferences={crossReferences}
                syntaxErrors={syntaxErrors}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-slate-900">
                <div className="text-center">
                  <FileCode className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg font-medium">Select a file to start editing</p>
                  <p className="text-slate-500 text-sm mt-2">Choose a COBOL program from the file explorer</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Panel */}
        <Card className="bg-slate-800 border-slate-700 flex flex-col">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-slate-100 text-lg">Analysis</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                <TabsTrigger value="references" className="text-xs">References</TabsTrigger>
                <TabsTrigger value="variables" className="text-xs">Variables</TabsTrigger>
                <TabsTrigger value="annotations" className="text-xs">Notes</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent value="references" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Dependencies Found</h4>
                        {dependencies?.length === 0 ? (
                          <p className="text-sm text-slate-400">No dependencies detected</p>
                        ) : (
                          <div className="space-y-2">
                            {dependencies?.map((dep: Dependency) => (
                              <div 
                                key={dep.id} 
                                className={`p-2 rounded border-l-4 cursor-pointer hover:bg-slate-700 transition-colors ${
                                  dep.dependencyType === 'copy' ? 'border-purple-500 bg-purple-900/20' :
                                  dep.dependencyType === 'call' ? 'border-blue-500 bg-blue-900/20' :
                                  'border-teal-500 bg-teal-900/20'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-200">
                                    Program {dep.toProgramId}
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      dep.dependencyType === 'copy' ? 'text-purple-300' :
                                      dep.dependencyType === 'call' ? 'text-blue-300' :
                                      'text-teal-300'
                                    }`}
                                  >
                                    {dep.dependencyType.toUpperCase()}
                                  </Badge>
                                </div>
                                {dep.lineNumber && (
                                  <p className="text-xs text-slate-400 mt-1">Line {dep.lineNumber}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="variables" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Variables</h4>
                        {crossReferences.length === 0 ? (
                          <p className="text-sm text-slate-400">No variables detected</p>
                        ) : (
                          <div className="space-y-1">
                            {crossReferences.map((ref, index) => (
                              <div key={index} className="flex items-center justify-between p-1 hover:bg-slate-700 rounded">
                                <span className="text-sm text-slate-300">{ref.name}</span>
                                <span className="text-xs text-slate-500">{ref.lines.join(', ')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="annotations" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Annotations</h4>
                        {annotations?.length === 0 ? (
                          <p className="text-sm text-slate-400">No annotations yet</p>
                        ) : (
                          <div className="space-y-2">
                            {annotations?.map((annotation: Annotation) => (
                              <div key={annotation.id} className="p-2 bg-slate-700 rounded">
                                <div className="flex items-center justify-between mb-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      annotation.type === 'bookmark' ? 'text-yellow-300' :
                                      annotation.type === 'warning' ? 'text-red-300' :
                                      'text-blue-300'
                                    }`}
                                  >
                                    {annotation.type}
                                  </Badge>
                                  <span className="text-xs text-slate-500">Line {annotation.lineNumber}</span>
                                </div>
                                <p className="text-sm text-slate-300">{annotation.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-700">
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Quick Actions</h4>
                        <div className="space-y-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full justify-start text-xs"
                            disabled={!selectedProgram}
                          >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            View Dependency Graph
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full justify-start text-xs"
                            disabled={!selectedProgram}
                          >
                            <BookOpen className="w-3 h-3 mr-2" />
                            Generate Documentation
                          </Button>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
