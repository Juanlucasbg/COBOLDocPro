import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Github, ExternalLink, Clock, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

interface Repository {
  id: number;
  name: string;
  url: string;
  status: 'CLONING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  lastUpdated: string;
  domain?: string;
  description?: string;
  branch?: string;
  totalFiles?: number;
  documentedFiles?: number;
}

export default function Overview() {
  const [githubUrl, setGithubUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch repositories
  const { data: repositories = [], isLoading } = useQuery<Repository[]>({
    queryKey: ['/api/repositories'],
    refetchInterval: 5000,
  });

  // Generate documentation mutation
  const generateMutation = useMutation({
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
    onSuccess: (data) => {
      setGithubUrl("");
      setIsGenerating(false);
      queryClient.invalidateQueries({ queryKey: ['/api/repositories'] });
      toast({
        title: "Repository Added",
        description: `Started analyzing ${data.name}. Check the progress below.`,
      });
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        variant: "destructive",
        title: "Failed to Add Repository",
        description: error?.message || "Please check the GitHub URL and try again.",
      });
    },
  });

  const handleGenerate = () => {
    if (!githubUrl.trim()) return;
    setIsGenerating(true);
    generateMutation.mutate({ url: githubUrl.trim() });
  };

  const getStatusIcon = (status: Repository['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: Repository['status']) => {
    const styles = {
      'COMPLETED': 'bg-green-600 text-white',
      'ANALYZING': 'bg-yellow-600 text-white',
      'CLONING': 'bg-blue-600 text-white',
      'ERROR': 'bg-red-600 text-white'
    };
    return styles[status] || 'bg-gray-600 text-white';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 bg-black text-white overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Add New Codebase Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6">Add New Codebase</h1>
          <div className="flex gap-4 max-w-2xl">
            <Input
              placeholder="https://github.com/walmartlabs/zECS"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="flex-1 bg-gray-900 border-gray-700 text-white placeholder:text-gray-400"
              disabled={isGenerating}
              data-testid="input-repository-url"
            />
            <Button
              onClick={handleGenerate}
              disabled={!githubUrl.trim() || isGenerating}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
              data-testid="button-generate"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>

        {/* Your Codebases Section */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Your Codebases</h2>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-400">Loading codebases...</div>
            </div>
          ) : repositories.length === 0 ? (
            <div className="text-center py-12">
              <Github className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No codebases yet</h3>
              <p className="text-gray-500">Add your first GitHub repository above to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repositories.map((repo) => (
                <Card key={repo.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-base font-medium truncate mb-1">
                          {repo.name}
                        </CardTitle>
                        <p className="text-sm text-gray-400 mb-2">
                          Last updated: {formatDate(repo.lastUpdated)}
                        </p>
                      </div>
                      <Badge 
                        className={`ml-2 text-xs ${getStatusBadge(repo.status)}`}
                        data-testid={`status-${repo.id}`}
                      >
                        {repo.status === 'COMPLETED' ? 'Live' : repo.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Visual representation area */}
                    <div className="w-full h-24 bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-gray-600" />
                    </div>
                    
                    {/* Domain info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Domain</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-xs text-white">{repo.domain || 'zecs.tribal.app'}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        {repo.description || 'Enterprise Cobol Caching Service'}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Branch: {repo.branch || 'main'}
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(repo.status)}
                        <span className="text-xs text-gray-400">
                          {repo.status === 'COMPLETED' ? 'Live' : repo.status}
                        </span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 text-xs"
                        disabled={repo.status !== 'COMPLETED'}
                        data-testid={`visit-docs-${repo.id}`}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Visit Docs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}