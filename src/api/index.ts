import axios from 'axios';
import { getUserIdFromToken } from '../utils/jwt';

// In development, force same-origin so Vite proxy handles /api (no CORS/preflight).
// In production, use VITE_API_BASE_URL when provided.
const env = (import.meta as any).env || {};
const isDev = !!env.DEV;
const API_BASE_URL = isDev ? '' : (env.VITE_API_BASE_URL || '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('🔐 Current token:', token);
    console.log('🚀 Making request to:', config.method?.toUpperCase(), config.url);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token added to headers');
      const userId = getUserIdFromToken();
      if (userId != null) {
        // Provide user id for backend auditing; header name agreed with backend
        (config.headers as any)['X-User-Id'] = String(userId);
      }
    } else {
      console.log('❌ No token found in localStorage');
    }
    
    console.log('📋 Request headers:', config.headers);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      console.log('🛑 401 Unauthorized - removing token');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);