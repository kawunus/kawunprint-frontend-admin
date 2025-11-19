import { api } from './index';
import { User, UpdateProfileRequest } from '../types';

export interface UpdateUserAdminRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT' | 'ANALYST';
  isActive: boolean;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT' | 'ANALYST';
  isActive: boolean;
}

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

  // Admin: Create new user
  createUser: async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post<User>('/api/v1/register', data);
    return response.data;
  },

  // Admin: Update user by ID
  updateUser: async (id: number, data: UpdateUserAdminRequest): Promise<User> => {
    const response = await api.post<User>(`/api/v1/users/${id}`, data);
    return response.data;
  },

  // Admin: Delete user by ID
  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/users/${id}`);
  },

  // Admin: Update user role
  updateUserRole: async (id: number, role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT' | 'ANALYST'): Promise<void> => {
    await api.post(`/api/v1/users/${id}/role`, null, {
      params: { role }
    });
  },
};
