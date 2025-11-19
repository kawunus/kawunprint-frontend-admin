import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTranslation } from 'react-i18next';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();

  const toggleLang = () => {
    console.log('🔥 toggleLang called!');
    const currentLang = i18n.language || 'ru';
    console.log('🔥 Current language:', currentLang);
    const next = currentLang.startsWith('ru') ? 'en' : 'ru';
    console.log('🔥 Switching to:', next);
    i18n.changeLanguage(next).then(() => {
      console.log('🔥 Language changed successfully to:', i18n.language);
    }).catch((err) => {
      console.error('🔥 Error changing language:', err);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 Login form submitted');
    
    setLoading(true);
    setError('');

    try {
      await login({ email, password });
      console.log('✅ Login hook completed, checking localStorage...');
      
      const token = localStorage.getItem('authToken');
      console.log('📋 Token after login:', token);
      
      if (token) {
        const from = (location.state as any)?.from?.pathname || '/';
        console.log('🔄 Redirecting after login to', from);
        navigate(from, { replace: true });
      } else {
        setError('Token was not saved properly');
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Language Toggle Button - Fixed Position */}
      <div className="fixed top-6 right-6 z-10">
        <button
          onClick={(e) => {
            console.log('🔥 Button clicked!', e);
            e.preventDefault();
            e.stopPropagation();
            toggleLang();
          }}
          type="button"
          className="px-4 py-2 bg-gray-100 text-gray-800 hover:bg-blue-600 hover:text-white border border-gray-200 hover:border-blue-600 rounded-md transition-colors text-sm font-medium shadow-md"
        >
          {(i18n.language || 'ru').startsWith('ru') ? 'RU' : 'EN'}
        </button>
      </div>
      
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t('login.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('login.subtitle')}
            </p>
          </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <Input
            label={t('login.email')}
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            placeholder={t('login.emailPlaceholder')}
            autoComplete="off"
          />
          <Input
            label={t('login.password')}
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            placeholder={t('login.passwordPlaceholder')}
            autoComplete="new-password"
          />

          <div>
            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              {t('login.signIn')}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};