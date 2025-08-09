import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, Github, RefreshCw, Link2, Folder, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { Repository } from "@shared/schema";

export default function RepositoriesPage() {
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [accessToken, setAccessToken] = useState("");
  const { toast } = useToast();

  const { data: repositories, isLoading } = useQuery<Repository[]>({
    queryKey: ["/api/repositories"],
  });

  const connectMutation = useMutation({
    mutationFn: async (data: { githubUrl: string; branch: string; accessToken?: string }) => {
      const response = await fetch("/api/repositories/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to connect repository");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      setIsConnectDialogOpen(false);
      setGithubUrl("");
      setBranch("main");
      setAccessToken("");
      toast({
        title: "Repository connected",
        description: "Successfully connected to GitHub repository",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/repositories/${id}/sync`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to sync repository");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({
        title: "Sync completed",
        description: `Successfully synced repository. ${data.filesProcessed} files processed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/repositories/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete repository");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      toast({
        title: "Repository deleted",
        description: "Successfully deleted repository",
      });
    },
  });

  const handleConnect = () => {
    if (!githubUrl) {
      toast({
        title: "Error",
        description: "Please enter a GitHub URL",
        variant: "destructive",
      });
      return;
    }
    connectMutation.mutate({ githubUrl, branch, accessToken: accessToken || undefined });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="text-success" size={16} />;
      case "syncing":
        return <RefreshCw className="text-primary animate-spin" size={16} />;
      case "failed":
        return <XCircle className="text-destructive" size={16} />;
      default:
        return <Clock className="text-muted-foreground" size={16} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      syncing: "secondary",
      failed: "destructive",
      pending: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">GitHub Repositories</h1>
          <p className="text-muted-foreground">Connect and manage your COBOL repositories</p>
        </div>
        <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-connect-repository">
              <Github size={20} />
              Connect Repository
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Connect GitHub Repository</DialogTitle>
              <DialogDescription>
                Enter the GitHub repository URL to connect and analyze COBOL files
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="github-url">GitHub URL</Label>
                <Input
                  id="github-url"
                  placeholder="https://github.com/owner/repository"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  data-testid="input-github-url"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch (optional)</Label>
                <Input
                  id="branch"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  data-testid="input-branch"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="access-token">Access Token (optional)</Label>
                <Input
                  id="access-token"
                  type="password"
                  placeholder="For private repositories"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  data-testid="input-access-token"
                />
                <p className="text-xs text-muted-foreground">
                  Required for private repositories. Create a personal access token in GitHub settings.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleConnect}
                disabled={connectMutation.isPending}
                data-testid="button-confirm-connect"
              >
                {connectMutation.isPending ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {repositories?.length === 0 && !isLoading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No repositories connected yet. Click "Connect Repository" to get started.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {repositories?.map((repo) => (
          <Card key={repo.id} className="glass-card hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Github className="text-primary" size={20} />
                  <CardTitle className="text-lg">{repo.name}</CardTitle>
                </div>
                {getStatusBadge(repo.syncStatus)}
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                {repo.owner}/{repo.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Branch:</span>
                  <span className="text-white">{repo.branch}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Last synced:</span>
                  <span className="text-white">
                    {repo.updatedAt ? new Date(repo.updatedAt).toLocaleString() : "Never"}
                  </span>
                </div>
                {repo.lastSyncedCommit && (
                  <div className="flex items-center gap-2 text-sm">
                    <Link2 size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Commit:</span>
                    <span className="text-white font-mono text-xs">
                      {repo.lastSyncedCommit.substring(0, 7)}
                    </span>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncMutation.mutate(repo.id)}
                    disabled={syncMutation.isPending || repo.syncStatus === "syncing"}
                    className="flex-1"
                    data-testid={`button-sync-${repo.id}`}
                  >
                    <RefreshCw size={14} className={repo.syncStatus === "syncing" ? "animate-spin" : ""} />
                    <span className="ml-1">
                      {repo.syncStatus === "syncing" ? "Syncing..." : "Sync"}
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(repo.githubUrl, "_blank")}
                    data-testid={`button-view-${repo.id}`}
                  >
                    <Folder size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(repo.id)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-delete-${repo.id}`}
                  >
                    <XCircle size={14} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}