import { api, extractApiData, handleApiError } from './api';

// Tipos para grupos
export interface GroupMember {
  _id: string;
  id?: string;
  username: string;
  email: string;
  displayName?: string;
  role: 'user' | 'admin';
  isActive?: boolean;
  isBlocked?: boolean;
}

export interface Group {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  color: string;
  members: GroupMember[];
  createdBy: {
    _id: string;
    username: string;
    email: string;
    displayName?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface GroupListResponse {
  groups: Group[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalGroups: number;
  };
}

export interface GroupListParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export class GroupService {
  /**
   * Listar todos os grupos
   */
  async getGroups(params: GroupListParams = {}): Promise<GroupListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

      const response = await api.get(`/groups?${queryParams.toString()}`);
      return extractApiData<GroupListResponse>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obter detalhes de um grupo específico
   */
  async getGroup(groupId: string): Promise<Group> {
    try {
      const response = await api.get(`/groups/${groupId}`);
      return extractApiData<Group>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Criar novo grupo
   */
  async createGroup(groupData: CreateGroupData): Promise<Group> {
    try {
      const response = await api.post('/groups', groupData);
      return extractApiData<Group>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Atualizar grupo
   */
  async updateGroup(groupId: string, groupData: UpdateGroupData): Promise<Group> {
    try {
      const response = await api.put(`/groups/${groupId}`, groupData);
      return extractApiData<Group>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Eliminar grupo
   */
  async deleteGroup(groupId: string): Promise<void> {
    try {
      await api.delete(`/groups/${groupId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Adicionar membros ao grupo
   */
  async addMembersToGroup(groupId: string, userIds: string[]): Promise<Group> {
    try {
      const response = await api.post(`/groups/${groupId}/members`, { userIds });
      return extractApiData<Group>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Remover membros do grupo
   */
  async removeMembersFromGroup(groupId: string, userIds: string[]): Promise<Group> {
    try {
      const response = await api.delete(`/groups/${groupId}/members`, {
        data: { userIds }
      });
      return extractApiData<Group>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

// Instância singleton
export const groupService = new GroupService();
