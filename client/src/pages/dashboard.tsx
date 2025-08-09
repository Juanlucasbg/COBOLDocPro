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
    <div className="ultra-minimal p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Add New Codebase</h1>
      </div>

      {/* Add Repository Section */}
      <div className="ultra-minimal p-6">
        <div className="pb-4">
          <h2 className="text-lg font-medium text-white">Codebase Repository URL</h2>
        </div>
        <div className="space-y-4">
          <div className="flex space-x-3">
            <input
              type="url"
              placeholder="https://github.com/your-org/cobol-project"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              className="flex-1 h-10 bg-black text-white placeholder-white"
              data-testid="repository-url-input"
            />
            <button 
              onClick={handleAddRepository}
              disabled={!repositoryUrl.trim()}
              className="ultra-minimal-button h-10 px-6"
              data-testid="generate-button"
            >
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* Your Codebases Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium text-white">Your Codebases</h2>
        
        {recentRepositories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentRepositories.map((repo: any) => (
              <div key={repo.id} className="ultra-minimal p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium text-white">{repo.name}</h3>
                      <p className="text-sm text-white">
                        Last updated: {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleTimeString() : 'Never'}
                      </p>
                    </div>
                    <div className="ultra-minimal-button px-2 py-1 text-xs">
                      Live
                    </div>
                  </div>

                  <div className="ultra-minimal p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-4 h-4 text-white" />
                      <span className="text-sm font-medium text-white">Domain</span>
                    </div>
                    <p className="text-sm text-white">
                      {repo.description || "Enterprise COBOL Application"}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-white">
                      <div className="w-1 h-1 bg-white"></div>
                      <span>{repo.branch || 'main'} branch</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link href={`/repositories/${repo.id}`} className="ultra-minimal-button h-8 px-3 text-xs inline-flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      Visit Docs
                    </Link>
                    <div className="ultra-minimal-button px-2 py-1 text-xs">
                      Live
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ultra-minimal p-12 text-center">
            <GitBranch className="mx-auto h-12 w-12 text-white mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Codebases Connected</h3>
            <p className="text-white mb-6">
              Connect your first COBOL repository to start generating documentation.
            </p>
            <Link href="/repositories" className="ultra-minimal-button px-6 py-2">
              Add Repository
            </Link>
          </div>
        )}
      </div>

      {/* Activity History */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium text-white">Activity History</h2>
        <div className="ultra-minimal p-6">
          <p className="text-sm text-white">Showing history of updates made on your docs.</p>
        </div>
      </div>
    </div>
  );
}