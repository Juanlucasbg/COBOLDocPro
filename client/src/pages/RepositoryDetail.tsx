import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  FileText, 
  GitBranch, 
  Activity,
  Code,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  BarChart,
  FileCode
} from "lucide-react";

export default function RepositoryDetail() {
  const params = useParams();
  const repositoryId = params.id;

  // Fetch repository details
  const { data: repository, isLoading: repoLoading } = useQuery({
    queryKey: [`/api/repositories/${repositoryId}`],
    enabled: !!repositoryId,
  });

  // Fetch analysis results
  const { data: analysisResults, isLoading: analysisLoading } = useQuery({
    queryKey: [`/api/repositories/${repositoryId}/analysis-results`],
    enabled: !!repositoryId,
    refetchInterval: repository?.syncStatus === 'ANALYZING' ? 5000 : false,
  });

  // Fetch workflow status
  const { data: workflowStatus } = useQuery({
    queryKey: [`/api/repositories/${repositoryId}/workflow-status`],
    enabled: !!repositoryId && repository?.syncStatus === 'ANALYZING',
    refetchInterval: 5000,
  });

  if (repoLoading || analysisLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading repository details...</p>
        </div>
      </div>
    );
  }

  if (!repository || !analysisResults) {
    return (
      <div className="text-center py-20">
        <p className="text-white">Repository not found</p>
        <Link href="/">
          <Button className="mt-4">Return to Overview</Button>
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'ANALYZING': return 'bg-yellow-500';
      case 'FAILED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4 text-white hover:text-green-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview
          </Button>
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {repository.name}
            </h1>
            <p className="text-gray-400">
              {repository.owner} • {repository.branch || 'main'}
            </p>
          </div>
          <Badge className={`${getStatusColor(repository.syncStatus)} text-white`}>
            {repository.syncStatus}
          </Badge>
        </div>
      </div>

      {/* Progress Bar for Analyzing State */}
      {repository.syncStatus === 'ANALYZING' && workflowStatus && (
        <Card className="mb-6 bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Analysis Progress</CardTitle>
            <CardDescription className="text-gray-400">
              {workflowStatus.progress.currentStep}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress 
              value={workflowStatus.progress.percentage} 
              className="mb-2"
            />
            <p className="text-sm text-gray-400">
              {workflowStatus.progress.percentage}% Complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Total Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {analysisResults.summary.totalPrograms || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Lines of Code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {analysisResults.summary.totalLinesOfCode.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Avg Complexity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {analysisResults.qualityMetrics?.averageComplexity || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">AI Documented</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {analysisResults.qualityMetrics?.programsWithAI || 0}/{analysisResults.summary.totalPrograms || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="programs" className="space-y-4">
        <TabsList className="bg-gray-900">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="complexity">Complexity Analysis</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">COBOL Programs</CardTitle>
              <CardDescription className="text-gray-400">
                Click on a program to view detailed documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysisResults.programs && analysisResults.programs.length > 0 ? (
                  analysisResults.programs.map((program: any) => (
                    <Link key={program.id} href={`/program/${program.id}`}>
                      <div className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <FileCode className="w-5 h-5 text-green-500" />
                            <div>
                              <h3 className="font-semibold text-white">{program.name}</h3>
                              <p className="text-sm text-gray-400">
                                {program.filename} • {program.linesOfCode} LOC
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {program.aiSummary && (
                              <Badge className="bg-green-500/20 text-green-400">
                                AI Documented
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-gray-400">
                              Complexity: {program.complexity || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <FileCode className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No COBOL Programs Found</h3>
                    <div className="text-gray-400 space-y-2">
                      {repository.syncStatus === 'ANALYZING' ? (
                        <>
                          <p>Analysis is still in progress...</p>
                          <p className="text-sm">This repository is being processed. Programs will appear here once analysis completes.</p>
                        </>
                      ) : repository.syncStatus === 'COMPLETED' ? (
                        <>
                          <p>This repository contains no COBOL programs to analyze.</p>
                          <p className="text-sm">Only repositories with .cbl, .cob, or .cobol files can be processed.</p>
                        </>
                      ) : (
                        <>
                          <p>Repository analysis failed or is pending.</p>
                          <p className="text-sm">Try re-adding this repository to restart the analysis process.</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complexity Analysis Tab */}
        <TabsContent value="complexity" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Complexity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">
                    {analysisResults.qualityMetrics?.complexityDistribution?.low || 0}
                  </p>
                  <p className="text-sm text-gray-400">Low Complexity</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-500">
                    {analysisResults.qualityMetrics?.complexityDistribution?.medium || 0}
                  </p>
                  <p className="text-sm text-gray-400">Medium Complexity</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-500">
                    {analysisResults.qualityMetrics?.complexityDistribution?.high || 0}
                  </p>
                  <p className="text-sm text-gray-400">High Complexity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="documentation" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Documentation Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">AI Documentation</span>
                    <span className="text-sm text-white">
                      {analysisResults.summary.totalPrograms > 0 ? 
                        Math.round(((analysisResults.qualityMetrics?.programsWithAI || 0) / analysisResults.summary.totalPrograms) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={analysisResults.summary.totalPrograms > 0 ? 
                      ((analysisResults.qualityMetrics?.programsWithAI || 0) / analysisResults.summary.totalPrograms) * 100 : 0}
                    className="bg-gray-800"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">Manual Documentation</span>
                    <span className="text-sm text-white">
                      {analysisResults.summary.totalPrograms > 0 ? 
                        Math.round(((analysisResults.qualityMetrics?.programsWithDocumentation || 0) / analysisResults.summary.totalPrograms) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={analysisResults.summary.totalPrograms > 0 ? 
                      ((analysisResults.qualityMetrics?.programsWithDocumentation || 0) / analysisResults.summary.totalPrograms) * 100 : 0}
                    className="bg-gray-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}