import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from '../ui/Table';
import { Order } from '../../types';

interface OrderTableProps {
  orders: Order[];
  loading: boolean;
  onStatusChange: (orderId: number, status: string) => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  loading,
  onStatusChange,
}) => {
  const navigate = useNavigate();

  const columns = [
    {
      key: 'id',
      title: 'ID',
      render: (value: number) => `#${value}`,
    },
    {
      key: 'customer',
      title: 'Client',
      render: (customer: any) => `${customer.firstName} ${customer.lastName}`,
    },
    {
      key: 'createdAt',
      title: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string, row: Order) => (
        <select
          value={value}
          onChange={(e) => onStatusChange(row.id, e.target.value)}
          className={`border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
            value === 'completed' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          disabled={value === 'completed'}
        >
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      ),
    },
    {
      key: 'totalPrice',
      title: 'Total',
      render: (value: number) => `${value.toFixed(2)} BYN`,
    },
    {
      key: 'comment',
      title: 'Comment',
      render: (value: string) => value || '-',
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: Order) => (
        <button
          onClick={() => navigate(`/orders/${row.id}`)}
          className="text-blue-600 hover:text-blue-900 font-medium"
        >
          View Details
        </button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={orders}
      loading={loading}
      emptyMessage="No orders found"
    />
  );
};