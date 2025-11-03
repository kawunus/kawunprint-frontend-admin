import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

export const Header: React.FC = () => {
  const { logout } = useAuth();
  const { i18n, t } = useTranslation();

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(next);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              3D Print Studio Admin
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={toggleLang} variant="secondary" size="sm" className="bg-gray-100 text-gray-800 hover:bg-blue-600 hover:text-white border border-gray-200 hover:border-blue-600 focus:ring-blue-500">
              {i18n.language?.toUpperCase?.() || 'RU'}
            </Button>
            <Button onClick={logout} variant="secondary" size="sm" className="hover:bg-blue-600 focus:ring-blue-500 transform transition-transform duration-150 hover:scale-105">
              {t('common.logout') || 'Logout'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};