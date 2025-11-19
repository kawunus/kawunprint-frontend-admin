import { api } from './index';
import { User, UpdateProfileRequest } from '../types';

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/api/v1/users');
    return res.data;
  },
  
  getById: async (id: number): Promise<User> => {
    const res = await api.get<User>(`/api/v1/users/${id}`);
    return res.data;
  },

  // Get current user profile
  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/api/v1/users/me');
    return response.data;
  },

  // Update current user profile
  updateMe: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await api.put<User>('/api/v1/users/me', data);
    return response.data;
  },

  // Delete current user account
  deleteMe: async (): Promise<void> => {
    await api.delete('/api/v1/users/me');
  },
};
