import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface UseFileUploadOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onUploadStart?: () => void;
}

export function useFileUpload({ onSuccess, onError, onUploadStart }: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      
      // Add each file to the form data
      files.forEach((file, index) => {
        formData.append(`files`, file);
      });

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || 'Upload failed'));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', '/api/programs/upload');
        xhr.send(formData);
      });
    },
    onMutate: () => {
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStart?.();
    },
    onSuccess: (data) => {
      setIsUploading(false);
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      
      toast({
        title: "Upload Successful",
        description: `${Array.isArray(data) ? data.length : 1} file(s) uploaded and processed successfully`,
      });
      
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      setIsUploading(false);
      setUploadProgress(0);
      
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      
      onError?.(error);
    },
  });

  const uploadFiles = (files: File[]) => {
    // Validate files before uploading
    const allowedExtensions = ['.cob', '.cbl', '.txt', '.cobol'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    
    const invalidFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return !allowedExtensions.includes(extension) || file.size > maxFileSize;
    });

    if (invalidFiles.length > 0) {
      const errorMessage = invalidFiles.map(file => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedExtensions.includes(extension)) {
          return `${file.name}: Invalid file type (only .cob, .cbl, .txt, .cobol allowed)`;
        }
        return `${file.name}: File too large (max 10MB)`;
      }).join('\n');

      toast({
        title: "Invalid Files",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(files);
  };

  return {
    uploadFiles,
    isUploading,
    uploadProgress,
    error: uploadMutation.error,
  };
}

// Utility function to validate COBOL files
export function validateCobolFile(file: File): { isValid: boolean; error?: string } {
  const allowedExtensions = ['.cob', '.cbl', '.txt', '.cobol'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only .cob, .cbl, .txt, and .cobol files are allowed.'
    };
  }
  
  if (file.size > maxFileSize) {
    return {
      isValid: false,
      error: 'File is too large. Maximum file size is 10MB.'
    };
  }
  
  return { isValid: true };
}

// Enhanced drag and drop handling
export function useDropzone(onFilesDropped: (files: File[]) => void) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesDropped(files);
    }
  };

  return {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}