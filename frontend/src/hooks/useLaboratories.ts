import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { laboratoriesService } from '@/services/laboratories.service';

export function useLaboratories() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['instruments'],
    queryFn: laboratoriesService.getInstruments,
  });

  const createMutation = useMutation({
    mutationFn: laboratoriesService.createInstrument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
    },
  });

  const calibrateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      laboratoriesService.logCalibration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  return {
    ...query,
    createInstrument: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    logCalibration: calibrateMutation.mutateAsync,
    isCalibrating: calibrateMutation.isPending,
  };
}
