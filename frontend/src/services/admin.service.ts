import { api, extractApiData, handleApiError } from './api';
import { User } from './auth.service';

// Tipos para administração
export interface UserListItem {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'editor';
  team?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
  role?: 'user' | 'admin' | 'editor';
  team?: string;
}

export interface UpdateUserData {
  displayName?: string;
  role?: 'user' | 'admin' | 'editor';
  team?: string;
  isActive?: boolean;
}

export interface UserListResponse {
  users: UserListItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
  };
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  team?: string;
}

export class AdminService {
  /**
   * Listar utilizadores (com paginação e filtros)
   */
  async getUsers(params: UserListParams = {}): Promise<UserListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.role) queryParams.append('role', params.role);
      if (params.team) queryParams.append('team', params.team);

      const response = await api.get(`/admin/users?${queryParams.toString()}`);
      return extractApiData<UserListResponse>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Criar novo utilizador
   */
  async createUser(userData: CreateUserData): Promise<UserListItem> {
    try {
      const response = await api.post('/admin/users', userData);
      return extractApiData<UserListItem>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Actualizar utilizador
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<UserListItem> {
    try {
      const response = await api.put(`/admin/users/${userId}`, userData);
      return extractApiData<UserListItem>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Eliminar utilizador
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await api.delete(`/admin/users/${userId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obter detalhes de um utilizador específico
   */
  async getUser(userId: string): Promise<UserListItem> {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return extractApiData<UserListItem>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Bloquear utilizador
   */
  async blockUser(userId: string, reason?: string): Promise<void> {
    try {
      await api.post(`/admin/users/${userId}/block`, { reason });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Desbloquear utilizador
   */
  async unblockUser(userId: string): Promise<void> {
    try {
      await api.post(`/admin/users/${userId}/unblock`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Alterar password de utilizador
   */
  async changeUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      await api.put(`/admin/users/${userId}/password`, { newPassword });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

// Instância singleton
export const adminService = new AdminService(); 