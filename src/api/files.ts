import { api } from './index';
import { OrderFile, OrderFileStats } from '../types';

export const filesApi = {
  /**
   * Upload a file to an order
   */
  uploadFile: async (orderId: number, file: File): Promise<OrderFile> => {
    console.log(`📤 filesApi.uploadFile called for order ${orderId}`);
    console.log('📎 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('📦 FormData created, making API request...');

    const response = await api.post<OrderFile>(
      `/api/v1/orders/${orderId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    console.log('✅ File upload response:', response.data);
    return response.data;
  },

  /**
   * Get all files for an order
   */
  getOrderFiles: async (orderId: number): Promise<OrderFile[]> => {
    const response = await api.get<OrderFile[]>(`/api/v1/orders/${orderId}/files`);
    return response.data;
  },

  /**
   * Get file statistics for an order
   */
  getFileStats: async (orderId: number): Promise<OrderFileStats> => {
    const response = await api.get<OrderFileStats>(`/api/v1/orders/${orderId}/files/stats`);
    return response.data;
  },

  /**
   * Delete a file from an order
   */
  deleteFile: async (orderId: number, fileId: number): Promise<void> => {
    await api.delete(`/api/v1/orders/${orderId}/files/${fileId}`);
  },

  /**
   * Get all files (admin only)
   */
  getAllFiles: async (prefix?: string, limit?: number): Promise<any> => {
    const params: any = {};
    if (prefix) params.prefix = prefix;
    if (limit) params.limit = limit;
    
    const response = await api.get('/api/v1/admin/files/list', { params });
    return response.data;
  },
};
