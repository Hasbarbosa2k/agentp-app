import { api, extractApiData, handleApiError, tokenManager } from './api';

// Tipos para autenticação
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'editor';
  team?: string;
  lastLoginAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Tipo para resposta real da API
interface ApiAuthResponse {
  user: {
    id: string;
    username?: string;
    email: string;
    displayName?: string;
    role?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  /**
   * Registar novo utilizador
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/register', data);
      const apiData = extractApiData<ApiAuthResponse>(response);
      
      // Extrair tokens da estrutura real da API
      const accessToken = apiData.tokens.accessToken;
      const refreshToken = apiData.tokens.refreshToken;
      
      if (accessToken) {
        tokenManager.setToken(accessToken);
        tokenManager.setRefreshToken(refreshToken);
      }
      
      // Converter para formato esperado pelo frontend
      const authResponse: AuthResponse = {
        user: {
          id: apiData.user.id,
          email: apiData.user.email,
          displayName: apiData.user.displayName || apiData.user.username || '',
          role: (apiData.user.role as any) || 'user'
        },
        token: accessToken
      };
      
      return authResponse;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Login do utilizador
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/login', credentials);
      const apiData = extractApiData<ApiAuthResponse>(response);
      
      // Extrair tokens da estrutura real da API
      const accessToken = apiData.tokens.accessToken;
      const refreshToken = apiData.tokens.refreshToken;
      
      if (accessToken) {
        tokenManager.setToken(accessToken);
        tokenManager.setRefreshToken(refreshToken);
      } else {
        throw new Error('Token não encontrado na resposta da API');
      }
      
      // Converter para formato esperado pelo frontend
      const authResponse: AuthResponse = {
        user: {
          id: apiData.user.id,
          email: apiData.user.email,
          displayName: apiData.user.displayName || apiData.user.username || '',
          role: (apiData.user.role as any) || 'user'
        },
        token: accessToken
      };
      
      return authResponse;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Logout do utilizador
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      // Mesmo que falhe, remover tokens locais
      console.warn('Logout API call failed:', handleApiError(error));
    } finally {
      // Sempre remover tokens do localStorage
      tokenManager.removeToken();
    }
  }

  /**
   * Refresh do token
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      const response = await api.post('/auth/refresh', { refreshToken });
      const data = extractApiData<{ tokens: { accessToken: string; refreshToken: string } }>(response);
      
      // Actualizar tokens
      tokenManager.setToken(data.tokens.accessToken);
      tokenManager.setRefreshToken(data.tokens.refreshToken);
      
      return data.tokens.accessToken;
    } catch (error) {
      // Se refresh falhar, remover tokens
      tokenManager.removeToken();
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Verificar se utilizador está autenticado
   */
  isAuthenticated(): boolean {
    const token = tokenManager.getToken();
    return !!token;
  }

  /**
   * Obter token atual
   */
  getCurrentToken(): string | null {
    return tokenManager.getToken();
  }
}

// Instância singleton
export const authService = new AuthService(); 