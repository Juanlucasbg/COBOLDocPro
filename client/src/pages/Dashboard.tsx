import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GitBranch, Clock, CheckCircle, XCircle, Loader2, Github, FileText, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Repository {
  id: number;
  name: string;
  url: string;
  status: 'CLONING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  analysisProgress?: number;
  createdAt: string;
  updatedAt: string;
  totalFiles?: number;
  documentedFiles?: number;
  lastAnalysis?: string;
}

interface AnalysisJob {
  id: string;
  repositoryType: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  progress?: number;
  message?: string;
  createdAt: string;
}

export default function Dashboard() {
  const [githubUrl, setGithubUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch repositories
  const { data: repositories = [], isLoading: repositoriesLoading } = useQuery<Repository[]>({
    queryKey: ['/api/repositories'],
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  });

  // Fetch analysis jobs
  const { data: analysisJobs = [] } = useQuery<AnalysisJob[]>({
    queryKey: ['/api/analysis-jobs'],
    refetchInterval: 2000, // Poll every 2 seconds during analysis
  });

  // Start repository analysis mutation
  const analyzeRepositoryMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }
      return response.json();
    },
    onSuccess: () => {
      setGithubUrl("");
      setIsAnalyzing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/repositories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analysis-jobs'] });
    },
    onError: () => {
      setIsAnalyzing(false);
    },
  });

  const handleStartAnalysis = () => {
    if (!githubUrl.trim()) return;
    
    setIsAnalyzing(true);
    analyzeRepositoryMutation.mutate({ url: githubUrl.trim() });
  };

  const getStatusIcon = (status: Repository['status']) => {
    switch (status) {
      case 'CLONING':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'ANALYZING':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Repository['status']) => {
    switch (status) {
      case 'CLONING':
        return 'bg-blue-500';
      case 'ANALYZING':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'ERROR':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const runningJobs = analysisJobs.filter(job => job.status === 'RUNNING');
  const completedRepositories = repositories.filter(repo => repo.status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">COBOL ClarityEngine</h1>
          <p className="text-gray-400 mt-1">
            Enterprise COBOL documentation and analysis platform
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Repository Input Section */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Github className="h-5 w-5" />
              Analyze New Repository
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter a GitHub repository URL to start COBOL documentation analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="https://github.com/username/cobol-repository"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="bg-black border-gray-700 text-white placeholder:text-gray-500 flex-1"
                disabled={isAnalyzing}
                data-testid="input-github-url"
              />
              <Button
                onClick={handleStartAnalysis}
                disabled={!githubUrl.trim() || isAnalyzing}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                data-testid="button-start-analysis"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing
                  </>
                ) : (
                  "Start Analysis"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Running Jobs */}
        {runningJobs.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Active Analysis Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {runningJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-black rounded-lg border border-gray-800">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                      <div>
                        <p className="text-white font-medium">{job.repositoryType} Analysis</p>
                        <p className="text-gray-400 text-sm">{job.message || 'Processing repository...'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                      Running
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past Projects */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Past Projects ({completedRepositories.length})
            </CardTitle>
            <CardDescription className="text-gray-400">
              Previously analyzed COBOL repositories and their documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {repositoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Loading repositories...</span>
              </div>
            ) : repositories.length === 0 ? (
              <div className="text-center py-12">
                <Github className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No repositories analyzed yet</h3>
                <p className="text-gray-500">Start by entering a GitHub repository URL above</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {repositories.map((repo) => (
                  <Card key={repo.id} className="bg-black border-gray-800 hover:border-gray-700 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-base truncate" title={repo.name}>
                          {repo.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(repo.status)}
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(repo.status)} text-white border-0 text-xs`}
                          >
                            {repo.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="text-xs text-gray-400 truncate" title={repo.url}>
                          <GitBranch className="h-3 w-3 inline mr-1" />
                          {repo.url.replace('https://github.com/', '')}
                        </div>
                        
                        {repo.status === 'COMPLETED' && repo.totalFiles && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Files:</span>
                            <span className="text-white">
                              {repo.documentedFiles || 0} / {repo.totalFiles}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Analyzed:</span>
                          <span>{formatDate(repo.updatedAt)}</span>
                        </div>
                        
                        {repo.status === 'COMPLETED' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                            data-testid={`button-view-docs-${repo.id}`}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Documentation
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}