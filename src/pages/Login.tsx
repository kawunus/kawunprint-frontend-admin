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
  const { i18n } = useTranslation();

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(next);
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
          onClick={toggleLang}
          className="px-4 py-2 bg-gray-100 text-gray-800 hover:bg-blue-600 hover:text-white border border-gray-200 hover:border-blue-600 rounded-md transition-colors text-sm font-medium shadow-md"
        >
          {i18n.language?.toUpperCase?.() || 'RU'}
        </button>
      </div>
      
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              3D Print Studio Admin
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to your administrator account
            </p>
          </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            placeholder="admin@example.com"
            autoComplete="off"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            placeholder="password"
            autoComplete="new-password"
          />

          <div>
            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Sign in
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};