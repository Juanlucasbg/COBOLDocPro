import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  Download, 
  Maximize, 
  ZoomIn, 
  ZoomOut,
  Filter,
  Eye,
  AlertTriangle
} from "lucide-react";
import DependencyGraph from "@/components/dependency/dependency-graph";
import NodeDetails from "@/components/dependency/node-details";
import { useDependencyGraph } from "@/hooks/use-dependency-graph";
import type { CobolProgram, Dependency } from "@shared/schema";

export default function DependencyGraphPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>();
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [dependencyFilter, setDependencyFilter] = useState<string>("all");

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: programs, isLoading: loadingPrograms } = useQuery({
    queryKey: ['/api/programs', selectedProjectId],
    enabled: !!selectedProjectId,
  });

  const { 
    data: dependencies, 
    isLoading: loadingDependencies,
    refetch: refetchDependencies 
  } = useQuery({
    queryKey: ['/api/dependencies', selectedProgramId],
    enabled: !!selectedProgramId,
  });

  const {
    graphData,
    selectedNode,
    setSelectedNode,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    layoutType,
    setLayoutType
  } = useDependencyGraph({
    programs: programs || [],
    dependencies: dependencies || [],
    showCriticalOnly,
    dependencyFilter
  });

  const handleRefresh = () => {
    refetchDependencies();
  };

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting dependency graph...');
  };

  // Calculate analysis summary
  const analysisData = {
    totalDependencies: dependencies?.length || 0,
    criticalDependencies: dependencies?.filter(d => d.isCritical)?.length || 0,
    circularDependencies: dependencies?.filter(d => d.isCircular)?.length || 0,
    coveragePercentage: programs?.length ? Math.round((dependencies?.length || 0) / (programs.length * 2) * 100) : 0
  };

  if (loadingProjects) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-96 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Dependency Analysis</h1>
        <p className="text-slate-400">Explore relationships between COBOL programs, copybooks, and JCL</p>
      </div>

      {/* Controls */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-300">Project:</label>
              <Select value={selectedProjectId?.toString()} onValueChange={(value) => setSelectedProjectId(parseInt(value))}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-300">Filter:</label>
              <Select value={dependencyFilter} onValueChange={setDependencyFilter}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dependencies</SelectItem>
                  <SelectItem value="call">CALL Statements</SelectItem>
                  <SelectItem value="copy">COPY Statements</SelectItem>
                  <SelectItem value="data_flow">Data Dependencies</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="critical-only" 
                checked={showCriticalOnly}
                onCheckedChange={setShowCriticalOnly}
              />
              <label htmlFor="critical-only" className="text-sm text-slate-300">
                Show Critical Paths Only
              </label>
            </div>

            <div className="ml-auto flex items-center space-x-2">
              <Button
                onClick={handleRefresh}
                size="sm"
                variant="outline"
                disabled={loadingDependencies}
                className="bg-slate-700 border-slate-600 hover:bg-slate-600"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingDependencies ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleExport}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Graph Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-100">Interactive Dependency Map</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={zoomOut}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-400 px-2">{Math.round(zoomLevel * 100)}%</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={zoomIn}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetZoom}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96 relative">
                <DependencyGraph
                  data={graphData}
                  selectedNode={selectedNode}
                  onNodeSelect={setSelectedNode}
                  zoomLevel={zoomLevel}
                  layoutType={layoutType}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Panel */}
        <div className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-slate-100">Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">Dependency Coverage</span>
                  <span className="text-slate-100">{analysisData.coveragePercentage}%</span>
                </div>
                <Progress value={analysisData.coveragePercentage} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">Critical Issues</span>
                  <span className="text-red-400">{analysisData.criticalDependencies}</span>
                </div>
                <Progress 
                  value={(analysisData.criticalDependencies / Math.max(analysisData.totalDependencies, 1)) * 100} 
                  className="h-2" 
                />
              </div>

              <div className="pt-4 space-y-2 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Total Programs</span>
                  <span className="text-slate-100">{programs?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Dependencies</span>
                  <span className="text-slate-100">{analysisData.totalDependencies}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Circular References</span>
                  <span className="text-red-400">{analysisData.circularDependencies}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Node Details */}
          {selectedNode && (
            <NodeDetails 
              node={selectedNode}
              dependencies={dependencies || []}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>
      </div>

      {/* Dependency Details Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="text-slate-100">Dependency Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {loadingDependencies ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-slate-400 mt-2">Loading dependencies...</p>
              </div>
            ) : dependencies?.length === 0 ? (
              <div className="text-center py-8">
                <Filter className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No dependencies found. Select a project to analyze dependencies.</p>
              </div>
            ) : (
              dependencies?.map((dependency: Dependency) => (
                <div key={dependency.id} className="p-4 bg-slate-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-100">
                      Program {dependency.fromProgramId} → Program {dependency.toProgramId}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={dependency.dependencyType === 'call' ? 'secondary' : 'outline'}
                        className={
                          dependency.dependencyType === 'call' ? 'bg-purple-600 text-white' :
                          dependency.dependencyType === 'copy' ? 'bg-teal-600 text-white' :
                          'bg-slate-600 text-slate-200'
                        }
                      >
                        {dependency.dependencyType.toUpperCase()}
                      </Badge>
                      {dependency.isCritical && (
                        <Badge className="bg-red-600 text-white">
                          CRITICAL
                        </Badge>
                      )}
                      {dependency.isCircular && (
                        <Badge className="bg-yellow-600 text-white">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          CIRCULAR
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">
                    {dependency.dependencyType === 'call' ? 'Control flow for program execution' :
                     dependency.dependencyType === 'copy' ? 'Data structure dependency' :
                     'Data flow dependency'}
                    {dependency.lineNumber && ` (Line ${dependency.lineNumber})`}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
