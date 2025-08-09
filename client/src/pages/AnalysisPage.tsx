import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target,
  TrendingUp,
  Users,
  FileText,
  GitBranch,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface AnalysisResult {
  programId: number;
  analysisTypes: string[];
  results: {
    parsing?: any;
    qualityIssuesCount?: number;
    metricsCalculated?: boolean;
    businessRulesExtracted?: number;
    impactAnalysisComplete?: boolean;
    cfgGenerated?: boolean;
    dependenciesFound?: number;
    transformationScore?: number;
  };
  summary: string;
  recommendations: string[];
  executionTime: number;
}

interface QualityIssue {
  id: number;
  rule: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: 'bug' | 'vulnerability' | 'smell' | 'performance';
  message: string;
  location: any;
  suggestion?: string;
  status: 'open' | 'fixed' | 'suppressed' | 'false-positive';
}

interface CodeMetrics {
  id: number;
  programId: number;
  linesOfCode: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  depthOfNesting: number;
  numberOfParagraphs: number;
  numberOfSections: number;
  halsteadMetrics: any;
  maintainabilityIndex?: number;
  technicalDebt?: number;
}

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const programId = parseInt(id!);
  const queryClient = useQueryClient();
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>([
    'parsing', 'quality', 'metrics', 'business-rules'
  ]);

  // Fetch program details
  const { data: program } = useQuery({
    queryKey: ['/api/programs', programId],
    enabled: !!programId
  });

  // Fetch analysis results
  const { data: qualityIssues, isLoading: qualityLoading } = useQuery({
    queryKey: ['/api/programs', programId, 'quality-issues'],
    enabled: !!programId
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/programs', programId, 'metrics'],
    enabled: !!programId
  });

  const { data: recommendations } = useQuery({
    queryKey: ['/api/programs', programId, 'recommendations'],
    enabled: !!programId
  });

  const { data: transformationReadiness } = useQuery({
    queryKey: ['/api/programs', programId, 'transformation-readiness'],
    enabled: !!programId
  });

  // Run analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async (analysisTypes: string[]) => {
      return await apiRequest(`/api/programs/${programId}/analyze`, {
        method: 'POST',
        body: { analysisTypes }
      });
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/programs', programId] });
    }
  });

  const runAnalysis = () => {
    analysisMutation.mutate(selectedAnalysisTypes);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'major': return 'bg-orange-500';
      case 'minor': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplexityLevel = (complexity: number) => {
    if (complexity <= 10) return { level: 'Low', color: 'text-green-600' };
    if (complexity <= 20) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'High', color: 'text-red-600' };
  };

  const getMaintainabilityLevel = (index?: number) => {
    if (!index) return { level: 'Unknown', color: 'text-gray-600' };
    if (index >= 80) return { level: 'High', color: 'text-green-600' };
    if (index >= 60) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'Low', color: 'text-red-600' };
  };

  const analysisOptions = [
    { id: 'parsing', label: 'Code Parsing', description: 'Parse COBOL structure and AST' },
    { id: 'quality', label: 'Quality Analysis', description: 'Detect bugs, vulnerabilities, code smells' },
    { id: 'metrics', label: 'Code Metrics', description: 'Calculate complexity and maintainability' },
    { id: 'business-rules', label: 'Business Rules', description: 'Extract business logic patterns' },
    { id: 'impact-analysis', label: 'Impact Analysis', description: 'Analyze change dependencies' },
    { id: 'cfg', label: 'Control Flow', description: 'Generate control flow graphs' },
    { id: 'dependencies', label: 'Dependencies', description: 'Map program relationships' },
    { id: 'transformation-readiness', label: 'Transformation', description: 'Assess modernization readiness' }
  ];

  if (!program) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Loading program...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{program.name} - Analysis</h1>
          <p className="text-muted-foreground">
            Comprehensive COBOL program analysis and insights
          </p>
        </div>
        <Link href={`/programs/${programId}`}>
          <Button variant="outline" data-testid="back-to-program">
            ← Back to Program
          </Button>
        </Link>
      </div>

      {/* Analysis Controls */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Run Analysis
          </CardTitle>
          <CardDescription>
            Select analysis types to run on this COBOL program
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analysisOptions.map((option) => (
              <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAnalysisTypes.includes(option.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAnalysisTypes([...selectedAnalysisTypes, option.id]);
                    } else {
                      setSelectedAnalysisTypes(selectedAnalysisTypes.filter(t => t !== option.id));
                    }
                  }}
                  className="rounded border-gray-600"
                  data-testid={`checkbox-${option.id}`}
                />
                <div>
                  <div className="text-sm font-medium text-foreground">{option.label}</div>
                  <div className="text-xs text-gray-400">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={runAnalysis}
              disabled={analysisMutation.isPending || selectedAnalysisTypes.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-run-analysis"
            >
              <Play className="h-4 w-4 mr-2" />
              {analysisMutation.isPending ? 'Running Analysis...' : 'Run Analysis'}
            </Button>
            
            {analysisMutation.data && (
              <div className="text-sm text-primary">
                Analysis completed in {analysisMutation.data.executionTime}ms
              </div>
            )}
          </div>

          {analysisMutation.isError && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Analysis failed: {(analysisMutation.error as Error)?.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="business-rules">Business Rules</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="transformation">Transformation</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">Quality Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {qualityIssues?.length ? (
                    `${Math.max(0, 100 - qualityIssues.length * 5)}%`
                  ) : (
                    'N/A'
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {qualityIssues?.length || 0} issues found
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Complexity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metrics?.cyclomaticComplexity || 'N/A'}
                </div>
                <p className={`text-xs ${getComplexityLevel(metrics?.cyclomaticComplexity || 0).color}`}>
                  {getComplexityLevel(metrics?.cyclomaticComplexity || 0).level}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Maintainability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metrics?.maintainabilityIndex || 'N/A'}
                </div>
                <p className={`text-xs ${getMaintainabilityLevel(metrics?.maintainabilityIndex).color}`}>
                  {getMaintainabilityLevel(metrics?.maintainabilityIndex).level}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Summary */}
          {analysisMutation.data && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">{analysisMutation.data.summary}</p>
                
                {analysisMutation.data.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-white mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysisMutation.data.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-300">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Recommendations */}
          {recommendations?.recommendations && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendations.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-4">
          {qualityLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Clock className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                <p className="mt-2 text-sm text-gray-400">Loading quality issues...</p>
              </div>
            </div>
          ) : qualityIssues?.length > 0 ? (
            <div className="space-y-3">
              {qualityIssues.map((issue: QualityIssue) => (
                <Card key={issue.id} className="glass-card">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getSeverityColor(issue.severity)} text-white`}>
                            {issue.severity}
                          </Badge>
                          <Badge variant="outline">{issue.category}</Badge>
                          <Badge variant="outline">{issue.rule}</Badge>
                        </div>
                        <p className="text-white font-medium">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="text-sm text-gray-400 mt-2">
                            💡 {issue.suggestion}
                          </p>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Line {issue.location?.line}
                          {issue.location?.paragraph && ` in ${issue.location.paragraph}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={issue.status === 'open' ? 'destructive' : 'secondary'}
                          data-testid={`status-${issue.id}`}
                        >
                          {issue.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-2 text-sm font-medium text-white">No Quality Issues Found</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    This program has no detected quality issues.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {metricsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Clock className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                <p className="mt-2 text-sm text-gray-400">Loading metrics...</p>
              </div>
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Code Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Lines of Code</div>
                      <div className="text-xl font-bold text-white">{metrics.linesOfCode}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Paragraphs</div>
                      <div className="text-xl font-bold text-white">{metrics.numberOfParagraphs}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Sections</div>
                      <div className="text-xl font-bold text-white">{metrics.numberOfSections}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Nesting Depth</div>
                      <div className="text-xl font-bold text-white">{metrics.depthOfNesting}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white">Complexity Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">Cyclomatic Complexity</span>
                      <span className="text-white font-bold">{metrics.cyclomaticComplexity}</span>
                    </div>
                    <Progress 
                      value={Math.min(100, (metrics.cyclomaticComplexity / 30) * 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">Cognitive Complexity</span>
                      <span className="text-white font-bold">{metrics.cognitiveComplexity}</span>
                    </div>
                    <Progress 
                      value={Math.min(100, (metrics.cognitiveComplexity / 30) * 100)} 
                      className="h-2"
                    />
                  </div>

                  {metrics.maintainabilityIndex && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Maintainability Index</span>
                        <span className="text-white font-bold">{metrics.maintainabilityIndex}</span>
                      </div>
                      <Progress 
                        value={metrics.maintainabilityIndex} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {metrics.technicalDebt && (
                    <div>
                      <div className="text-sm text-gray-400">Technical Debt</div>
                      <div className="text-white font-bold">{metrics.technicalDebt} minutes</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-white">No Metrics Available</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Run metrics analysis to see code complexity and quality metrics.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Other tabs would be implemented similarly */}
        <TabsContent value="business-rules">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-white">Business Rules Analysis</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Business rules extraction and validation features coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <GitBranch className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-white">Dependency Analysis</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Program dependency mapping and impact analysis features coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transformation">
          {transformationReadiness ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Transformation Readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Readiness Score</span>
                  <span className="text-2xl font-bold text-white">{transformationReadiness.readinessScore}%</span>
                </div>
                <Progress value={transformationReadiness.readinessScore} className="h-3" />
                
                {transformationReadiness.blockers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-white mb-2">Blockers:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {transformationReadiness.blockers.map((blocker: string, idx: number) => (
                        <li key={idx} className="text-sm text-red-400">{blocker}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {transformationReadiness.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-white mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {transformationReadiness.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-300">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-sm text-gray-400">
                  Estimated effort: {transformationReadiness.estimatedEffort} days
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-white">No Transformation Assessment</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Run transformation readiness analysis to assess modernization potential.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}