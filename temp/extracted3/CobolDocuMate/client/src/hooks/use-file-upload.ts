import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UseFileUploadOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useFileUpload({ onSuccess, onError }: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/programs/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      setIsUploading(false);
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      setIsUploading(false);
      onError?.(error);
    },
  });

  const uploadFiles = (files: File[]) => {
    setIsUploading(true);
    uploadMutation.mutate(files);
  };

  return {
    uploadFiles,
    isUploading,
    error: uploadMutation.error,
  };
}
