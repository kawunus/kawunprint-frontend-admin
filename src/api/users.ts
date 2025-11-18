import { api } from './index';
import { User } from '../types';

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/api/v1/users');
    return res.data;
  },
  
  getById: async (id: number): Promise<User> => {
    const res = await api.get<User>(`/api/v1/users/${id}`);
    return res.data;
  },
};
