/**
 * API client utilities and HTTP helpers
 */

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * API response wrapper interface
 */
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

/**
 * API error class
 */
export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * HTTP client configuration
 */
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Create configured axios instance
 */
export const createApiClient = (): AxiosInstance => {
  const client = axios.create(API_CONFIG);

  // Request interceptor - add auth token if available
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle common errors
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Clear auth token on unauthorized
        localStorage.removeItem('authToken');
        // Redirect to login if needed
        window.location.href = '/login';
      }
      
      const errorData = error.response?.data as any;
      const message = errorData?.message || error.message || 'An error occurred';
      throw new ApiError(message, error.response?.status || 500, error.response?.data);
    }
  );

  return client;
};

/**
 * Default API client instance
 */
export const apiClient = createApiClient();

/**
 * Generic API methods
 */
export const api = {
  /**
   * GET request
   */
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.get<T>(url, config);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * POST request
   */
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.post<T>(url, data, config);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * PUT request
   */
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.put<T>(url, data, config);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * PATCH request
   */
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.patch<T>(url, data, config);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * DELETE request
   */
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.delete<T>(url, config);
      return {
        data: response.data,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  },
};

/**
 * Upload file utility
 */
export const uploadFile = async (
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ApiResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  };

  return api.post(url, formData, config);
};

/**
 * Download file utility
 */
export const downloadFile = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    throw new ApiError('Failed to download file', 500, error);
  }
};

/**
 * Retry mechanism for failed requests
 */
export const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }

      // Don't retry on client errors (4xx)
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError!;
};

/**
 * Cache for GET requests
 */
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

/**
 * GET request with caching
 */
export const getCached = async <T = any>(
  url: string,
  ttl: number = 300000, // 5 minutes default
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const cacheKey = `${url}${JSON.stringify(config)}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return {
      data: cached.data,
      success: true,
    };
  }

  const response = await api.get<T>(url, config);
  
  cache.set(cacheKey, {
    data: response.data,
    timestamp: Date.now(),
    ttl,
  });

  return response;
};

/**
 * Clear API cache
 */
export const clearCache = (pattern?: string): void => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};