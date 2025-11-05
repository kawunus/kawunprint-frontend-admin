import { api } from './index';
import { User } from '../types';

export const usersApi = {
  getById: async (id: number): Promise<User> => {
    const res = await api.get<User>(`/api/v1/users/${id}`);
    return res.data;
  },
};
