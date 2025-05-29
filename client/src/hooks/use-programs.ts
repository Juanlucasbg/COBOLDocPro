import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Program } from "@shared/schema";

export function usePrograms() {
  return useQuery({
    queryKey: ["/api/programs"],
  });
}

export function useProgram(id: string | number) {
  return useQuery({
    queryKey: [`/api/programs/${id}`],
    enabled: !!id,
  });
}

export function useProgramDataElements(id: string | number) {
  return useQuery({
    queryKey: [`/api/programs/${id}/data-elements`],
    enabled: !!id,
  });
}

export function useProgramRelationships(id: string | number) {
  return useQuery({
    queryKey: [`/api/programs/${id}/relationships`],
    enabled: !!id,
  });
}

export function useSearchPrograms(query: string) {
  return useQuery({
    queryKey: [`/api/programs/search/${query}`],
    enabled: !!query && query.length > 2,
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/programs/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
    },
  });
}
