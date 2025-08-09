import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText,
  Activity,
  Eye,
  GitBranch
} from "lucide-react";
import { Link } from "wouter";
import type { Statistics } from "@shared/schema";

export default function Dashboard() {
  const [repositoryUrl, setRepositoryUrl] = useState("");

  const { data: stats } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
    refetchInterval: 30000,
  });

  const { data: repositories } = useQuery({
    queryKey: ["/api/repositories"],
  });

  const recentRepositories = repositories?.slice(0, 2) || [];

  const handleAddRepository = () => {
    if (repositoryUrl.trim()) {
      window.location.href = `/repositories?add=${encodeURIComponent(repositoryUrl)}`;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Add New Codebase</h1>
      </div>

      {/* Add Repository Section */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-foreground">Codebase Repository URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <Input
              type="url"
              placeholder="https://github.com/your-org/cobol-project"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              className="flex-1 h-10 bg-background border-border"
              data-testid="repository-url-input"
            />
            <Button 
              onClick={handleAddRepository}
              disabled={!repositoryUrl.trim()}
              className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="generate-button"
            >
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Your Codebases Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium text-foreground">Your Codebases</h2>
        
        {recentRepositories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentRepositories.map((repo: any) => (
              <Card key={repo.id} className="border border-border hover:border-muted-foreground/20 transition-colors">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground">{repo.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Last updated: {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleTimeString() : 'Never'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        <Activity className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Domain</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {repo.description || "Enterprise COBOL Application"}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
                        <span>{repo.branch || 'main'} branch</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button variant="outline" size="sm" asChild className="h-8">
                        <Link href={`/repositories/${repo.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visit Docs
                        </Link>
                      </Button>
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
          <Card className="border border-border">
            <CardContent className="p-12 text-center">
              <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Codebases Connected</h3>
              <p className="text-muted-foreground mb-6">
                Connect your first COBOL repository to start generating documentation.
              </p>
              <Link href="/repositories">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Add Repository
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity History */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium text-foreground">Activity History</h2>
        <Card className="border border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Showing history of updates made on your docs.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}