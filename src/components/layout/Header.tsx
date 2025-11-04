import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

export const Header: React.FC = () => {
  const { logout } = useAuth();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(next);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 sm:py-4">
          <div className="flex items-center">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight mr-6">
              KawunPrint Studio Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={toggleLang} variant="secondary" size="sm" className="bg-gray-100 text-gray-800 hover:bg-blue-600 hover:text-white border border-gray-200 hover:border-blue-600 focus:ring-blue-500">
              {i18n.language?.toUpperCase?.() || 'RU'}
            </Button>
            <Button onClick={() => navigate('/profile')} variant="primary" size="sm" className="transform transition-transform duration-150 hover:scale-105">
              {t('common.profile') || t('profile.title') || 'Profile'}
            </Button>
            <Button onClick={logout} variant="danger" size="sm" className="transform transition-transform duration-150 hover:scale-105">
              {t('common.logout') || 'Logout'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};