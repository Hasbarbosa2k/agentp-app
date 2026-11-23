import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? '/api' : 'http://localhost:3000'
);

// Criar instância do axios
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },
  
  setToken: (token: string): void => {
    localStorage.setItem('auth_token', token);
  },
  
  getRefreshToken: (): string | null => {
    return localStorage.getItem('refresh_token');
  },
  
  setRefreshToken: (token: string): void => {
    localStorage.setItem('refresh_token', token);
  },
  
  removeToken: (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
};

// Request interceptor para adicionar token
api.interceptors.request.use(
  (config: any) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor para tratar erros e refresh token
api.interceptors.response.use(
  (response: any) => {
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config as any;

    // Se token expirou (401) e não é uma tentativa de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
          // Enviar refreshToken no body conforme esperado pelo backend
          const response = await api.post('/auth/refresh', { refreshToken });
          const data = (response.data as any).data;
          const newAccessToken = data.tokens.accessToken;
          const newRefreshToken = data.tokens.refreshToken;
          
          // Guardar novos tokens
          tokenManager.setToken(newAccessToken);
          tokenManager.setRefreshToken(newRefreshToken);
          
          // Retry request original com novo token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh falhou, fazer logout
        tokenManager.removeToken();
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Tipos para respostas da API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

// Helper para extrair dados das respostas
export const extractApiData = <T>(response: any): T => {
  return response.data.data!;
};

// Helper para tratar erros
export const handleApiError = (error: any): string => {
  if (error.response?.data) {
    const apiError = error.response.data as ApiError;
    return apiError.message || 'Ocorreu um erro inesperado';
  }
  return error.message || 'Erro de conexão';
};

export default api; 