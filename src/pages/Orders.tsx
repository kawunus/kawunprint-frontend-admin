import React, { useEffect, useMemo, useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { formatLocalDateTime, parseDbDate } from '../utils/datetime';

export const Orders: React.FC = () => {
  const { orders, orderStatuses, loading, error, refreshOrders, updateOrderStatus } = useOrders();
  const [statusFilter, setStatusFilter] = useState<'all' | number>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'status' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { t, i18n } = useTranslation();
  const isRu = i18n.language?.startsWith('ru');
  const [showFilters, setShowFilters] = useState(false);

  const [modalStatus, setModalStatus] = useState<'all' | number>('all');
  const [modalDateFrom, setModalDateFrom] = useState<string>('');
  const [modalDateTo, setModalDateTo] = useState<string>('');
  const [modalMinTotal, setModalMinTotal] = useState<string>('');
  const [modalMaxTotal, setModalMaxTotal] = useState<string>('');
  const [modalCustomer, setModalCustomer] = useState<string>('');

  const [appliedDateFrom, setAppliedDateFrom] = useState<string>('');
  const [appliedDateTo, setAppliedDateTo] = useState<string>('');
  const [appliedMinTotal, setAppliedMinTotal] = useState<string>('');
  const [appliedMaxTotal, setAppliedMaxTotal] = useState<string>('');
  const [appliedCustomer, setAppliedCustomer] = useState<string>('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFilters(false);
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
    if (statusFilter !== 'all') list = list.filter(o => (o.statusId ?? -1) === statusFilter);
    // Applied modal filters
    if (appliedCustomer.trim()) {
      const q = appliedCustomer.trim().toLowerCase();
      list = list.filter(o => {
        const name = `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.toLowerCase();
        const email = (o.customer.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    if (appliedDateFrom) {
      const fromTs = new Date(appliedDateFrom).getTime();
      list = list.filter(o => (parseDbDate(o.createdAt)?.getTime() ?? 0) >= fromTs);
    }
    if (appliedDateTo) {
      const toTs = new Date(appliedDateTo).getTime();
      list = list.filter(o => (parseDbDate(o.createdAt)?.getTime() ?? 0) <= toTs);
    }
    if (appliedMinTotal) {
      const min = Number(appliedMinTotal);
      if (!Number.isNaN(min)) list = list.filter(o => o.totalPrice >= min);
    }
    if (appliedMaxTotal) {
      const max = Number(appliedMaxTotal);
      if (!Number.isNaN(max)) list = list.filter(o => o.totalPrice <= max);
    }
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
  }, [orders, statusFilter, appliedCustomer, appliedDateFrom, appliedDateTo, appliedMinTotal, appliedMaxTotal, search]);

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
  }, [filteredOrders, sortBy, sortOrder]);

  const handleStatusChange = async (orderId: number, statusId: number) => {
    try {
      await updateOrderStatus(orderId, statusId);
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
              placeholder={t('orders.searchPlaceholder') || (isRu ? 'поиск заказа' : 'Search order')}
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
              {sortOrder === 'asc' ? (isRu ? (t('filters.orderDisplayAsc') || 'А → Я') : (t('filters.orderDisplayAsc') || 'A → Z')) : (isRu ? (t('filters.orderDisplayDesc') || 'Я → А') : (t('filters.orderDisplayDesc') || 'Z → A'))}
            </button>
          </div>

          {(search || statusFilter !== 'all') ? (
            <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>{t('filters.clear') || 'Clear'}</Button>
          ) : null}

          <Button onClick={refreshOrders} variant="secondary" className="transform transition-transform duration-150 hover:scale-105">
            {t('common.refresh') || (isRu ? 'Обновить' : 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Status filter bar */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!showFilters) {
                setModalStatus(statusFilter as any);
                setModalCustomer(appliedCustomer);
                setModalDateFrom(appliedDateFrom);
                setModalDateTo(appliedDateTo);
                setModalMinTotal(appliedMinTotal);
                setModalMaxTotal(appliedMaxTotal);
              }
              setShowFilters(s => !s);
            }}
          >
            {t('filters.open') || 'Filters'}
          </Button>
          {(search || statusFilter !== 'all' || appliedCustomer || appliedDateFrom || appliedDateTo || appliedMinTotal || appliedMaxTotal) ? (
            <Button variant="secondary" size="sm" onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setAppliedCustomer('');
              setAppliedDateFrom('');
              setAppliedDateTo('');
              setAppliedMinTotal('');
              setAppliedMaxTotal('');
            }}>{t('filters.clear') || 'Clear'}</Button>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
        ) : (
          <div className="space-y-3">
            {sorted.map(o => {
              const currentStatusId = o.statusId ?? orderStatuses.find(s => s.description.toLowerCase() === String(o.status).toLowerCase())?.id;
              const currentStatusName = statusNameById(currentStatusId, o.status);
              const isCompleted = currentStatusName && currentStatusName.toLowerCase() === 'завершён';
              const placeholderLabel = orderStatuses.length
                ? (currentStatusName || t('orders.status.select') || (isRu ? 'выберите статус' : 'Select status'))
                : (currentStatusName || t('orders.status.loading') || (isRu ? 'загрузка статусов' : 'Loading statuses'));
              return (
              <div key={o.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">#{o.id} · {o.customer.firstName} {o.customer.lastName}</div>
                    <div className="text-sm text-gray-500 truncate">{formatLocalDateTime(o.createdAt, i18n.language)} · {o.customer.email}</div>
                    <div className="text-xs text-gray-500 truncate">{t('orders.total') || 'Total'}: {o.totalPrice.toFixed(2)} BYN</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <select
                    value={currentStatusId != null ? String(currentStatusId) : ''}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isNaN(value)) return;
                      handleStatusChange(o.id, value);
                    }}
                    className={`border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${isCompleted ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    disabled={isCompleted || !orderStatuses.length}
                  >
                    <option value="" disabled>{placeholderLabel}</option>
                    {orderStatuses.map(status => (
                      <option key={status.id} value={status.id}>{status.description}</option>
                    ))}
                  </select>
                  <Button
                    onClick={() => window.location.assign(`/orders/${o.id}`)}
                    variant="primary"
                    size="sm"
                    className="w-full transform transition-transform duration-150 hover:scale-105"
                  >
                    {t('common.details') || 'Details'}
                  </Button>
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

      {/* Filters modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowFilters(false)} />
          <div className="bg-white p-6 rounded shadow-lg z-50 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{t('filters.open') || 'Filters'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.filters.status') || 'Status'}</label>
                <select
                  className="border rounded px-2 py-2 text-sm w-full"
                  value={modalStatus === 'all' ? 'all' : String(modalStatus)}
                  onChange={(e) => setModalStatus(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">{t('orders.status.all') || 'All'}</option>
                  {orderStatuses.map(status => (
                    <option key={status.id} value={status.id}>{status.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.filter.customer') || 'Customer (name or email)'}</label>
                <input className="border rounded px-2 py-2 text-sm w-full" value={modalCustomer} onChange={(e) => setModalCustomer(e.target.value)} placeholder={t('orders.filter.customerPlaceholder') || (isRu ? 'имя или email' : 'name or email')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.filter.dateFrom') || 'Date from'}</label>
                <input type="date" className="border rounded px-2 py-2 text-sm w-full" value={modalDateFrom} onChange={(e) => setModalDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.filter.dateTo') || 'Date to'}</label>
                <input type="date" className="border rounded px-2 py-2 text-sm w-full" value={modalDateTo} onChange={(e) => setModalDateTo(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.filter.minTotal') || 'Min total'}</label>
                <input type="number" className="border rounded px-2 py-2 text-sm w-full" value={modalMinTotal} onChange={(e) => setModalMinTotal(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('orders.filter.maxTotal') || 'Max total'}</label>
                <input type="number" className="border rounded px-2 py-2 text-sm w-full" value={modalMaxTotal} onChange={(e) => setModalMaxTotal(e.target.value)} />
              </div>
            </div>
            <div className="mt-4">
              <Button variant="primary" onClick={() => {
                setStatusFilter(modalStatus);
                setAppliedCustomer(modalCustomer);
                setAppliedDateFrom(modalDateFrom);
                setAppliedDateTo(modalDateTo);
                setAppliedMinTotal(modalMinTotal);
                setAppliedMaxTotal(modalMaxTotal);
                setShowFilters(false);
              }}>{t('common.apply') || 'Apply'}</Button>
              <Button variant="secondary" className="ml-2" onClick={() => setShowFilters(false)}>{t('common.cancel') || 'Cancel'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};