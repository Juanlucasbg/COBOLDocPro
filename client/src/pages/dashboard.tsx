import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  FileCode2, 
  Database, 
  GitBranch,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  Eye,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Statistics } from "@shared/schema";

export default function Dashboard() {
  const [repositoryUrl, setRepositoryUrl] = useState("");

  const { data: stats } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
    refetchInterval: 30000,
  });

  const { data: programs } = useQuery({
    queryKey: ["/api/programs"],
  });

  const { data: repositories } = useQuery({
    queryKey: ["/api/repositories"],
  });

  const { data: uploadSessions } = useQuery({
    queryKey: ["/api/upload-sessions"],
  });

  const recentPrograms = programs?.slice(0, 3) || [];
  const recentRepositories = repositories?.slice(0, 2) || [];

  const handleAddRepository = () => {
    if (repositoryUrl.trim()) {
      // Navigate to repositories page with the URL
      window.location.href = `/repositories?add=${encodeURIComponent(repositoryUrl)}`;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Add New Codebase</h1>
        <p className="text-muted-foreground">
          Connect your COBOL repositories or upload individual programs to begin documentation.
        </p>
      </div>

      {/* Add Repository Section */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Codebase Repository URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-3">
            <Input
              type="url"
              placeholder="https://github.com/your-org/cobol-project"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              className="flex-1 h-12"
              data-testid="repository-url-input"
            />
            <Button 
              onClick={handleAddRepository}
              disabled={!repositoryUrl.trim()}
              className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="generate-button"
            >
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Your Codebases Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Your Codebases</h2>
        
        {recentRepositories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentRepositories.map((repo: any) => (
              <Card key={repo.id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground">{repo.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Last updated: {repo.lastSyncedAt ? format(new Date(repo.lastSyncedAt), 'h:mm a') : 'Never'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        <Activity className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    </div>

                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <FileCode2 className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Domain</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {repo.description || "Enterprise COBOL Application"}
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
                          <span className="text-muted-foreground">
                            {repo.branch || 'main'} branch
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex space-x-4">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/repositories/${repo.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visit Docs
                          </Link>
                        </Button>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        <Activity className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Codebases Connected</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your first COBOL repository to start generating documentation.
                </p>
                <Link href="/repositories">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Repository
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity History Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Activity History</h2>
        <Card className="border border-border shadow-sm">
          <CardContent className="pt-6">
            {uploadSessions && uploadSessions.length > 0 ? (
              <div className="space-y-4">
                {uploadSessions.slice(0, 5).map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {session.fileName || 'Program Upload'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.createdAt ? format(new Date(session.createdAt), 'MMM d, yyyy h:mm a') : 'Unknown time'}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={
                        session.status === 'completed' 
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : session.status === 'processing'
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }
                    >
                      {session.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {session.status === 'processing' && <Clock className="w-3 h-3 mr-1" />}
                      {session.status === 'failed' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {session.status || 'Unknown'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Recent Activity</h3>
                <p className="text-muted-foreground">
                  Upload your first COBOL program or connect a repository to see activity here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Programs</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalPrograms || 0}</p>
              </div>
              <FileCode2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Documented</p>
                <p className="text-2xl font-bold text-primary">{stats?.documentedPrograms || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Repositories</p>
                <p className="text-2xl font-bold text-foreground">{stats?.repositories || 0}</p>
              </div>
              <GitBranch className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Elements</p>
                <p className="text-2xl font-bold text-foreground">{stats?.dataElements || 0}</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}