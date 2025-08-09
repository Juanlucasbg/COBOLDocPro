import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  FileCode, 
  GitBranch, 
  AlertTriangle, 
  Clock, 
  User,
  ExternalLink,
  Download,
  BookOpen,
  Activity
} from "lucide-react";
import type { CobolProgram, Dependency } from "@shared/schema";

interface Node {
  id: string;
  name: string;
  type: 'main' | 'subroutine' | 'copybook' | 'jcl';
  program?: CobolProgram;
}

interface NodeDetailsProps {
  node: Node;
  dependencies: Dependency[];
  onClose: () => void;
}

export default function NodeDetails({ node, dependencies, onClose }: NodeDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: program } = useQuery({
    queryKey: ['/api/programs', node.program?.id],
    enabled: !!node.program?.id,
  });

  const { data: programDocs } = useQuery({
    queryKey: ['/api/documentation', node.program?.id],
    enabled: !!node.program?.id,
  });

  const { data: programAnnotations } = useQuery({
    queryKey: ['/api/annotations', node.program?.id],
    enabled: !!node.program?.id,
  });

  // Filter dependencies related to this node
  const incomingDeps = dependencies.filter(dep => dep.toProgramId === node.program?.id);
  const outgoingDeps = dependencies.filter(dep => dep.fromProgramId === node.program?.id);
  const criticalDeps = [...incomingDeps, ...outgoingDeps].filter(dep => dep.isCritical);
  const circularDeps = [...incomingDeps, ...outgoingDeps].filter(dep => dep.isCircular);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'main': return 'bg-blue-600';
      case 'subroutine': return 'bg-teal-600';
      case 'copybook': return 'bg-purple-600';
      case 'jcl': return 'bg-yellow-600';
      default: return 'bg-slate-600';
    }
  };

  const getComplexityLevel = (complexity: number) => {
    if (complexity < 10) return { level: 'Low', color: 'text-green-400', progress: 25 };
    if (complexity < 30) return { level: 'Medium', color: 'text-yellow-400', progress: 50 };
    if (complexity < 50) return { level: 'High', color: 'text-orange-400', progress: 75 };
    return { level: 'Very High', color: 'text-red-400', progress: 100 };
  };

  const complexityInfo = program ? getComplexityLevel(program.complexity || 0) : null;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileCode className="w-6 h-6 text-blue-400" />
            <div>
              <CardTitle className="text-slate-100">{node.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={`${getTypeColor(node.type)} text-white`}>
                  {node.type.toUpperCase()}
                </Badge>
                {program?.isActive && (
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    Active
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="documentation">Docs</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-64">
            <TabsContent value="overview" className="p-4 space-y-4">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Program ID:</span>
                    <span className="text-slate-200 font-mono">{node.program?.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Filename:</span>
                    <span className="text-slate-200">{node.program?.filename || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lines of Code:</span>
                    <span className="text-slate-200">{node.program?.linesOfCode || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-200">
                      {node.program?.createdAt ? new Date(node.program.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Modified:</span>
                    <span className="text-slate-200">
                      {node.program?.updatedAt ? new Date(node.program.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Complexity Analysis */}
              {complexityInfo && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Complexity Analysis</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Complexity Level</span>
                        <span className={`font-medium ${complexityInfo.color}`}>
                          {complexityInfo.level}
                        </span>
                      </div>
                      <Progress value={complexityInfo.progress} className="h-2" />
                    </div>
                    <div className="text-xs text-slate-400">
                      Complexity Score: {program?.complexity || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Quick Stats</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-400">{incomingDeps.length}</div>
                    <div className="text-xs text-slate-400">Incoming</div>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-teal-400">{outgoingDeps.length}</div>
                    <div className="text-xs text-slate-400">Outgoing</div>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-400">{criticalDeps.length}</div>
                    <div className="text-xs text-slate-400">Critical</div>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-yellow-400">{circularDeps.length}</div>
                    <div className="text-xs text-slate-400">Circular</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dependencies" className="p-4 space-y-4">
              {/* Incoming Dependencies */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Incoming Dependencies ({incomingDeps.length})
                </h4>
                {incomingDeps.length === 0 ? (
                  <p className="text-sm text-slate-400">No incoming dependencies</p>
                ) : (
                  <div className="space-y-2">
                    {incomingDeps.map((dep) => (
                      <div key={dep.id} className="bg-slate-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-200">
                            Program {dep.fromProgramId}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                dep.dependencyType === 'call' ? 'text-blue-300' :
                                dep.dependencyType === 'copy' ? 'text-purple-300' :
                                'text-teal-300'
                              }`}
                            >
                              {dep.dependencyType.toUpperCase()}
                            </Badge>
                            {dep.isCritical && (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                        </div>
                        {dep.lineNumber && (
                          <p className="text-xs text-slate-400">Line {dep.lineNumber}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing Dependencies */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
                  <GitBranch className="w-4 h-4 mr-2 rotate-180" />
                  Outgoing Dependencies ({outgoingDeps.length})
                </h4>
                {outgoingDeps.length === 0 ? (
                  <p className="text-sm text-slate-400">No outgoing dependencies</p>
                ) : (
                  <div className="space-y-2">
                    {outgoingDeps.map((dep) => (
                      <div key={dep.id} className="bg-slate-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-200">
                            Program {dep.toProgramId}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                dep.dependencyType === 'call' ? 'text-blue-300' :
                                dep.dependencyType === 'copy' ? 'text-purple-300' :
                                'text-teal-300'
                              }`}
                            >
                              {dep.dependencyType.toUpperCase()}
                            </Badge>
                            {dep.isCritical && (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                        </div>
                        {dep.lineNumber && (
                          <p className="text-xs text-slate-400">Line {dep.lineNumber}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documentation" className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-300">Documentation</h4>
                <Button size="sm" variant="outline" className="border-slate-600">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Add Doc
                </Button>
              </div>
              
              {programDocs?.length === 0 ? (
                <div className="text-center py-6">
                  <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No documentation available</p>
                  <p className="text-xs text-slate-500 mt-1">Add documentation to help others understand this program</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {programDocs?.map((doc: any) => (
                    <div key={doc.id} className="bg-slate-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-slate-200">{doc.title}</h5>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            doc.type === 'ai_generated' ? 'text-blue-300' :
                            doc.type === 'manual' ? 'text-green-300' :
                            'text-purple-300'
                          }`}
                        >
                          {doc.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        {doc.content.length > 100 ? `${doc.content.substring(0, 100)}...` : doc.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </span>
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200 p-1">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Impact Analysis
                </h4>
                <div className="space-y-3">
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">Dependency Risk</span>
                      <span className={`text-sm font-medium ${
                        criticalDeps.length > 3 ? 'text-red-400' :
                        criticalDeps.length > 1 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {criticalDeps.length > 3 ? 'High' :
                         criticalDeps.length > 1 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Based on critical dependencies and circular references
                    </p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">Maintenance Priority</span>
                      <span className={`text-sm font-medium ${
                        (program?.complexity || 0) > 30 ? 'text-red-400' :
                        (program?.complexity || 0) > 15 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {(program?.complexity || 0) > 30 ? 'High' :
                         (program?.complexity || 0) > 15 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Based on code complexity and dependency count
                    </p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">Documentation Coverage</span>
                      <span className={`text-sm font-medium ${
                        (programDocs?.length || 0) > 2 ? 'text-green-400' :
                        (programDocs?.length || 0) > 0 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {(programDocs?.length || 0) > 2 ? 'Good' :
                         (programDocs?.length || 0) > 0 ? 'Partial' : 'Poor'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Number and quality of available documentation
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            <FileCode className="w-4 h-4 mr-2" />
            View Source Code
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="border-slate-600">
              <BookOpen className="w-3 h-3 mr-1" />
              Add to Learning
            </Button>
            <Button variant="outline" size="sm" className="border-slate-600">
              <Download className="w-3 h-3 mr-1" />
              Export Info
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
