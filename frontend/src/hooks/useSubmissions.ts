import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsService } from '@/services/submissions.service';

export function useSubmissions() {
  const queryClient = useQueryClient();

  const worksheetsQuery = useQuery({
    queryKey: ['worksheets'],
    queryFn: submissionsService.getWorksheets,
  });

  const batchesQuery = useQuery({
    queryKey: ['batches'],
    queryFn: submissionsService.getBatches,
  });

  const oosQuery = useQuery({
    queryKey: ['oos'],
    queryFn: submissionsService.getOosList,
  });

  const dashboardQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: submissionsService.getDashboardSummary,
  });

  const recordResultMutation = useMutation({
    mutationFn: ({ testId, data }: { testId: string; data: any }) =>
      submissionsService.recordResult(testId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheets'] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const releaseBatchMutation = useMutation({
    mutationFn: ({ batchId, data }: { batchId: string; data: any }) =>
      submissionsService.releaseBatch(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const issueCoaMutation = useMutation({
    mutationFn: (batchId: string) => submissionsService.issueCoa(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });

  return {
    worksheets: worksheetsQuery.data,
    isLoadingWorksheets: worksheetsQuery.isLoading,
    batches: batchesQuery.data,
    isLoadingBatches: batchesQuery.isLoading,
    oosList: oosQuery.data,
    isLoadingOos: oosQuery.isLoading,
    dashboardSummary: dashboardQuery.data,
    isLoadingDashboard: dashboardQuery.isLoading,
    recordResult: recordResultMutation.mutateAsync,
    isRecordingResult: recordResultMutation.isPending,
    releaseBatch: releaseBatchMutation.mutateAsync,
    isReleasingBatch: releaseBatchMutation.isPending,
    issueCoa: issueCoaMutation.mutateAsync,
    isIssuingCoa: issueCoaMutation.isPending,
  };
}
