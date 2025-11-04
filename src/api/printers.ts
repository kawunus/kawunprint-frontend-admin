import { api } from './index';
import { Printer, CreatePrinterRequest, UpdatePrinterRequest } from '../types';

export const printersApi = {
  getAll: async (): Promise<Printer[]> => {
    const res = await api.get<Printer[]>('/api/v1/printers');
    return res.data;
  },
  getById: async (id: number): Promise<Printer> => {
    const res = await api.get<Printer>(`/api/v1/printers/${id}`);
    return res.data;
  },
  create: async (data: CreatePrinterRequest): Promise<void> => {
    await api.post('/api/v1/printers', data);
  },
  update: async (id: number, data: UpdatePrinterRequest): Promise<void> => {
    await api.put(`/api/v1/printers/${id}`, data);
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/printers/${id}`);
  },
  setActive: async (id: number, state: boolean): Promise<void> => {
    await api.patch(`/api/v1/printers/${id}/active`, undefined, { params: { state } });
  },
};
