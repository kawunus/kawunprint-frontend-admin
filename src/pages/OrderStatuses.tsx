import React, { useState, useEffect } from 'react';
import { ordersApi } from '../api/orders';
import { OrderStatus } from '../types';
import { Button } from '../components/ui/Button';

export const OrderStatuses: React.FC = () => {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<OrderStatus | null>(null);
  const [description, setDescription] = useState('');

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getOrderStatuses();
      setStatuses(data);
    } catch (err) {
      setError('Ошибка загрузки статусов');
      console.error('Error fetching statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleSave = async () => {
    try {
      if (editingStatus) {
        // Update existing
        await ordersApi.updateOrderStatus(editingStatus.id, { description });
      } else {
        // Create new
        await ordersApi.createOrderStatus({ description });
      }
      setShowModal(false);
      setDescription('');
      setEditingStatus(null);
      fetchStatuses();
    } catch (err) {
      console.error('Error saving status:', err);
      alert('Ошибка сохранения статуса');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить этот статус?')) return;
    try {
      await ordersApi.deleteOrderStatus(id);
      fetchStatuses();
    } catch (err) {
      console.error('Error deleting status:', err);
      alert('Ошибка удаления статуса');
    }
  };

  const openModal = (status?: OrderStatus) => {
    if (status) {
      setEditingStatus(status);
      setDescription(status.description);
    } else {
      setEditingStatus(null);
      setDescription('');
    }
    setShowModal(true);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Статусы заказов</h1>
        <Button onClick={() => openModal()} variant="primary">
          Добавить статус
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {statuses.map((status) => (
                <tr key={status.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{status.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {status.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button
                      onClick={() => openModal(status)}
                      variant="secondary"
                      size="sm"
                    >
                      Изменить
                    </Button>
                    <Button
                      onClick={() => handleDelete(status.id)}
                      variant="danger"
                      size="sm"
                    >
                      Удалить
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setShowModal(false)}
          />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingStatus ? 'Редактировать статус' : 'Новый статус'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Например: в процессе"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleSave} variant="primary">
                Сохранить
              </Button>
              <Button onClick={() => setShowModal(false)} variant="secondary">
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
