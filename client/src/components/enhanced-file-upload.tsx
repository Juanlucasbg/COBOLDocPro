import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useFileUpload, useDropzone, validateCobolFile } from "@/hooks/use-file-upload";
import { Upload, FileCode, X, CheckCircle, AlertCircle } from "lucide-react";

interface EnhancedFileUploadProps {
  onUploadStart?: () => void;
  onUploadSuccess?: (data: any) => void;
  onUploadError?: (error: Error) => void;
}

interface QueuedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function EnhancedFileUpload({ 
  onUploadStart, 
  onUploadSuccess, 
  onUploadError 
}: EnhancedFileUploadProps) {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFiles, isUploading, uploadProgress } = useFileUpload({
    onUploadStart: () => {
      setQueuedFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));
      onUploadStart?.();
    },
    onSuccess: (data) => {
      setQueuedFiles(prev => prev.map(f => ({ ...f, status: 'completed' })));
      onUploadSuccess?.(data);
      
      // Clear completed files after a delay
      setTimeout(() => {
        setQueuedFiles([]);
      }, 3000);
    },
    onError: (error) => {
      setQueuedFiles(prev => prev.map(f => ({ ...f, status: 'error', error: error.message })));
      onUploadError?.(error);
    },
  });

  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } = useDropzone((files) => {
    addFilesToQueue(files);
  });

  const addFilesToQueue = (files: File[]) => {
    const newFiles = files.map(file => {
      const validation = validateCobolFile(file);
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: validation.isValid ? 'pending' as const : 'error' as const,
        error: validation.error,
      };
    });

    setQueuedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setQueuedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFilesToQueue(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = () => {
    const validFiles = queuedFiles
      .filter(qf => qf.status === 'pending')
      .map(qf => qf.file);
    
    if (validFiles.length > 0) {
      uploadFiles(validFiles);
    }
  };

  const getStatusIcon = (status: QueuedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileCode className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: QueuedFile['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'uploading':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const validFilesCount = queuedFiles.filter(f => f.status === 'pending').length;
  const totalSize = queuedFiles
    .filter(f => f.status === 'pending')
    .reduce((total, qf) => total + qf.file.size, 0);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card 
        className={`transition-all duration-200 cursor-pointer ${
          isDragOver 
            ? 'border-green-400 bg-green-400/5 border-2' 
            : 'border-gray-700 hover:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
            <Upload className="text-green-400 text-2xl" />
          </div>
          
          <h3 className="text-lg font-semibold text-white mb-2">
            Upload COBOL Files
          </h3>
          
          <p className="text-gray-400 mb-4">
            Drag and drop files here, or click to select files
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              .cob
            </Badge>
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              .cbl
            </Badge>
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              .cobol
            </Badge>
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              .txt
            </Badge>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            Maximum file size: 10MB
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".cob,.cbl,.cobol,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File Queue */}
      {queuedFiles.length > 0 && (
        <Card className="border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-white">
                Files Ready for Upload ({validFilesCount})
              </h4>
              {totalSize > 0 && (
                <div className="text-sm text-gray-400">
                  Total: {(totalSize / (1024 * 1024)).toFixed(2)} MB
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Uploading files...</span>
                  <span className="text-sm text-green-400">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* File List */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {queuedFiles.map((queuedFile) => (
                <div 
                  key={queuedFile.id}
                  className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(queuedFile.status)}
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(queuedFile.status)}`}>
                        {queuedFile.file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(queuedFile.file.size / 1024).toFixed(1)} KB
                      </div>
                      {queuedFile.error && (
                        <div className="text-xs text-red-400 mt-1">
                          {queuedFile.error}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {queuedFile.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(queuedFile.id);
                      }}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Upload Button */}
            {validFilesCount > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing {validFilesCount} file{validFilesCount > 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload & Analyze {validFilesCount} file{validFilesCount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}