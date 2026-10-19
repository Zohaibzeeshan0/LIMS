import { api } from '@/lib/api';
import { Instrument } from '@/types/lims';

export const laboratoriesService = {
  getInstruments: () => api.get<Instrument[]>('/laboratories/instruments'),

  getInstrumentById: (id: string) => api.get<Instrument>(`/laboratories/instruments/${id}`),

  createInstrument: (data: any) => api.post<Instrument>('/laboratories/instruments', data),

  logCalibration: (id: string, data: any) =>
    api.post<any>(`/laboratories/instruments/${id}/calibration`, data),
};
