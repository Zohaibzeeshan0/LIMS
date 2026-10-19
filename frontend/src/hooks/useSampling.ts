import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { samplingService, SamplingFilters } from '@/services/sampling.service';

export function useSampling(filters?: SamplingFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['samples', filters],
    queryFn: () => samplingService.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: samplingService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => samplingService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  return {
    ...query,
    createSample: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateSample: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
