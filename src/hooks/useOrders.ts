import { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../api/orders';
import { Order, OrderHistory, OrderStatus } from '../types';
import { getUserIdFromToken } from '../utils/jwt';

type UpdateOrderRequest = {
  employeeId?: number | null;
  statusId: number;
  totalPrice?: number;
  comment?: string;
};

interface UseOrdersReturn {
  orders: Order[];
  orderStatuses: OrderStatus[];
  loading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  updateOrderStatus: (orderId: number, statusId: number, comment?: string) => Promise<void>;
  latestHistory: Record<number, OrderHistory | undefined>;
}

export const useOrders = (): UseOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latestHistory, setLatestHistory] = useState<Record<number, OrderHistory | undefined>>({});

  const statusNameById = useCallback(
    (id?: number): string | undefined => {
      if (id == null) return undefined;
      const fromApi = orderStatuses.find(s => s.id === id)?.description;
      if (fromApi) return fromApi;
      switch (id) {
        case 1: return 'в процессе';
        case 2: return 'завершён';
        case 3: return 'отменён';
        case 4: return 'ожидает оплаты';
        case 5: return 'отправлен';
        default: return undefined;
      }
    },
    [orderStatuses]
  );

  const statusIdByName = useCallback(
    (name?: string): number | undefined => {
      if (!name) return undefined;
      const normalized = name.toLowerCase();
      const fromApi = orderStatuses.find(s => s.description.toLowerCase() === normalized)?.id;
      if (fromApi != null) return fromApi;
      if (normalized === 'в процессе') return 1;
      if (normalized === 'завершён') return 2;
      if (normalized === 'отменён') return 3;
      if (normalized === 'ожидает оплаты') return 4;
      if (normalized === 'отправлен') return 5;
      return undefined;
    },
    [orderStatuses]
  );

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await ordersApi.getOrderStatuses();
      setOrderStatuses(data);
    } catch {
      // Silently fail if statuses can't be fetched
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const ordersData = await ordersApi.getAllOrders();
      const latestMap: Record<number, OrderHistory | undefined> = {};
      const withStatuses = await Promise.all(
        ordersData.map(async (o) => {
          try {
            const hist = await ordersApi.getOrderHistory(o.id);
            const latest: OrderHistory | undefined = Array.isArray(hist) && hist.length > 0 ? hist[0] : undefined;
            latestMap[o.id] = latest;
            const normalizedStatus = latest?.status
              || statusNameById(latest?.statusId)
              || statusNameById(o.statusId)
              || o.status;
            const normalizedStatusId = latest?.statusId ?? o.statusId ?? statusIdByName(o.status);
            return { ...o, status: normalizedStatus || o.status, statusId: normalizedStatusId } as Order;
          } catch {
            latestMap[o.id] = undefined;
            const fallbackStatus = statusNameById(o.statusId) || o.status;
            const fallbackStatusId = o.statusId ?? statusIdByName(o.status);
            return { ...o, status: fallbackStatus, statusId: fallbackStatusId } as Order;
          }
        })
      );
      setOrders(withStatuses);
      setLatestHistory(latestMap);
    } catch (err) {
      setError('Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [statusIdByName, statusNameById]);

  const updateOrderStatus = useCallback(async (orderId: number, statusId: number, comment?: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const employeeId = getUserIdFromToken() ?? null;
      const updateData: UpdateOrderRequest = {
        employeeId,
        statusId,
        totalPrice: order.totalPrice,
        comment: comment ?? order.comment,
      };

      const updatedOrder = await ordersApi.updateOrder(orderId, updateData);

      await ordersApi.addOrderHistory(orderId, { statusId, comment: comment || '' });
      let latestStatus = statusNameById(statusId) || updatedOrder.status || statusNameById(updatedOrder.statusId) || order.status;
      try {
        const hist = await ordersApi.getOrderHistory(orderId);
        const latest: OrderHistory | undefined = Array.isArray(hist) && hist.length > 0 ? hist[0] : undefined;
        const normalized = latest?.status || statusNameById(latest?.statusId);
        if (normalized) latestStatus = normalized;
        setLatestHistory(prev => ({ ...prev, [orderId]: latest }));
      } catch {
        // ignore history refresh errors; keep optimistic latestHistory
      }

      setOrders(prev => prev.map(o => (
        o.id === orderId
          ? { ...updatedOrder, status: latestStatus, statusId }
          : o
      )));
    } catch (err) {
      console.error('Error updating order status:', err);
      throw err;
    }
  }, [orders, statusNameById]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    orderStatuses,
    loading,
    error,
    refreshOrders: fetchOrders,
    updateOrderStatus,
    latestHistory,
  };
};