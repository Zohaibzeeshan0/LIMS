import { api } from '@/lib/api';
import { SampleTest, Batch, CertificateOfAnalysis, OosIncident } from '@/types/lims';

export const submissionsService = {
  getWorksheets: () => api.get<SampleTest[]>('/submissions/worksheets'),

  recordResult: (testId: string, data: any) =>
    api.patch<any>(`/submissions/worksheets/${testId}/record-result`, data),

  verifyTest: (testId: string) =>
    api.patch<SampleTest>(`/submissions/worksheets/${testId}/verify`),

  getBatches: () => api.get<Batch[]>('/submissions/batches'),

  createBatch: (data: any) => api.post<Batch>('/submissions/batches', data),

  releaseBatch: (batchId: string, data: { decision: string; notes: string }) =>
    api.patch<Batch>(`/submissions/batches/${batchId}/release`, data),

  issueCoa: (batchId: string) =>
    api.post<CertificateOfAnalysis>(`/submissions/batches/${batchId}/coa`),

  getOosList: () => api.get<OosIncident[]>('/submissions/oos'),

  updateOos: (id: string, data: any) =>
    api.patch<OosIncident>(`/submissions/oos/${id}`, data),

  getDashboardSummary: () => api.get<any>('/submissions/analytics/dashboard'),
};
