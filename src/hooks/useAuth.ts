import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import { LoginRequest } from '../types';
import { getUserInfoFromToken } from '../utils/jwt';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginRequest) => Promise<string>;
  logout: () => void;
  isLoading: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Функция для проверки аутентификации
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('authToken');
    console.log('🔐 Checking auth, token exists:', !!token);
    
    if (token) {
      const userInfo = getUserInfoFromToken();
      const userIsAdmin = userInfo?.role?.toLowerCase() === 'admin';
      console.log('👤 User role:', userInfo?.role, 'isAdmin:', userIsAdmin);
      
      setIsAuthenticated(true);
      setIsAdmin(userIsAdmin);
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      console.log('🔐 Starting login process...');
      
      const token = await authApi.login(credentials);
      console.log('✅ Token received from API:', token);
      
      // Сохраняем токен
      localStorage.setItem('authToken', token);
      
      // Проверяем сохранение
      const savedToken = localStorage.getItem('authToken');
      console.log('💾 Token saved successfully:', !!savedToken);
      
      // Проверяем роль
      const userInfo = getUserInfoFromToken();
      const userIsAdmin = userInfo?.role?.toLowerCase() === 'admin';
      console.log('👤 User role after login:', userInfo?.role, 'isAdmin:', userIsAdmin);
      
      // Обновляем состояние
      setIsAuthenticated(true);
      setIsAdmin(userIsAdmin);
      
      console.log('🎉 Login completed successfully');
      return token;
    } catch (error) {
      console.error('❌ Login failed:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setIsAdmin(false);
    // Ensure user is redirected to login immediately from any component
    try {
      window.location.href = '/login';
    } catch (e) {
      console.warn('Could not navigate to /login on logout', e);
    }
  }, []);

  return {
    isAuthenticated,
    isAdmin,
    login,
    logout,
    isLoading,
  };
};