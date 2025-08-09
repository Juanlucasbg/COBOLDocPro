import { formatDistanceToNow } from "date-fns";
import { FileText, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { type CobolProgram } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemOverviewProps {
  programs: CobolProgram[];
  selectedProgramId: number | null;
  onProgramSelect: (id: number) => void;
  isLoading: boolean;
}

export default function SystemOverview({
  programs,
  selectedProgramId,
  onProgramSelect,
  isLoading,
}: SystemOverviewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-status-success" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-status-warning animate-pulse" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-status-error" />;
      default:
        return <AlertCircle className="h-4 w-4 text-carbon-gray-50" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processed':
        return 'Processed';
      case 'processing':
        return 'Processing';
      case 'error':
        return 'Error';
      default:
        return 'Uploaded';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'text-status-success';
      case 'processing':
        return 'text-status-warning';
      case 'error':
        return 'text-status-error';
      default:
        return 'text-carbon-gray-50';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processedCount = programs.filter(p => p.status === 'processed').length;

  if (isLoading) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-medium mb-4 text-carbon-gray-100">System Overview</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-carbon-gray-10 rounded-lg p-4 border border-carbon-gray-20">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <div className="flex space-x-3">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium mb-4 text-carbon-gray-100">System Overview</h2>
      
      {programs.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-carbon-gray-50 mx-auto mb-3" />
          <p className="text-sm text-carbon-gray-80">No programs uploaded yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {programs.map((program) => (
              <div
                key={program.id}
                className={`bg-carbon-gray-10 rounded-lg p-4 border cursor-pointer transition-colors ${
                  selectedProgramId === program.id
                    ? 'border-carbon-blue bg-blue-50'
                    : 'border-carbon-gray-20 hover:border-carbon-blue'
                }`}
                onClick={() => onProgramSelect(program.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-carbon-gray-100 truncate">
                      {program.filename}
                    </h3>
                    <p className="text-xs text-carbon-gray-80 mt-1">
                      Uploaded {formatDistanceToNow(new Date(program.uploadedAt))} ago
                    </p>
                    <div className="flex items-center mt-2 space-x-3">
                      <span className="text-xs text-carbon-gray-50">
                        {formatFileSize(program.size)}
                      </span>
                      <span className={`text-xs ${getStatusColor(program.status)}`}>
                        {getStatusText(program.status)}
                      </span>
                    </div>
                    {program.errorMessage && (
                      <p className="text-xs text-status-error mt-1 truncate">
                        {program.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="ml-2">
                    {getStatusIcon(program.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Summary */}
          <div className="mt-6 pt-4 border-t border-carbon-gray-20">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xl font-semibold text-carbon-blue">
                  {programs.length}
                </p>
                <p className="text-xs text-carbon-gray-80">Programs</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-status-success">
                  {processedCount}
                </p>
                <p className="text-xs text-carbon-gray-80">Processed</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
