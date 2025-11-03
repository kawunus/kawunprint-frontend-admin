import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import { LoginRequest } from '../types';

interface UseAuthReturn {
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<string>;
  logout: () => void;
  isLoading: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Функция для проверки аутентификации
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('authToken');
    console.log('🔐 Checking auth, token exists:', !!token);
    setIsAuthenticated(!!token);
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
      
      // Обновляем состояние
      setIsAuthenticated(true);
      
      console.log('🎉 Login completed successfully');
      return token;
    } catch (error) {
      console.error('❌ Login failed:', error);
      setIsAuthenticated(false);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    // Ensure user is redirected to login immediately from any component
    try {
      window.location.href = '/login';
    } catch (e) {
      console.warn('Could not navigate to /login on logout', e);
    }
  }, []);

  return {
    isAuthenticated,
    login,
    logout,
    isLoading,
  };
};