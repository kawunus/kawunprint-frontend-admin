import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Login } from './pages/Login';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { OrderStatuses } from './pages/OrderStatuses';
import Home from './pages/Home';
import Filaments from './pages/Filaments';
import FilamentTypes from './pages/FilamentTypes';
import Printers from './pages/Printers';
import PrinterDetail from './pages/PrinterDetail';
import Profile from './pages/Profile';
import Users from './pages/Users';
import { Header } from './components/layout/Header';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const { i18n, t } = useTranslation();

  const toggleLang = () => {
    console.log('🔥 toggleLang called in App!');
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

  console.log('🛡️ ProtectedRoute check:', { isAuthenticated, isAdmin, isLoading });

  if (isLoading) {
    console.log('⏳ ProtectedRoute: loading...');
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    console.log('🚫 ProtectedRoute: not admin, showing access denied');
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Language Toggle Button - Fixed Position */}
        <div className="fixed top-6 right-6 z-10">
          <button
            onClick={(e) => {
              console.log('🔥 Button clicked in App!', e);
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
          <div className="max-w-md w-full space-y-8 text-center p-8">
            <div>
              <h2 className="text-3xl font-extrabold text-red-600 mb-4">
                {t('accessDenied.title')}
              </h2>
              <p className="text-xl text-gray-700 mb-6">
                {t('accessDenied.message')}
              </p>
              <p className="text-sm text-gray-500 mb-8">
                {t('accessDenied.description')}
              </p>
              <button
                onClick={() => {
                  localStorage.removeItem('authToken');
                  window.location.href = '/login';
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('accessDenied.backToLogin')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: authenticated and admin, rendering children');
  return <>{children}</>;
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  
  console.log('🏠 App render:', { 
    isAuthenticated, 
    isLoading,
    token: localStorage.getItem('authToken')
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Header />
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <Header />
                <OrderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-statuses"
            element={
              <ProtectedRoute>
                <Header />
                <OrderStatuses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Header />
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/filaments"
            element={
              <ProtectedRoute>
                <Header />
                <Filaments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/filament-types"
            element={
              <ProtectedRoute>
                <Header />
                <FilamentTypes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/printers"
            element={
              <ProtectedRoute>
                <Header />
                <Printers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/printers/:id"
            element={
              <ProtectedRoute>
                <Header />
                <PrinterDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Header />
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Header />
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/filament-types/:slug"
            element={
              <ProtectedRoute>
                <Header />
                <Suspense fallback={<div />}> 
                  {React.createElement(lazy(() => import('./pages/FilamentTypeDetail')))}
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;