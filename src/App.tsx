import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
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
import { Header } from './components/layout/Header';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center p-8">
          <div>
            <h2 className="text-3xl font-extrabold text-red-600 mb-4">
              Доступ запрещен
            </h2>
            <p className="text-xl text-gray-700 mb-6">
              У вас нет прав для доступа к этой странице :(
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Только администраторы могут получить доступ к панели управления.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Вернуться к входу
            </button>
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