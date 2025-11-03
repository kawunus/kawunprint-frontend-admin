import { api } from './index';
import { Filament, CreateFilamentRequest, UpdateFilamentRequest, FilamentType, CreateFilamentTypeRequest } from '../types';

export const filamentsApi = {
  getAll: async (typeId?: number): Promise<Filament[]> => {
    const params = typeId ? { params: { typeId } } : undefined;
    const response = await api.get<Filament[]>('/api/v1/filaments', params as any);
    return response.data;
  },

  getById: async (id: number): Promise<Filament> => {
    const response = await api.get<Filament>(`/api/v1/filaments/${id}`);
    return response.data;
  },

  create: async (data: CreateFilamentRequest): Promise<Filament> => {
    const response = await api.post<Filament>('/api/v1/filaments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateFilamentRequest): Promise<Filament> => {
    const response = await api.put<Filament>(`/api/v1/filaments/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/filaments/${id}`);
  },

  getTypes: async (): Promise<FilamentType[]> => {
    const response = await api.get<FilamentType[]>('/api/v1/filaments/types');
    return response.data;
  },

  createType: async (data: CreateFilamentTypeRequest): Promise<FilamentType> => {
    const response = await api.post<FilamentType>('/api/v1/filaments/types', data);
    return response.data;
  },

  updateType: async (id: number, data: CreateFilamentTypeRequest): Promise<FilamentType> => {
    // Backend route uses POST /api/v1/filaments/types/{id} for update per server routes
    const response = await api.post<FilamentType>(`/api/v1/filaments/types/${id}`, data);
    return response.data;
  },

  deleteType: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/filaments/types/${id}`);
  },
};
