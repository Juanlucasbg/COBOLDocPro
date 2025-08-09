import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface Repository {
  id: string;
  name: string;
  url: string;
  description: string;
  features: string[];
}

interface AnalysisJob {
  id: string;
  repositoryUrl: string;
  repositoryName: string;
  status: 'PENDING' | 'ANALYZING' | 'SEMANTIC_ANALYSIS' | 'GENERATING_DOCS' | 'ENTERPRISE_DOCS' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export default function RepositoryAnalysis() {
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [activeJobs, setActiveJobs] = useState<AnalysisJob[]>([]);

  // Fetch predefined repositories
  const { data: repositories = [], isLoading: repositoriesLoading } = useQuery({
    queryKey: ['/api/predefined-repositories'],
    queryFn: async (): Promise<Repository[]> => {
      const response = await fetch('/api/predefined-repositories');
      if (!response.ok) throw new Error('Failed to fetch repositories');
      return response.json();
    }
  });

  // Fetch active jobs
  const { data: jobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ['/api/analysis-jobs'],
    queryFn: async (): Promise<AnalysisJob[]> => {
      const response = await fetch('/api/analysis-jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
    refetchInterval: 2000 // Poll every 2 seconds
  });

  // Start repository analysis mutation
  const startAnalysisMutation = useMutation({
    mutationFn: async ({ repositoryType }: { repositoryType: string }) => {
      const response = await fetch('/api/analyze-repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryType })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start analysis');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchJobs();
      setSelectedRepository(null);
    }
  });

  // Start custom repository analysis mutation
  const startCustomAnalysisMutation = useMutation({
    mutationFn: async ({ repositoryUrl }: { repositoryUrl: string }) => {
      const response = await fetch('/api/analyze-custom-repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryUrl })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start analysis');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchJobs();
      setCustomUrl('');
    }
  });

  const handleStartAnalysis = () => {
    if (selectedRepository) {
      startAnalysisMutation.mutate({ repositoryType: selectedRepository });
    }
  };

  const handleStartCustomAnalysis = () => {
    if (customUrl.trim()) {
      startCustomAnalysisMutation.mutate({ repositoryUrl: customUrl.trim() });
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-white';
      case 'FAILED': return 'bg-white';
      case 'ANALYZING': 
      case 'GENERATING_DOCS': return 'bg-white';
      default: return 'bg-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'ANALYZING': return 'Analyzing';
      case 'GENERATING_DOCS': return 'Generating Docs';
      case 'COMPLETED': return 'Completed';
      case 'FAILED': return 'Failed';
      default: return status;
    }
  };

  return (
    <div className="ultra-minimal p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">COBOL Repository Analysis</h1>
        <p className="text-white">
          Analyze COBOL repositories with static analysis followed by AI-enhanced documentation
        </p>
      </div>

      {/* Predefined Repositories */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium text-white">Featured COBOL Parsers</h2>
        
        {repositoriesLoading ? (
          <div className="text-white">Loading repositories...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className={`ultra-minimal p-6 cursor-pointer ${
                  selectedRepository === repo.id ? 'ring-2 ring-white' : ''
                }`}
                onClick={() => setSelectedRepository(repo.id)}
                data-testid={`repository-${repo.id}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white">{repo.name}</h3>
                    <div className="w-4 h-4">
                      {selectedRepository === repo.id && (
                        <div className="w-full h-full bg-white"></div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-white">{repo.description}</p>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-white font-medium">Key Features:</p>
                    <ul className="text-xs text-white space-y-1">
                      {repo.features.slice(0, 3).map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {selectedRepository && (
          <div className="flex justify-end">
            <button
              onClick={handleStartAnalysis}
              disabled={startAnalysisMutation.isPending}
              className="ultra-minimal-button px-6 py-2"
              data-testid="start-analysis-button"
            >
              {startAnalysisMutation.isPending ? 'Starting...' : 'Start Analysis'}
            </button>
          </div>
        )}
      </div>

      {/* Custom Repository */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium text-white">Custom Repository</h2>
        
        <div className="ultra-minimal p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                GitHub Repository URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/owner/repository.git"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full h-10 bg-black text-white placeholder-white"
                data-testid="custom-url-input"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleStartCustomAnalysis}
                disabled={!customUrl.trim() || startCustomAnalysisMutation.isPending}
                className="ultra-minimal-button px-6 py-2"
                data-testid="start-custom-analysis-button"
              >
                {startCustomAnalysisMutation.isPending ? 'Starting...' : 'Analyze Repository'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Jobs */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium text-white">Analysis Jobs</h2>
        
        {jobs.length === 0 ? (
          <div className="ultra-minimal p-6 text-center">
            <p className="text-white">No analysis jobs running</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="ultra-minimal p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">{job.repositoryName}</h3>
                      <p className="text-sm text-white">{job.repositoryUrl}</p>
                    </div>
                    <div className="ultra-minimal-button px-3 py-1 text-xs">
                      {getStatusText(job.status)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white">{job.currentStep}</span>
                      <span className="text-sm text-white">{job.progress}%</span>
                    </div>
                    
                    <div className="w-full h-2 bg-black">
                      <div
                        className={`h-full transition-all duration-300 ${getProgressColor(job.status)}`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {job.error && (
                    <div className="text-white text-sm">
                      Error: {job.error}
                    </div>
                  )}
                  
                  <div className="text-xs text-white">
                    Started: {new Date(job.createdAt).toLocaleString()}
                    {job.completedAt && (
                      <span> • Completed: {new Date(job.completedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Messages */}
      {startAnalysisMutation.isError && (
        <div className="ultra-minimal p-4">
          <p className="text-white">
            Error: {startAnalysisMutation.error?.message}
          </p>
        </div>
      )}
      
      {startCustomAnalysisMutation.isError && (
        <div className="ultra-minimal p-4">
          <p className="text-white">
            Error: {startCustomAnalysisMutation.error?.message}
          </p>
        </div>
      )}
    </div>
  );
}