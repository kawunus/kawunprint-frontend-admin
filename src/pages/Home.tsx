import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { useOrders } from '../hooks/useOrders';
import { useFilaments } from '../hooks/useFilaments';
import { usePrinters } from '../hooks/usePrinters';
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
  const { orders, orderStatuses, loading: ordersLoading } = useOrders();
  const { filaments, types, loading: filamentsLoading } = useFilaments();
  const { printers, loading: printersLoading } = usePrinters();

  const [now, setNow] = useState<Date>(new Date());

  const user = getUserInfoFromToken();

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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

  const counts = {
    orders: activeOrdersCount, // NEW + IN PROGRESS only
    filaments: filaments.length,
    printers: printers.length,
    types: types.length,
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
    
    const avgPrice = filaments.length ? filaments.reduce((s, f) => s + (Number(f.pricePerGram) || 0), 0) / filaments.length : 0;
    
    return { totalKg, activePrinters, totalOrders, completedOrders, avgPrice };
  }, [filaments, printers, orders, orderStatuses]);

  const isLoading = ordersLoading || filamentsLoading || printersLoading;

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
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
