import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { Order, OrderHistory } from '../types';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/orders/StatusBadge';

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        const [orderData, historyData] = await Promise.all([
          ordersApi.getOrderById(Number(id)),
          ordersApi.getOrderHistory(Number(id)),
        ]);
        setOrder(orderData);
        setHistory(historyData);
      } catch (err) {
        setError('Failed to fetch order details');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-red-700">{error || 'Order not found'}</div>
          <Button onClick={() => navigate('/orders')} className="mt-2">
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button onClick={() => navigate('/orders')} variant="secondary">
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Order #{order.id}
          </h1>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Order Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <span>{order.customer.firstName} {order.customer.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span>{order.customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span>{order.customer.phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            {order.completedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span>{new Date(order.completedAt).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Total Price:</span>
              <span className="font-semibold">{order.totalPrice.toFixed(2)} BYN</span>
            </div>
          </div>

          {order.comment && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-600">Comment</h3>
              <p className="mt-1 text-sm text-gray-900">{order.comment}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Order History</h2>
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <StatusBadge status={entry.status} />
                    <p className="text-sm text-gray-600 mt-1">
                      by {entry.employee.firstName} {entry.employee.lastName}
                    </p>
                    {entry.comment && (
                      <p className="text-sm text-gray-700 mt-1">{entry.comment}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-gray-500 text-center py-4">No history available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};