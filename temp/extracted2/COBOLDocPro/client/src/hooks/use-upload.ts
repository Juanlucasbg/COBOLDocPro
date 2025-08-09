import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/upload-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
    },
  });
}

export function useUploadSessions() {
  return useQuery({
    queryKey: ["/api/upload-sessions"],
    refetchInterval: 5000, // Refresh every 5 seconds to get status updates
  });
}

export function useStatistics() {
  return useQuery({
    queryKey: ["/api/statistics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: [`/api/search/${query}`],
    enabled: !!query && query.length > 2,
  });
}
