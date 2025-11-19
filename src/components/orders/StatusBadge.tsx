import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase();
    const statusColors: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'shipped': 'bg-purple-100 text-purple-800',
      'в процессе': 'bg-blue-100 text-blue-800',
      'завершён': 'bg-green-100 text-green-800',
      'отменён': 'bg-red-100 text-red-800',
      'ожидает оплаты': 'bg-yellow-100 text-yellow-800',
      'отправлен': 'bg-purple-100 text-purple-800',
      'принят': 'bg-blue-100 text-blue-800',
      'изменена информация': 'bg-amber-100 text-amber-800',
      'запрошена дополнительная информация': 'bg-yellow-100 text-yellow-800',
      'распечатано': 'bg-purple-100 text-purple-800',
      'потрачен филамент': 'bg-amber-100 text-amber-800',
      'в проектировании': 'bg-indigo-100 text-indigo-800',
    };

    return statusColors[normalized] || 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  );
};