import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiError } from '../types/api';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: '/api', // Proxied by Vite to http://localhost:8000/api
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('access_token');

      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Extract error message from response
    let errorMessage = 'An unexpected error occurred';

    const detail = error.response?.data?.detail;

    if (typeof detail === 'string') {
      // Simple string error message
      errorMessage = detail;
    } else if (Array.isArray(detail)) {
      // Pydantic validation errors - extract messages
      errorMessage = detail
        .map((err: any) => {
          const field = err.loc?.slice(1).join('.') || 'field';
          return `${field}: ${err.msg}`;
        })
        .join(', ');
    } else if (detail && typeof detail === 'object') {
      // Object error - try to get message
      errorMessage = detail.message || detail.msg || JSON.stringify(detail);
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Return a formatted error
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

// Generic API methods
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.get<T>(url, config).then((response) => response.data);
  },

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return api.post<T>(url, data, config).then((response) => response.data);
  },

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return api.put<T>(url, data, config).then((response) => response.data);
  },

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.delete<T>(url, config).then((response) => response.data);
  },

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return api.patch<T>(url, data, config).then((response) => response.data);
  },
};

export default api;
