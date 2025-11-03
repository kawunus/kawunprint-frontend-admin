import { api } from './index';
import { Order } from '../types';

export const ordersApi = {
  getAllOrders: async (): Promise<Order[]> => {
    const response = await api.get<Order[]>('/api/v1/orders');
    return response.data;
  },

  getOrderById: async (id: number): Promise<Order> => {
    const response = await api.get<Order>(`/api/v1/orders/${id}`);
    return response.data;
  },

  updateOrder: async (id: number, orderData: any): Promise<Order> => {
    const response = await api.put<Order>(`/api/v1/orders/${id}`, orderData);
    return response.data;
  },

  getOrderHistory: async (orderId: number): Promise<any[]> => {
    try {
  const response = await api.get<any[]>(`/api/v1/orders/${orderId}/history`);
      return response.data;
    } catch (err: any) {
      // Treat 404 as "no history" so UI can render empty state instead of error
      if (err.response?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  addOrderHistory: async (orderId: number, data: { status: string; comment?: string }): Promise<any> => {
    const response = await api.post<any>(`/api/v1/orders/${orderId}/history`, data);
    return response.data;
  },
};