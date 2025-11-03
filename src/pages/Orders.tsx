import React, { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { OrderTable } from '../components/orders/OrderTable';
import { Button } from '../components/ui/Button';

export const Orders: React.FC = () => {
  const { orders, loading, error, refreshOrders, updateOrderStatus } = useOrders();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-red-700">{error}</div>
          <Button onClick={refreshOrders} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="flex space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button onClick={refreshOrders} variant="secondary">
            Refresh
          </Button>
        </div>
      </div>

      <OrderTable
        orders={filteredOrders}
        loading={loading}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};