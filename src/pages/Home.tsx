import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

function getRoleFromToken(): string | null {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(decodeURIComponent(escape(json)));
    return data.role || null;
  } catch (e) {
    console.warn('Failed to parse token payload', e);
    return null;
  }
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const role = getRoleFromToken();
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Main</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-xl">
        <Button onClick={() => navigate('/orders')} variant="primary">Orders</Button>
  <Button onClick={() => navigate('/filaments')} variant="primary">{t('filaments.title') || 'Filaments'}</Button>
  <Button onClick={() => navigate('/filament-types')} variant="primary">{t('filaments.typesTitle') || 'Filament Types'}</Button>
        {role === 'ADMIN' && (
          <Button onClick={() => navigate('/users')} variant="primary">Users</Button>
        )}
        <Button onClick={() => navigate('/cart')} variant="secondary">Cart</Button>
        <Button onClick={() => navigate('/printers')} variant="secondary">Printers</Button>
      </div>
    </div>
  );
};

export default Home;
