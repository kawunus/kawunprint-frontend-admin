import { api } from './index';
import { PrinterHistory } from '../types';

export const printerHistoryApi = {
  getAll: async (): Promise<PrinterHistory[]> => {
    const res = await api.get<PrinterHistory[]>('/api/v1/printer-history');
    return res.data;
  },
  getById: async (id: number): Promise<PrinterHistory> => {
    const res = await api.get<PrinterHistory>(`/api/v1/printer-history/${id}`);
    return res.data;
  },
  getByPrinter: async (printerId: number): Promise<PrinterHistory[]> => {
    // Backend route doesn't expose a query yet; fetch all and filter client-side
    const all = await printerHistoryApi.getAll();
    return all.filter(h => Number(h.printerId) === Number(printerId));
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/printer-history/${id}`);
  }
};
