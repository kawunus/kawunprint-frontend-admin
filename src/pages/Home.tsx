import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { useOrders } from '../hooks/useOrders';
import { useFilaments } from '../hooks/useFilaments';
import { usePrinters } from '../hooks/usePrinters';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api/users';
import { filesApi } from '../api/files';
import { User } from '../types';
import { getUserInfoFromToken } from '../utils/jwt';

// user name extraction moved to utils/jwt

function getGreetingKey(hours: number): string {
  if (hours >= 5 && hours < 12) return 'home.greeting.morning';
  if (hours >= 12 && hours < 17) return 'home.greeting.afternoon';
  if (hours >= 17 && hours < 22) return 'home.greeting.evening';
  return 'home.greeting.night';
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const { orders, orderStatuses, loading: ordersLoading } = useOrders();
  const { filaments, types, loading: filamentsLoading } = useFilaments();
  const { printers, loading: printersLoading } = usePrinters();

  const [now, setNow] = useState<Date>(new Date());
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [filesCount, setFilesCount] = useState<number>(0);

  const user = getUserInfoFromToken();

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load users if admin
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // Fetch total files count
  useEffect(() => {
    if (isAdmin) {
      const fetchFilesCount = async () => {
        try {
          const data = await filesApi.getAllFiles('', 1000);
          console.log('📦 Fetched files count response:', data);
          if (data && data.success && data.files && Array.isArray(data.files)) {
            console.log('✅ Files count:', data.files.length);
            setFilesCount(data.files.length);
          } else if (data && typeof data.count === 'number') {
            console.log('✅ Files count from count field:', data.count);
            setFilesCount(data.count);
          } else {
            console.error('❌ Unexpected response format:', data);
          }
        } catch (error) {
          console.error('❌ Failed to fetch files count:', error);
        }
      };

      fetchFilesCount();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Geolocation and reverse geocoding removed per request

  const greeting = useMemo(() => {
    const key = getGreetingKey(now.getHours());
    return t(key) || 'Hello';
  }, [now, t]);

  // Pick a random funny line once per mount
  const quipIndex = useMemo(() => Math.floor(Math.random() * 5), []);

  const dateStr = useMemo(() => now.toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), [now, i18n.language]);
  const timeStr = useMemo(() => now.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' }), [now, i18n.language]);
  // timezone not needed in greeting anymore; keep local in datetime widget via toLocale* APIs

  // Helper to get status name
  const getStatusName = (order: any): string => {
    const statusObj = orderStatuses.find(s => s.id === order.statusId);
    return (statusObj?.description || order.status || '').toLowerCase();
  };

  // Calculate active orders count (new + in progress)
  const activeOrdersCount = useMemo(() => {
    return orders.filter(o => {
      const statusName = getStatusName(o);
      // Not completed and not cancelled
      return statusName !== 'завершён' && statusName !== 'завершено' && 
             statusName !== 'отменён' && statusName !== 'отменено';
    }).length;
  }, [orders, orderStatuses]);

  // Calculate employees count (users with role != CLIENT)
  const employeesCount = useMemo(() => {
    return users.filter(u => u.role !== 'CLIENT').length;
  }, [users]);

  const counts = {
    orders: activeOrdersCount, // NEW + IN PROGRESS only
    filaments: filaments.length,
    printers: printers.length,
    types: types.length,
    employees: employeesCount, // Employees only (not clients)
  };

  const facts = useMemo(() => {
    const totalGrams = filaments.reduce((sum, f) => sum + (Number(f.residue) || 0), 0);
    const totalKg = totalGrams / 1000;
    const activePrinters = printers.filter(p => p.isActive).length;
    
    // Total orders ever
    const totalOrders = orders.length;
    
    // Completed orders (завершён/завершено, NOT отменён)
    const completedOrders = orders.filter(o => {
      const statusName = getStatusName(o);
      return statusName === 'завершён' || statusName === 'завершено';
    }).length;
    
    // Employees count (not clients)
    const employees = users.filter(u => u.role !== 'CLIENT').length;
    
    const avgPrice = filaments.length ? filaments.reduce((s, f) => s + (Number(f.pricePerGram) || 0), 0) / filaments.length : 0;
    
    return { totalKg, activePrinters, totalOrders, completedOrders, employees, avgPrice };
  }, [filaments, printers, orders, orderStatuses, users]);

  const isLoading = ordersLoading || filamentsLoading || printersLoading || usersLoading;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Greeting widget */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 shadow-lg">
          <div className="text-2xl sm:text-3xl font-semibold">
            {greeting}{user ? (user.full ? `, ${user.full}` : user.firstName ? `, ${user.firstName}` : '') : ''}
          </div>
          <div className="text-sm mt-1 opacity-90">{t(`home.gags.${quipIndex}`) || ''}</div>
        </div>
        {/* Date/Time */}
        <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/40 shadow-lg p-6">
          <div className="text-gray-500 text-sm mb-2">{t('home.widgets.datetime') || 'Date & Time'}</div>
          <div className="text-lg font-medium capitalize">{dateStr}</div>
          <div className="font-mono text-2xl mt-1">{timeStr}</div>
        </div>

        {/* Quick counts (moved after Date/Time) */}
        <div className="rounded-2xl bg-white shadow-lg border border-gray-200 p-6">
          <div className="text-gray-500 text-sm mb-3">{t('home.widgets.overview') || 'Overview'}</div>
          <div className={`grid ${isAdmin ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'} gap-4`}>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">{t('orders.title') || 'Orders'}</div>
              <div className="text-2xl font-bold">{isLoading ? '…' : counts.orders}</div>
              <Button className="mt-2 w-full justify-center transform transition-transform duration-150 hover:scale-105" variant="primary" onClick={() => navigate('/orders')}>{t('common.details') || 'Details'}</Button>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">{t('filaments.title') || 'Filaments'}</div>
              <div className="text-2xl font-bold">{isLoading ? '…' : counts.filaments}</div>
              <Button className="mt-2 w-full justify-center transform transition-transform duration-150 hover:scale-105" variant="primary" onClick={() => navigate('/filaments')}>{t('common.details') || 'Details'}</Button>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">{t('printers.title') || 'Printers'}</div>
              <div className="text-2xl font-bold">{isLoading ? '…' : counts.printers}</div>
              <Button className="mt-2 w-full justify-center transform transition-transform duration-150 hover:scale-105" variant="primary" onClick={() => navigate('/printers')}>{t('common.details') || 'Details'}</Button>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs text-gray-500">{t('filaments.typesTitle') || 'Filament Types'}</div>
              <div className="text-2xl font-bold">{isLoading ? '…' : counts.types}</div>
              <Button className="mt-2 w-full justify-center transform transition-transform duration-150 hover:scale-105" variant="primary" onClick={() => navigate('/filament-types')}>{t('common.details') || 'Details'}</Button>
            </div>
            {isAdmin && (
              <>
                <div className="rounded-xl bg-gray-50 p-4 items-start">
                  <div className="text-xs text-gray-500">{t('users.total') || 'Total Users'}</div>
                  <div className="text-2xl font-bold">{isLoading ? '…' : users.length}</div>
                  <Button className="mt-2 w-full justify-center transform transition-transform duration-150 hover:scale-105" variant="primary" onClick={() => navigate('/users')}>{t('common.details') || 'Details'}</Button>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 items-start">
                  <div className="text-xs text-gray-500">{i18n.language === 'ru' ? (<>{t('files.totalLine1') || 'Всего'}<br />{t('files.totalLine2') || 'файлов'}</>) : (t('files.total') || 'Total Files')}</div>
                  <div className="text-2xl font-bold">{filesCount}</div>
                  <Button className="mt-2 w-full justify-center transform transition-transform duration-150 hover:scale-105" variant="primary" onClick={() => navigate('/files')}>{t('common.details') || 'Details'}</Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Interesting facts */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 border border-amber-200 p-6 shadow-lg">
          <div className="text-amber-800 text-sm mb-3">{t('home.widgets.facts') || 'Interesting facts'}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/70 backdrop-blur p-4 border border-white/50">
              <div className="text-xs text-gray-500">{t('home.facts.totalFilament') || 'Total filament'}</div>
              <div className="text-2xl font-bold">{isLoading ? '…' : `${facts.totalKg.toFixed(2)} kg`}</div>
            </div>
            <div className="rounded-xl bg-white/70 backdrop-blur p-4 border border-white/50">
              <div className="text-xs text-gray-500">{t('home.facts.activePrinters') || 'Active printers'}</div>
              <div className="text-2xl font-bold">{isLoading ? '…' : facts.activePrinters}</div>
            </div>
            <div className="rounded-xl bg-white/70 backdrop-blur p-4 border border-white/50">
              <div className="text-xs text-gray-500">{t('home.facts.totalOrders') || 'Total orders'}</div>
              <div className="text-2xl font-bold">{isLoading ? '…' : facts.totalOrders}</div>
            </div>
            <div className="rounded-xl bg-white/70 backdrop-blur p-4 border border-white/50">
              <div className="text-xs text-gray-500">{t('home.facts.completedOrders') || 'Completed orders'}</div>
              <div className="text-2xl font-bold">{isLoading ? '…' : facts.completedOrders}</div>
            </div>
            {isAdmin && (
              <div className="rounded-xl bg-white/70 backdrop-blur p-4 border border-white/50">
                <div className="text-xs text-gray-500">{t('home.facts.employees') || 'Employees'}</div>
                <div className="text-2xl font-bold">{isLoading ? '…' : facts.employees}</div>
              </div>
            )}
          </div>
        </div>

        {/* Analytics & Import widgets (for Admin and Analyst) */}
        {(isAdmin || (user && user.role === 'ANALYST')) && (
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Analytics widget */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-indigo-600 text-sm font-medium mb-1">{t('home.widgets.analytics') || 'Analytics'}</div>
                  <h3 className="text-lg font-semibold text-indigo-900">{t('analytics.title') || 'Analytics & Metrics'}</h3>
                </div>
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm text-indigo-700 mb-4">{t('home.widgets.analyticsDesc') || 'View production metrics, order statistics, and inventory insights'}</p>
              <Button variant="primary" size="sm" className="w-full" onClick={() => navigate('/analytics')}>{t('common.view') || 'View'} →</Button>
            </div>

            {/* Import & Export widget (Admin only) */}
            {isAdmin && (
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-emerald-600 text-sm font-medium mb-1">{t('home.widgets.import') || 'Data Management'}</div>
                    <h3 className="text-lg font-semibold text-emerald-900">{t('import.title') || 'Import & Export'}</h3>
                  </div>
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <p className="text-sm text-emerald-700 mb-4">{t('home.widgets.importDesc') || 'Export data to CSV, JSON, or Excel for backup and integration'}</p>
                <Button variant="primary" size="sm" className="w-full" onClick={() => navigate('/import')}>{t('common.view') || 'View'} →</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
