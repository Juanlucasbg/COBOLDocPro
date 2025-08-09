import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import FileUpload from "@/components/ui/file-upload";
import { Upload as UploadIcon, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useUploadSessions } from "@/hooks/use-upload";

export default function Upload() {
  const { data: uploadSessions = [] } = useUploadSessions();
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [analysisOptions, setAnalysisOptions] = useState({
    generateSummaries: true,
    createDataDictionary: true,
    extractBusinessRules: true,
    generateFlowDiagrams: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `${data.results.length} files uploaded and are being processed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/upload-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (files: FileList) => {
    if (files.length > 0) {
      uploadMutation.mutate(files);
    }
  };

  const handleRepositoryConnect = async () => {
    if (!repositoryUrl.trim()) {
      toast({
        title: "Repository URL Required",
        description: "Please enter a valid repository URL.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Repository Connection",
      description: "Repository connection feature coming soon.",
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-badge completed';
      case 'processing':
        return 'status-badge processing';
      case 'failed':
        return 'status-badge failed';
      default:
        return 'status-badge pending';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Upload COBOL Source Code
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your COBOL programs, copybooks, and JCL files for analysis
        </p>
      </div>

      {/* File Upload Area */}
      <Card>
        <CardContent className="p-12">
          <FileUpload
            onFilesSelected={handleFileUpload}
            isUploading={uploadMutation.isPending}
            acceptedTypes=".cbl,.cob,.cpy,.jcl"
            maxSize={100 * 1024 * 1024} // 100MB
          />
        </CardContent>
      </Card>

      {/* Upload Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch size={20} />
              Repository Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Connect to your source code repository for automatic sync
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="repo-url">Repository URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/company/cobol-legacy"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleRepositoryConnect}
                variant="outline" 
                className="w-full"
              >
                Connect Repository
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Configure how your code will be analyzed
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summaries"
                  checked={analysisOptions.generateSummaries}
                  onCheckedChange={(checked) =>
                    setAnalysisOptions(prev => ({ ...prev, generateSummaries: !!checked }))
                  }
                />
                <Label htmlFor="summaries" className="text-sm">
                  Generate AI summaries
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dictionary"
                  checked={analysisOptions.createDataDictionary}
                  onCheckedChange={(checked) =>
                    setAnalysisOptions(prev => ({ ...prev, createDataDictionary: !!checked }))
                  }
                />
                <Label htmlFor="dictionary" className="text-sm">
                  Create data dictionary
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rules"
                  checked={analysisOptions.extractBusinessRules}
                  onCheckedChange={(checked) =>
                    setAnalysisOptions(prev => ({ ...prev, extractBusinessRules: !!checked }))
                  }
                />
                <Label htmlFor="rules" className="text-sm">
                  Extract business rules
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="diagrams"
                  checked={analysisOptions.generateFlowDiagrams}
                  onCheckedChange={(checked) =>
                    setAnalysisOptions(prev => ({ ...prev, generateFlowDiagrams: !!checked }))
                  }
                />
                <Label htmlFor="diagrams" className="text-sm">
                  Generate flow diagrams
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads */}
      {uploadSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {uploadSessions.slice(0, 10).map((session) => (
                    <tr key={session.id}>
                      <td className="data-table td font-mono">{session.filename}</td>
                      <td className="data-table td text-gray-500 dark:text-gray-400">
                        {(session.size / 1024).toFixed(1)} KB
                      </td>
                      <td className="data-table td">
                        <span className={getStatusBadgeClass(session.status)}>
                          {session.status}
                        </span>
                      </td>
                      <td className="data-table td text-gray-500 dark:text-gray-400">
                        {new Date(session.uploadedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
