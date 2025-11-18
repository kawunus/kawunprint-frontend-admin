import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { filamentsApi } from '../api/filaments';
import { Order, OrderHistory, OrderStatus } from '../types';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/orders/StatusBadge';
import { formatLocalDateTime } from '../utils/datetime';
import { useTranslation } from 'react-i18next';
import { useFilaments } from '../hooks/useFilaments';
import { getUserIdFromToken } from '../utils/jwt';

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { filaments } = useFilaments();
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status change modal states
  const [changingStatus, setChangingStatus] = useState<{ currentStatusId: number; newStatusId: number } | null>(null);
  const [statusChangeComment, setStatusChangeComment] = useState<string>('');
  
  // Filament consumption modal state (for status 12)
  const [consumingFilament, setConsumingFilament] = useState<boolean>(false);
  const [selectedFilamentId, setSelectedFilamentId] = useState<number | ''>('');
  const [gramsUsed, setGramsUsed] = useState<string>('');
  const [filamentComment, setFilamentComment] = useState<string>('');
  const [filamentError, setFilamentError] = useState<string>('');
  const [filamentSearch, setFilamentSearch] = useState<string>('');
  
  // Additional info modal state (for status 10)
  const [requestingInfo, setRequestingInfo] = useState<boolean>(false);
  const [infoComment, setInfoComment] = useState<string>('');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  // Edit modal state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedOrder, setEditedOrder] = useState<{ totalPrice: number; comment: string } | null>(null);
  
  // Filament filter states
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<number | ''>('');
  const [filamentTypes, setFilamentTypes] = useState<any[]>([]);


  const statusNameById = (id?: number): string => {
    if (id == null) return '';
    return orderStatuses.find(s => s.id === id)?.description || String(id);
  };

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        const [orderData, historyData, statusesData] = await Promise.all([
          ordersApi.getOrderById(Number(id)),
          ordersApi.getOrderHistory(Number(id)),
          ordersApi.getOrderStatuses(),
        ]);
        setOrder(orderData);
        setHistory(historyData);
        setOrderStatuses(statusesData);
      } catch (err) {
        setError('Failed to fetch order details');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [id]);

  // Load filament types for filtering
  useEffect(() => {
    const fetchFilamentTypes = async () => {
      try {
        const types = await filamentsApi.getTypes();
        setFilamentTypes(types);
      } catch (err) {
        console.error('Failed to load filament types:', err);
      }
    };
    fetchFilamentTypes();
  }, []);

  const refreshOrderData = async () => {
    try {
      const [orderData, historyData] = await Promise.all([
        ordersApi.getOrderById(Number(id)),
        ordersApi.getOrderHistory(Number(id)),
      ]);
      setOrder(orderData);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to refresh order:', err);
    }
  };

  const handleStatusChange = (currentStatusId: number, newStatusId: number) => {
    // Special handling for status 12 (Потрачен филамент)
    if (newStatusId === 12) {
      setConsumingFilament(true);
      setSelectedFilamentId('');
      setGramsUsed('');
      setFilamentComment('');
      setFilamentError('');
      return;
    }
    
    // Special handling for status 10 (Запрошена дополнительная информация)
    if (newStatusId === 10) {
      setRequestingInfo(true);
      setInfoComment('');
      return;
    }
    
    // Default status change with comment
    setChangingStatus({ currentStatusId, newStatusId });
    setStatusChangeComment('');
  };

  const confirmStatusChange = async () => {
    if (!changingStatus || !order) return;
    try {
      const employeeId = getUserIdFromToken();
      
      // Update order status
      await ordersApi.updateOrder(order.id, {
        employeeId,
        statusId: changingStatus.newStatusId,
        totalPrice: order.totalPrice,
        comment: order.comment || ''
      });
      
      // Add history entry with comment
      await ordersApi.addOrderHistory(order.id, {
        statusId: changingStatus.newStatusId,
        comment: statusChangeComment || ''
      });
      
      setChangingStatus(null);
      setStatusChangeComment('');
      await refreshOrderData();
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const confirmFilamentConsumption = async () => {
    if (!order) return;
    
    // Validation
    if (!selectedFilamentId) {
      setFilamentError('Выберите филамент');
      return;
    }
    
    const grams = Number(gramsUsed);
    if (!gramsUsed || isNaN(grams) || grams <= 0) {
      setFilamentError('Введите корректное количество грамм');
      return;
    }
    
    const filament = filaments.find(f => f.id === selectedFilamentId);
    if (!filament) {
      setFilamentError('Филамент не найден');
      return;
    }
    
    if (filament.residue < grams) {
      setFilamentError(`Недостаточно филамента. Доступно: ${filament.residue}г`);
      return;
    }
    
    try {
      await ordersApi.consumeFilament(order.id, {
        filamentId: Number(selectedFilamentId),
        gramsUsed: grams,
        comment: filamentComment || undefined
      });
      
      setConsumingFilament(false);
      setSelectedFilamentId('');
      setGramsUsed('');
      setFilamentComment('');
      setFilamentError('');
      setFilamentSearch('');
      await refreshOrderData();
    } catch (err: any) {
      setFilamentError(err?.response?.data?.message || err?.message || 'Ошибка при потреблении филамента');
    }
  };

  const confirmRequestInfo = async () => {
    if (!order) return;
    
    try {
      const employeeId = getUserIdFromToken();
      
      // Update order status to 10 (Запрошена дополнительная информация)
      await ordersApi.updateOrder(order.id, {
        employeeId,
        statusId: 10,
        totalPrice: order.totalPrice,
        comment: order.comment || ''
      });
      
      // Add history entry with comment
      await ordersApi.addOrderHistory(order.id, {
        statusId: 10,
        comment: infoComment || 'Запрошена дополнительная информация'
      });
      
      setRequestingInfo(false);
      setInfoComment('');
      await refreshOrderData();
    } catch (err) {
      console.error('Failed to request additional info:', err);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    try {
      await ordersApi.deleteOrder(order.id);
      navigate('/orders');
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  const handleEdit = () => {
    if (!order) return;
    setEditedOrder({
      totalPrice: order.totalPrice,
      comment: order.comment || ''
    });
    setIsEditing(true);
  };

  const confirmEdit = async () => {
    if (!order || !editedOrder) return;
    try {
      const employeeId = getUserIdFromToken();
      await ordersApi.updateOrder(order.id, {
        employeeId,
        statusId: order.statusId || 1,
        totalPrice: editedOrder.totalPrice,
        comment: editedOrder.comment
      });
      
      // Add history entry with status 8 (изменена информация)
      await ordersApi.addOrderHistory(order.id, {
        statusId: 8,
        comment: `Цена изменена с ${order.totalPrice} на ${editedOrder.totalPrice}; Описание изменено`
      });
      
      setIsEditing(false);
      setEditedOrder(null);
      await refreshOrderData();
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

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
          <Button
            onClick={() => {
              if (window.history.length > 1) navigate(-1); else navigate('/orders');
            }}
            variant="secondary"
          >
            {t('common.back') || 'Back'}
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{t('orders.title') || 'Orders'} #{order.id}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleEdit} variant="secondary">
            {t('common.edit') || 'Edit'}
          </Button>
          <Button onClick={() => setShowDeleteModal(true)} variant="danger">
            {t('common.delete') || 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('orders.info') || 'Order Information'}</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('orders.customer') || 'Customer'}:</span>
              <span>{order.customer.firstName} {order.customer.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <a href={`mailto:${order.customer.email}`} className="text-blue-600 hover:underline">
                {order.customer.email}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('orders.phone') || 'Phone'}:</span>
              <span>{order.customer.phoneNumber}</span>
            </div>
            {order.customer.telegramAccount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Telegram:</span>
                <a 
                  href={`https://t.me/${order.customer.telegramAccount.startsWith('@') ? order.customer.telegramAccount.slice(1) : order.customer.telegramAccount}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {order.customer.telegramAccount.startsWith('@') ? order.customer.telegramAccount : `@${order.customer.telegramAccount}`}
                </a>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">{t('orders.created') || 'Created'}:</span>
              <span>{formatLocalDateTime(order.createdAt)}</span>
            </div>
            {order.completedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orders.completed') || 'Completed'}:</span>
                <span>{formatLocalDateTime(order.completedAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">{t('orders.total') || 'Total Price'}:</span>
              <span className="font-semibold">{order.totalPrice.toFixed(2)} BYN</span>
            </div>
          </div>

          {order.comment && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-600">{t('orders.comment') || 'Comment'}</h3>
              <p className="mt-1 text-sm text-gray-900">{order.comment}</p>
            </div>
          )}

          {/* Status Change Dropdown */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t('orders.status') || 'Status'}</h3>
            <select
              value={order.statusId || ''}
              onChange={(e) => {
                const newStatusId = Number(e.target.value);
                if (order.statusId != null && newStatusId !== order.statusId) {
                  handleStatusChange(order.statusId, newStatusId);
                }
              }}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!orderStatuses.length}
            >
              <option value="" disabled>{statusNameById(order.statusId) || 'Select status'}</option>
              {orderStatuses.filter(status => status.id !== 8).map(status => (
                <option key={status.id} value={status.id}>{status.description}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('orders.history') || 'Order History'}</h2>
          <div className="space-y-4">
            {history.map((entry) => {
              const statusText = entry.status || statusNameById(entry.statusId);
              return (
              <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <StatusBadge status={statusText} />
                    <p className="text-sm text-gray-600 mt-1">{t('orders.by') || 'by'} {entry.employee.firstName} {entry.employee.lastName}</p>
                    {entry.comment && (
                      <p className="text-sm text-gray-700 mt-1">{entry.comment}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatLocalDateTime(entry.createdAt)}
                  </span>
                </div>
              </div>
              );
            })}
            {history.length === 0 && (
              <p className="text-gray-500 text-center py-4">{t('orders.noHistory') || 'No history available'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {changingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setChangingStatus(null); setStatusChangeComment(''); }} />
          <div className="bg-white rounded shadow-lg z-50 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {t('orders.changeStatusTitle') || 'Change Order Status'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  {t('orders.newStatus') || 'New Status'}: <strong>{statusNameById(changingStatus.newStatusId)}</strong>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.statusComment') || 'Comment (optional)'}
                </label>
                <textarea
                  placeholder={t('orders.statusCommentPlaceholder') || 'Add a comment...'}
                  value={statusChangeComment}
                  onChange={e => setStatusChangeComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button onClick={confirmStatusChange}>
                {t('common.confirm') || 'Confirm'}
              </Button>
              <Button variant="secondary" onClick={() => { setChangingStatus(null); setStatusChangeComment(''); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filament Consumption Modal (Status 12) */}
      {consumingFilament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setConsumingFilament(false); setFilamentError(''); setFilamentSearch(''); setSelectedTypeFilter(''); }} />
          <div className="bg-white rounded shadow-lg z-50 w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              Потребление филамента
            </h2>
            
            <div className="space-y-4">
              {/* Filters Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Поиск по цвету
                  </label>
                  <input
                    type="text"
                    placeholder="Поиск по цвету..."
                    value={filamentSearch}
                    onChange={e => setFilamentSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип филамента
                  </label>
                  <select
                    value={selectedTypeFilter}
                    onChange={e => setSelectedTypeFilter(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Все типы</option>
                    {filamentTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filament Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Филамент *
                </label>
                <select
                  value={selectedFilamentId}
                  onChange={e => setSelectedFilamentId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите филамент</option>
                  {filaments
                    .filter(f => {
                      // Filter by search text
                      if (filamentSearch && !f.color.toLowerCase().includes(filamentSearch.toLowerCase())) {
                        return false;
                      }
                      // Filter by type
                      if (selectedTypeFilter && f.type.id !== selectedTypeFilter) {
                        return false;
                      }
                      return true;
                    })
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.type.name} - {f.color} (Остаток: {f.residue}г, {f.pricePerGram} BYN/г)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Количество грамм *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Введите количество грамм"
                  value={gramsUsed}
                  onChange={e => setGramsUsed(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedFilamentId && gramsUsed && !isNaN(Number(gramsUsed)) && (
                  <p className="mt-2 text-sm text-gray-600">
                    Стоимость: {(Number(gramsUsed) * (filaments.find(f => f.id === selectedFilamentId)?.pricePerGram || 0)).toFixed(2)} BYN
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Комментарий (необязательно)
                </label>
                <textarea
                  placeholder="Дополнительная информация..."
                  value={filamentComment}
                  onChange={e => setFilamentComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {filamentError && (
                <div className="text-red-600 text-sm">{filamentError}</div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button onClick={confirmFilamentConsumption}>
                Подтвердить
              </Button>
              <Button variant="secondary" onClick={() => { setConsumingFilament(false); setFilamentError(''); setFilamentSearch(''); setSelectedTypeFilter(''); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Additional Info Modal (Status 10) */}
      {requestingInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setRequestingInfo(false); setInfoComment(''); }} />
          <div className="bg-white rounded shadow-lg z-50 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              Запросить дополнительную информацию
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Комментарий
                </label>
                <textarea
                  placeholder="Какая информация требуется?"
                  value={infoComment}
                  onChange={e => setInfoComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button onClick={confirmRequestInfo}>
                {t('common.confirm') || 'Confirm'}
              </Button>
              <Button variant="secondary" onClick={() => { setRequestingInfo(false); setInfoComment(''); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-white rounded-lg shadow-xl z-50 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{t('common.confirm') || 'Confirm'}</h3>
            <p className="text-gray-700 mb-6">
              {t('orders.confirmDelete', { id: order?.id }) || `Are you sure you want to delete order #${order?.id}?`}
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleDelete}>
                {t('common.delete') || 'Delete'}
              </Button>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {isEditing && editedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setIsEditing(false); setEditedOrder(null); }} />
          <div className="bg-white rounded shadow-lg z-50 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {t('orders.editTitle') || 'Edit Order'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.totalPrice') || 'Total Price'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedOrder.totalPrice}
                  onChange={e => setEditedOrder({ ...editedOrder, totalPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.comment') || 'Comment'}
                </label>
                <textarea
                  value={editedOrder.comment}
                  onChange={e => setEditedOrder({ ...editedOrder, comment: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button onClick={confirmEdit}>
                {t('common.save') || 'Save'}
              </Button>
              <Button variant="secondary" onClick={() => { setIsEditing(false); setEditedOrder(null); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};