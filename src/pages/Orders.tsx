import React, { useEffect, useMemo, useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useFilaments } from '../hooks/useFilaments';
import { filamentsApi } from '../api/filaments';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTranslation } from 'react-i18next';
import { formatLocalDateTime, parseDbDate } from '../utils/datetime';
import { ordersApi } from '../api/orders';
import { getUserIdFromToken } from '../utils/jwt';
import { usersApi } from '../api/users';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { FileUpload } from '../components/files/FileUpload';
import { filesApi } from '../api/files';

export const Orders: React.FC = () => {
  const { orders, orderStatuses, loading, error, refreshOrders } = useOrders();
  const { filaments } = useFilaments();
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const isRu = i18n.language?.startsWith('ru');
  
  // Users list for customer selection
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Filters toolbar state
  const [search, setSearch] = useState<string>('');
  const [appliedStatusId, setAppliedStatusId] = useState<number | ''>('');
  const [appliedMinTotal, setAppliedMinTotal] = useState<string>('');
  const [appliedMaxTotal, setAppliedMaxTotal] = useState<string>('');
  const [appliedDateFrom, setAppliedDateFrom] = useState<string>('');
  const [appliedDateTo, setAppliedDateTo] = useState<string>('');
  const [appliedCustomer, setAppliedCustomer] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'status' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Filters modal temp state
  const [modalStatusId, setModalStatusId] = useState<number | ''>('');
  const [modalMinTotal, setModalMinTotal] = useState<string>('');
  const [modalMaxTotal, setModalMaxTotal] = useState<string>('');
  const [modalDateFrom, setModalDateFrom] = useState<string>('');
  const [modalDateTo, setModalDateTo] = useState<string>('');
  const [modalCustomer, setModalCustomer] = useState<string>('');

  // Edit/Create modal state
  const [editingOrder, setEditingOrder] = useState<{ id?: number; customerId?: number; statusId?: number; totalPrice?: number; comment?: string } | null>(null);
  const [originalOrder, setOriginalOrder] = useState<{ id?: number; customerId?: number; statusId?: number; totalPrice?: number; comment?: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [orderEditError, setOrderEditError] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  
  // File upload state for new orders
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  
  // Status change modal state
  const [changingStatus, setChangingStatus] = useState<{ orderId: number; currentStatusId: number; newStatusId: number } | null>(null);
  const [statusChangeComment, setStatusChangeComment] = useState<string>('');
  
  // Filament consumption modal state (for status 12)
  const [consumingFilament, setConsumingFilament] = useState<{ orderId: number } | null>(null);
  const [selectedFilamentId, setSelectedFilamentId] = useState<number | ''>('');
  const [gramsUsed, setGramsUsed] = useState<string>('');
  const [filamentComment, setFilamentComment] = useState<string>('');
  const [filamentError, setFilamentError] = useState<string>('');
  const [filamentSearch, setFilamentSearch] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<number | ''>('');
  const [filamentTypes, setFilamentTypes] = useState<any[]>([]);
  
  // Additional info modal state (for status 10)
  const [requestingInfo, setRequestingInfo] = useState<{ orderId: number } | null>(null);
  const [infoComment, setInfoComment] = useState<string>('');
  
  // Design price modal state (for status 13)
  const [addingDesignPrice, setAddingDesignPrice] = useState<{ orderId: number; currentPrice: number } | null>(null);
  const [designPrice, setDesignPrice] = useState<string>('');
  const [designComment, setDesignComment] = useState<string>('');
  const [designPriceError, setDesignPriceError] = useState<string>('');
  
  // Delete modal state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'new' | 'inProgress' | 'completed'>('new');

  // Load users when modal opens
  useEffect(() => {
    if (editingOrder && isCreating && users.length === 0 && !usersLoading) {
      setUsersLoading(true);
      usersApi.getAll()
        .then(setUsers)
        .catch(err => console.error('Failed to load users:', err))
        .finally(() => setUsersLoading(false));
    }
  }, [editingOrder, isCreating, users.length, usersLoading]);

  // Load filament types for filtering
  useEffect(() => {
    filamentsApi.getTypes()
      .then(setFilamentTypes)
      .catch(err => console.error('Failed to load filament types:', err));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFilters(false);
        setDeleteId(null);
        setEditingOrder(null);
        setOriginalOrder(null);
        setIsCreating(false);
        setChangingStatus(null);
        setStatusChangeComment('');
        setConsumingFilament(null);
        setFilamentError('');
        setFilamentSearch('');
        setRequestingInfo(null);
        setInfoComment('');
        setUserSearch('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const statusNameById = useMemo(() => {
    const map = new Map<number, string>();
    orderStatuses.forEach(s => map.set(s.id, s.description));
    return (id?: number, fallback?: string) => (id != null ? map.get(id) : undefined) || fallback || '';
  }, [orderStatuses]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    
    // Tab filter
    if (activeTab === 'new') {
      list = list.filter(o => {
        const statusName = statusNameById(o.statusId, o.status)?.toLowerCase();
        return statusName === 'принят' || statusName === 'принято';
      });
    } else if (activeTab === 'inProgress') {
      list = list.filter(o => {
        const statusName = statusNameById(o.statusId, o.status)?.toLowerCase();
        return statusName !== 'принят' && statusName !== 'принято' && statusName !== 'завершён' && statusName !== 'завершено' && statusName !== 'отменён' && statusName !== 'отменено';
      });
    } else if (activeTab === 'completed') {
      list = list.filter(o => {
        const statusName = statusNameById(o.statusId, o.status)?.toLowerCase();
        return statusName === 'завершён' || statusName === 'завершено' || statusName === 'отменён' || statusName === 'отменено';
      });
    }
    
    // Status filter
    if (appliedStatusId !== '') {
      list = list.filter(o => (o.statusId ?? -1) === appliedStatusId);
    }
    
    // Customer filter
    if (appliedCustomer.trim()) {
      const q = appliedCustomer.trim().toLowerCase();
      list = list.filter(o => {
        const name = `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.toLowerCase();
        const email = (o.customer.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    
    // Date filters
    if (appliedDateFrom) {
      const fromTs = new Date(appliedDateFrom).getTime();
      list = list.filter(o => (parseDbDate(o.createdAt)?.getTime() ?? 0) >= fromTs);
    }
    if (appliedDateTo) {
      const toTs = new Date(appliedDateTo).getTime();
      list = list.filter(o => (parseDbDate(o.createdAt)?.getTime() ?? 0) <= toTs);
    }
    
    // Price filters
    if (appliedMinTotal) {
      const min = Number(appliedMinTotal);
      if (!Number.isNaN(min)) list = list.filter(o => o.totalPrice >= min);
    }
    if (appliedMaxTotal) {
      const max = Number(appliedMaxTotal);
      if (!Number.isNaN(max)) list = list.filter(o => o.totalPrice <= max);
    }
    
    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o => {
        const name = `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.toLowerCase();
        const email = (o.customer.email || '').toLowerCase();
        const idMatch = String(o.id).includes(q);
        return name.includes(q) || email.includes(q) || idMatch;
      });
    }
    
    return list;
  }, [orders, activeTab, statusNameById, appliedStatusId, appliedCustomer, appliedDateFrom, appliedDateTo, appliedMinTotal, appliedMaxTotal, search]);

  const sorted = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...filteredOrders].sort((a, b) => {
      if (sortBy === 'date') {
        const ad = parseDbDate(a.createdAt)?.getTime() ?? 0;
        const bd = parseDbDate(b.createdAt)?.getTime() ?? 0;
        return (ad - bd) * dir;
      }
      if (sortBy === 'total') {
        return (a.totalPrice - b.totalPrice) * dir;
      }
      if (sortBy === 'status') {
        const nameA = statusNameById(a.statusId, a.status).toLowerCase();
        const nameB = statusNameById(b.statusId, b.status).toLowerCase();
        return nameA.localeCompare(nameB) * dir;
      }
      if (sortBy === 'customer') {
        const A = `${a.customer.firstName || ''} ${a.customer.lastName || ''}`.trim().toLowerCase();
        const B = `${b.customer.firstName || ''} ${b.customer.lastName || ''}`.trim().toLowerCase();
        return A.localeCompare(B) * dir;
      }
      return 0;
    });
  }, [filteredOrders, sortBy, sortOrder, statusNameById]);

  const clearAllFilters = () => {
    setSearch('');
    setAppliedStatusId('');
    setAppliedCustomer('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
    setAppliedMinTotal('');
    setAppliedMaxTotal('');
  };

  const hasActiveFilters = search || appliedStatusId !== '' || appliedCustomer || appliedDateFrom || appliedDateTo || appliedMinTotal || appliedMaxTotal;

  const handleStatusChange = (orderId: number, currentStatusId: number, newStatusId: number) => {
    // Special handling for status 12 (Потрачен филамент)
    if (newStatusId === 12) {
      setConsumingFilament({ orderId });
      setSelectedFilamentId('');
      setGramsUsed('');
      setFilamentComment('');
      setFilamentError('');
      setFilamentSearch('');
      setSelectedTypeFilter('');
      return;
    }
    
    // Special handling for status 10 (Запрошена дополнительная информация)
    if (newStatusId === 10) {
      setRequestingInfo({ orderId });
      setInfoComment('');
      return;
    }
    
    // Special handling for status 13 (В проектировании)
    if (newStatusId === 13) {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        console.error('Order not found');
        return;
      }
      setAddingDesignPrice({ orderId, currentPrice: order.totalPrice });
      setDesignPrice('');
      setDesignComment('');
      setDesignPriceError('');
      return;
    }
    
    // Default status change with comment
    setChangingStatus({ orderId, currentStatusId, newStatusId });
    setStatusChangeComment('');
  };

  const confirmStatusChange = async () => {
    if (!changingStatus) return;
    try {
      const employeeId = getUserIdFromToken();
      const order = orders.find(o => o.id === changingStatus.orderId);
      if (!order) {
        console.error('Order not found');
        return;
      }
      
      // Check if new status is "completed" or "cancelled"
      const statusName = orderStatuses.find(s => s.id === changingStatus.newStatusId)?.description?.toLowerCase() || '';
      const isCompleted = statusName.includes('завершён') || statusName.includes('завершено') || statusName.includes('completed');
      const isCancelled = statusName.includes('отменён') || statusName.includes('отменено') || statusName.includes('cancelled');
      
      // Set completedAt if status is completed or cancelled
      const completedAt = (isCompleted || isCancelled) ? new Date().toISOString() : null;
      
      // Update order status
      await ordersApi.updateOrder(changingStatus.orderId, {
        employeeId,
        statusId: changingStatus.newStatusId,
        totalPrice: order.totalPrice,
        comment: order.comment || '',
        completedAt
      });
      
      // Add history entry with comment
      await ordersApi.addOrderHistory(changingStatus.orderId, {
        statusId: changingStatus.newStatusId,
        comment: statusChangeComment || ''
      });
      
      setChangingStatus(null);
      setStatusChangeComment('');
      refreshOrders();
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const confirmFilamentConsumption = async () => {
    if (!consumingFilament) return;
    
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
      await ordersApi.consumeFilament(consumingFilament.orderId, {
        filamentId: Number(selectedFilamentId),
        gramsUsed: grams,
        comment: filamentComment || undefined
      });
      
      setConsumingFilament(null);
      setSelectedFilamentId('');
      setGramsUsed('');
      setFilamentComment('');
      setFilamentError('');
      setFilamentSearch('');
      refreshOrders();
    } catch (err: any) {
      setFilamentError(err?.response?.data?.message || err?.message || 'Ошибка при потреблении филамента');
    }
  };

  const confirmRequestInfo = async () => {
    if (!requestingInfo) return;
    
    try {
      const employeeId = getUserIdFromToken();
      const order = orders.find(o => o.id === requestingInfo.orderId);
      if (!order) {
        console.error('Order not found');
        return;
      }
      
      // Update order status to 10 (Запрошена дополнительная информация)
      await ordersApi.updateOrder(requestingInfo.orderId, {
        employeeId,
        statusId: 10,
        totalPrice: order.totalPrice,
        comment: order.comment || ''
      });
      
      // Add history entry with comment
      await ordersApi.addOrderHistory(requestingInfo.orderId, {
        statusId: 10,
        comment: infoComment || 'Запрошена дополнительная информация'
      });
      
      setRequestingInfo(null);
      setInfoComment('');
      refreshOrders();
    } catch (err) {
      console.error('Failed to request additional info:', err);
    }
  };

  const confirmAddDesignPrice = async () => {
    if (!addingDesignPrice) return;
    
    // Validation
    const price = Number(designPrice);
    if (!designPrice || isNaN(price) || price <= 0) {
      setDesignPriceError('Введите корректную цену');
      return;
    }
    
    try {
      const employeeId = getUserIdFromToken();
      const order = orders.find(o => o.id === addingDesignPrice.orderId);
      if (!order) {
        console.error('Order not found');
        return;
      }
      
      const newTotalPrice = order.totalPrice + price;
      
      // Update order status to 13 and add design price
      await ordersApi.updateOrder(addingDesignPrice.orderId, {
        employeeId,
        statusId: 13,
        totalPrice: newTotalPrice,
        comment: order.comment || ''
      });
      
      // Add history entry with comment about design price
      const comment = designComment 
        ? `Добавлена стоимость проектирования: ${price.toFixed(2)} BYN. ${designComment}`
        : `Добавлена стоимость проектирования: ${price.toFixed(2)} BYN`;
      
      await ordersApi.addOrderHistory(addingDesignPrice.orderId, {
        statusId: 13,
        comment
      });
      
      setAddingDesignPrice(null);
      setDesignPrice('');
      setDesignComment('');
      setDesignPriceError('');
      refreshOrders();
    } catch (err) {
      console.error('Failed to add design price:', err);
      setDesignPriceError('Ошибка при добавлении цены');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const y = window.scrollY;
      await ordersApi.deleteOrder(id);
      setDeleteId(null);
      refreshOrders();
      requestAnimationFrame(() => window.scrollTo(0, y));
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  const handleFileSelect = (file: File) => {
    console.log('📎 File selected:', file);
    setUploadedFiles((prevFiles) => [...prevFiles, file]);
  };

  useEffect(() => {
    if (!isCreating) {
      setUploadedFiles([]); // Clear uploaded files when modal is closed
    }
  }, [isCreating]);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-red-700">{error}</div>
          <Button onClick={refreshOrders} className="mt-2">
            {t('common.retry') || (isRu ? 'Повторить' : 'Retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.title') || 'Orders'}</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('orders.searchPlaceholder') || (isRu ? 'Поиск заказа' : 'Search order')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 text-sm py-1.5 h-9 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="sr-only">{t('filters.sortBy') || 'Sort by'}</label>
            <select className="border rounded px-2 py-1 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="date">{t('orders.sortField.date') || 'Date'}</option>
              <option value="total">{t('orders.sortField.total') || 'Total'}</option>
              <option value="status">{t('orders.sortField.status') || 'Status'}</option>
              <option value="customer">{t('orders.sortField.customer') || 'Customer'}</option>
            </select>
            <button className="px-2 py-1 text-sm border rounded" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' 
                ? (isRu ? (t('filters.orderDisplayAsc') || 'А → Я') : (t('filters.orderDisplayAsc') || 'A → Z'))
                : (isRu ? (t('filters.orderDisplayDesc') || 'Я → А') : (t('filters.orderDisplayDesc') || 'Z → A'))
              }
            </button>
          </div>

          <Button aria-label="filters" size="sm" onClick={() => {
            if (!showFilters) {
              setModalStatusId(appliedStatusId);
              setModalCustomer(appliedCustomer);
              setModalDateFrom(appliedDateFrom);
              setModalDateTo(appliedDateTo);
              setModalMinTotal(appliedMinTotal);
              setModalMaxTotal(appliedMaxTotal);
            }
            setShowFilters(s => !s);
          }} variant="secondary">{t('filters.open') || 'Filters'}</Button>
          {isAdmin && (
            <Button variant="primary" size="sm" onClick={() => {
              setEditingOrder({ totalPrice: 0, statusId: 6 });
              setIsCreating(true);
            }}>
              <svg className="w-4 h-4 mr-1 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('orders.new') || 'New order'}
            </Button>
          )}
          {hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={clearAllFilters}>{t('filters.clear') || 'Clear'}</Button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('orders.tabs.new') || 'Новые'}
            </button>
            <button
              onClick={() => setActiveTab('inProgress')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'inProgress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('orders.tabs.inProgress') || 'В работе'}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'completed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('orders.tabs.completed') || 'Завершённые'}
            </button>
          </nav>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
        ) : (
          <div className="space-y-3">
            {sorted.map(order => {
              const currentStatusId = order.statusId ?? orderStatuses.find(s => s.description.toLowerCase() === String(order.status).toLowerCase())?.id;
              const currentStatusName = statusNameById(currentStatusId, order.status);
              const isCompleted = currentStatusName && currentStatusName.toLowerCase() === 'завершён';
              const isCancelled = currentStatusName && currentStatusName.toLowerCase() === 'отменён';
              const isStatusLocked = isCompleted || isCancelled;
              
              return (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="min-w-0">
                      <div className="font-medium truncate">#{order.id} · {order.customer.firstName} {order.customer.lastName}</div>
                      <div className="text-sm text-gray-500 truncate">{formatLocalDateTime(order.createdAt, i18n.language)} · {order.customer.email}</div>
                      <div className="text-sm text-gray-500 truncate">{t('orders.total') || 'Total'}: {order.totalPrice.toFixed(2)} BYN</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={currentStatusId != null ? String(currentStatusId) : ''}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isNaN(value)) return;
                        if (currentStatusId != null) {
                          handleStatusChange(order.id, currentStatusId, value);
                        }
                      }}
                      className={`border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isStatusLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      disabled={isStatusLocked || !orderStatuses.length}
                    >
                      <option value="" disabled>{currentStatusName || (t('orders.status.select') || 'Select status')}</option>
                      {orderStatuses.filter(status => status.id !== 8).map(status => (
                        <option key={status.id} value={status.id}>{status.description}</option>
                      ))}
                    </select>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="secondary" onClick={() => window.location.assign(`/orders/${order.id}`)}>{t('common.details') || 'Details'}</Button>
                      {isAdmin && (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => { 
                            const orderData = {
                              id: order.id,
                              customerId: order.customer.id,
                              statusId: order.statusId, 
                              totalPrice: order.totalPrice, 
                              comment: order.comment 
                            };
                            setEditingOrder(orderData); 
                            setOriginalOrder(orderData);
                            setIsCreating(false); 
                          }}>{t('common.edit') || 'Edit'}</Button>
                          <Button size="sm" variant="danger" onClick={() => setDeleteId(order.id)}>{t('common.delete') || 'Delete'}</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {sorted.length === 0 && (
              <p className="text-gray-500 text-center py-6">{t('table.noData') || 'No data available'}</p>
            )}
          </div>
        )}
      </div>

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowFilters(false)} />
          <div className="bg-white rounded-lg shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('filters.title') || 'Filters'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.filters.status') || 'Status'}
                  </label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={modalStatusId === '' ? '' : String(modalStatusId)}
                    onChange={(e) => setModalStatusId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">{t('orders.status.all') || 'All'}</option>
                    {orderStatuses.filter(status => status.id !== 8 && status.id !== 12).map(status => (
                      <option key={status.id} value={status.id}>{status.description}</option>
                    ))}
                  </select>
                </div>

                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.filter.customer') || 'Customer'}
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={modalCustomer}
                    onChange={(e) => setModalCustomer(e.target.value)}
                    placeholder={t('orders.filter.customerPlaceholder') || (isRu ? 'имя или email' : 'name or email')}
                  />
                </div>

                {/* Date from */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.filter.dateFrom') || 'Date from'}
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={modalDateFrom}
                    onChange={(e) => setModalDateFrom(e.target.value)}
                  />
                </div>

                {/* Date to */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.filter.dateTo') || 'Date to'}
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={modalDateTo}
                    onChange={(e) => setModalDateTo(e.target.value)}
                  />
                </div>

                {/* Min total */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.filter.minTotal') || 'Min total'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={modalMinTotal}
                    onChange={(e) => setModalMinTotal(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Max total */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.filter.maxTotal') || 'Max total'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={modalMaxTotal}
                    onChange={(e) => setModalMaxTotal(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setAppliedStatusId(modalStatusId);
                    setAppliedCustomer(modalCustomer);
                    setAppliedDateFrom(modalDateFrom);
                    setAppliedDateTo(modalDateTo);
                    setAppliedMinTotal(modalMinTotal);
                    setAppliedMaxTotal(modalMaxTotal);
                    setShowFilters(false);
                  }}
                >
                  {t('common.apply') || 'Apply'}
                </Button>
                <Button variant="secondary" onClick={() => setShowFilters(false)}>
                  {t('common.cancel') || 'Cancel'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setEditingOrder(null); setOriginalOrder(null); setIsCreating(false); setOrderEditError(''); }} />
          <div className="bg-white rounded shadow-lg z-50 w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {isCreating ? (t('orders.newTitle') || 'New Order') : (t('orders.editTitle') || 'Edit Order')}
            </h2>
            
            {orderEditError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {orderEditError}
              </div>
            )}

            <div className="space-y-4">
              {/* Customer selection - only for creating new orders */}
              {isCreating && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.customer') || 'Customer'} *
                  </label>
                  {usersLoading ? (
                    <div className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder={t('orders.searchCustomer') || 'Search by name or email...'}
                        value={userSearch}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserSearch(e.target.value)}
                      />
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editingOrder.customerId ?? ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            setEditingOrder({ ...editingOrder, customerId: val });
                          }
                        }}
                        required
                        size={5}
                      >
                        <option value="" disabled>{t('orders.selectCustomer') || 'Select customer'}</option>
                        {users
                          .filter(user => {
                            if (!userSearch) return true;
                            const search = userSearch.toLowerCase();
                            return (
                              user.firstName.toLowerCase().includes(search) ||
                              user.lastName.toLowerCase().includes(search) ||
                              user.email.toLowerCase().includes(search)
                            );
                          })
                          .map(user => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.status') || 'Status'} *
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingOrder.statusId ?? ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, statusId: parseInt(e.target.value) })}
                  required
                >
                  <option value="" disabled>{t('orders.status.select') || 'Select status'}</option>
                  {orderStatuses.filter(status => status.id !== 8).map(status => (
                    <option key={status.id} value={status.id}>{status.description}</option>
                  ))}
                </select>
              </div>

              {/* Total Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.totalPrice') || 'Total Price'} *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingOrder.totalPrice ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingOrder({ ...editingOrder, totalPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.comment') || 'Comment'}
                </label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingOrder.comment ?? ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, comment: e.target.value })}
                  placeholder={t('orders.commentPlaceholder') || 'Optional comment...'}
                  rows={3}
                />
              </div>

              {/* File Upload - only for creating new orders */}
              {isCreating && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.uploadFiles') || 'Upload Files'}
                  </label>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    maxSizeMB={20} // 20MB
                  />
                </div>
              )}

              {/* Display uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {t('files.title') || 'Uploaded Files'}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {uploadedFiles.map((file, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Добавляем индикатор загрузки в модальное окно */}
              {isUploadingFiles && (
                <div className="flex justify-center items-center mt-4">
                  <div className="loader" /> {/* Добавьте CSS для анимации */}
                  <span className="ml-2 text-sm text-gray-600">
                    {t('orders.uploadingProgress', {
                      current: uploadProgress.current,
                      total: uploadProgress.total
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    setOrderEditError('');
                    
                    if (isCreating) {
                      console.log('🚀 Starting order creation...');
                      console.log('📦 Uploaded files count:', uploadedFiles.length);
                      console.log('📦 Uploaded files:', uploadedFiles);
                      
                      if (!editingOrder.customerId || !editingOrder.statusId || editingOrder.totalPrice == null) {
                        setOrderEditError(t('orders.fillRequired') || 'Please fill all required fields');
                        return;
                      }
                      const orderData = {
                        customerId: editingOrder.customerId,
                        statusId: editingOrder.statusId,
                        totalPrice: editingOrder.totalPrice,
                        comment: editingOrder.comment || ''
                      };
                      
                      console.log('📝 Creating order with data:', orderData);
                      const createdOrder = await ordersApi.createOrder(orderData);
                      console.log('✅ Order created:', createdOrder);
                      
                      // Upload files if any were selected
                      if (uploadedFiles.length > 0) {
                        console.log(`📤 Starting file upload for ${uploadedFiles.length} files...`);
                        setUploadProgress({ current: 0, total: uploadedFiles.length }); // Инициализируем прогресс
                        setIsUploadingFiles(true); // Включаем индикатор загрузки
                        try {
                          for (let i = 0; i < uploadedFiles.length; i++) {
                            const file = uploadedFiles[i];
                            console.log(`📤 Uploading file ${i + 1}/${uploadedFiles.length}:`, file.name);
                            const uploadedFile = await filesApi.uploadFile(createdOrder.id, file);
                            console.log(`✅ File ${i + 1} uploaded successfully:`, uploadedFile);
                            // Обновляем прогресс загрузки
                            setUploadProgress({ current: i + 1, total: uploadedFiles.length });
                          }
                          console.log('✅ All files uploaded');
                        } catch (fileErr: any) {
                          console.error('❌ File upload error:', fileErr);
                          // Don't block order creation if file upload fails
                        } finally {
                          setIsUploadingFiles(false); // Stop upload indicator
                        }
                      } else {
                        console.log('ℹ️ No files to upload');
                      }
                      
                      // Add initial history entry for order creation
                      await ordersApi.addOrderHistory(createdOrder.id, {
                        statusId: editingOrder.statusId,
                        comment: editingOrder.comment || 'Заказ создан'
                      });
                    } else if (editingOrder.id) {
                      if (!editingOrder.statusId || editingOrder.totalPrice == null) {
                        setOrderEditError(t('orders.fillRequired') || 'Please fill all required fields');
                        return;
                      }
                      const employeeId = getUserIdFromToken();
                      await ordersApi.updateOrder(editingOrder.id, {
                        employeeId,
                        statusId: editingOrder.statusId,
                        totalPrice: editingOrder.totalPrice,
                        comment: editingOrder.comment || ''
                      });
                      
                      // Generate detailed change message
                      const changes: string[] = [];
                      
                      // Track customer change
                      if (originalOrder?.customerId !== editingOrder.customerId) {
                        const oldCustomer = users.find(u => u.id === originalOrder?.customerId);
                        const newCustomer = users.find(u => u.id === editingOrder.customerId);
                        const oldName = oldCustomer ? `${oldCustomer.firstName} ${oldCustomer.lastName}` : 'Unknown';
                        const newName = newCustomer ? `${newCustomer.firstName} ${newCustomer.lastName}` : 'Unknown';
                        changes.push(`Клиент изменён с "${oldName}" на "${newName}"`);
                      }
                      
                      // Track price change
                      if (originalOrder?.totalPrice !== editingOrder.totalPrice) {
                        changes.push(`Цена изменена с ${originalOrder?.totalPrice || 0} на ${editingOrder.totalPrice}`);
                      }
                      
                      // Track comment change
                      if (originalOrder?.comment !== editingOrder.comment) {
                        changes.push(`Описание изменено с "${originalOrder?.comment || ''}" на "${editingOrder.comment || ''}"`);
                      }
                      
                      const changeMessage = changes.length > 0 ? changes.join('; ') : 'Информация изменена';
                      
                      // Add history entry with status "изменена информация" (id=8)
                      await ordersApi.addOrderHistory(editingOrder.id, {
                        statusId: 8,
                        comment: changeMessage
                      });
                    }
                    
                    setEditingOrder(null);
                    setOriginalOrder(null);
                    setIsCreating(false);
                    refreshOrders();
                  } catch (err: any) {
                    setOrderEditError(err?.message || (t('orders.saveFailed') || 'Failed to save order'));
                  }
                }}
              >
                {t('common.save') || 'Save'}
              </Button>
              <Button variant="secondary" onClick={() => { setEditingOrder(null); setOriginalOrder(null); setIsCreating(false); setOrderEditError(''); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                  {t('orders.statusComment') || 'Comment'}
                </label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusChangeComment}
                  onChange={(e) => setStatusChangeComment(e.target.value)}
                  placeholder={t('orders.statusCommentPlaceholder') || 'Reason for status change...'}
                  rows={3}
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="primary" onClick={confirmStatusChange}>
                {t('common.confirm') || 'Confirm'}
              </Button>
              <Button variant="secondary" onClick={() => { setChangingStatus(null); setStatusChangeComment(''); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setDeleteId(null)} />
          <div className="bg-white rounded-lg shadow-xl z-50 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{t('common.confirm') || 'Confirm'}</h3>
            <p className="text-gray-700 mb-6">
              {t('orders.confirmDelete', { id: deleteId }) || `Are you sure you want to delete order #${deleteId}?`}
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => handleDelete(deleteId)}>
                {t('common.delete') || 'Delete'}
              </Button>
              <Button variant="secondary" onClick={() => setDeleteId(null)}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filament Consumption Modal (Status 12) */}
      {consumingFilament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setConsumingFilament(null); setFilamentError(''); setFilamentSearch(''); setSelectedTypeFilter(''); }} />
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

              {/* Grams Calculator */}
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

              {/* Comment */}
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
              <Button variant="secondary" onClick={() => { setConsumingFilament(null); setFilamentError(''); setFilamentSearch(''); setSelectedTypeFilter(''); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Additional Info Modal (Status 10) */}
      {requestingInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setRequestingInfo(null); setInfoComment(''); }} />
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
              <Button variant="secondary" onClick={() => { setRequestingInfo(null); setInfoComment(''); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Design Price Modal (Status 13) */}
      {addingDesignPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setAddingDesignPrice(null); setDesignPriceError(''); }} />
          <div className="bg-white rounded shadow-lg z-50 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              В проектировании - добавить стоимость
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Стоимость проектирования *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Введите стоимость в BYN"
                  value={designPrice}
                  onChange={e => setDesignPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {designPrice && !isNaN(Number(designPrice)) && (
                  <p className="mt-2 text-sm text-gray-600">
                    Новая общая стоимость: {(addingDesignPrice.currentPrice + Number(designPrice)).toFixed(2)} BYN
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Комментарий (необязательно)
                </label>
                <textarea
                  placeholder="Дополнительная информация о проектировании..."
                  value={designComment}
                  onChange={e => setDesignComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {designPriceError && (
                <div className="text-red-600 text-sm">{designPriceError}</div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button onClick={confirmAddDesignPrice}>
                {t('common.confirm') || 'Confirm'}
              </Button>
              <Button variant="secondary" onClick={() => { setAddingDesignPrice(null); setDesignPriceError(''); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};