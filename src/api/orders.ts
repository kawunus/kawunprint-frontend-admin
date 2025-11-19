import { api } from './index';
import { Order, OrderHistory, OrderStatus } from '../types';

export const ordersApi = {
  getAllOrders: async (): Promise<Order[]> => {
    const response = await api.get<Order[]>('/api/v1/orders');
    return response.data;
  },

  getOrderById: async (id: number): Promise<Order> => {
    const response = await api.get<Order>(`/api/v1/orders/${id}`);
    return response.data;
  },

  updateOrder: async (
    id: number,
    orderData: { employeeId: number | null; statusId: number; totalPrice: number; comment: string; completedAt?: string }
  ): Promise<Order> => {
    const response = await api.put<Order>(`/api/v1/orders/${id}`, orderData);
    return response.data;
  },

  getOrderHistory: async (orderId: number): Promise<OrderHistory[]> => {
    try {
      const response = await api.get<OrderHistory[]>(`/api/v1/orders/${orderId}/history`);
      return response.data;
    } catch (err: any) {
      // Treat 404 as "no history" so UI can render empty state instead of error
      if (err.response?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  addOrderHistory: async (orderId: number, data: { statusId: number; comment: string }): Promise<OrderHistory> => {
    const response = await api.post<OrderHistory>(`/api/v1/orders/${orderId}/history`, data);
    return response.data;
  },

  getOrderStatuses: async (): Promise<OrderStatus[]> => {
    const response = await api.get<OrderStatus[]>(`/api/v1/order-status`);
    return response.data;
  },

  createOrderStatus: async (data: { description: string }): Promise<OrderStatus> => {
    const response = await api.post<OrderStatus>(`/api/v1/order-status`, data);
    return response.data;
  },

  updateOrderStatus: async (id: number, data: { description: string }): Promise<void> => {
    await api.put(`/api/v1/order-status/${id}`, data);
  },

  deleteOrderStatus: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/order-status/${id}`);
  },

  createOrder: async (data: { customerId: number; statusId: number; totalPrice: number; comment: string }): Promise<Order> => {
    const response = await api.post<Order>('/api/v1/orders', data, {
      transformRequest: [(data, headers) => {
        // Remove X-User-Id header before sending
        delete headers['X-User-Id'];
        return JSON.stringify(data);
      }]
    });
    return response.data;
  },

  deleteOrder: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/orders/${id}`);
  },

  consumeFilament: async (orderId: number, data: { filamentId: number; gramsUsed: number; comment?: string }): Promise<Order> => {
    const response = await api.post<Order>(`/api/v1/orders/${orderId}/consume-filament`, data);
    return response.data;
  },
};