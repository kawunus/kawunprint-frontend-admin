import { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../api/orders';
import { Order, UpdateOrderRequest } from '../types';

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  updateOrderStatus: (orderId: number, status: string, comment?: string) => Promise<void>;
}

export const useOrders = (): UseOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const ordersData = await ordersApi.getAllOrders();
      setOrders(ordersData);
    } catch (err) {
      setError('Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: number, status: string, comment?: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updateData: UpdateOrderRequest = {
        status,
        totalPrice: order.totalPrice,
        comment: comment || order.comment,
      };

      const updatedOrder = await ordersApi.updateOrder(orderId, updateData);
      
      // Добавляем запись в историю
      await ordersApi.addOrderHistory(orderId, { status, comment });

      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    } catch (err) {
      console.error('Error updating order status:', err);
      throw err;
    }
  }, [orders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refreshOrders: fetchOrders,
    updateOrderStatus,
  };
};