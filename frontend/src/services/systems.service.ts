import { api, extractApiData, handleApiError } from './api';

// Interfaces para saúde e estatísticas do sistema
export interface SystemHealth {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected';
}

export interface SystemStats {
  activeUsers: number;
  totalRequests: number;
  systemLoad: {
    cpu: number;
    memory: number;
    disk: number;
  };
  lastUpdated: string;
}

// Interfaces para gestão de sistemas
export interface NodeExporterStatus {
  installed: boolean;
  port: number;
  version?: string | null;
  installedAt?: string | null;
  lastCheckedAt?: string | null;
  status: 'unknown' | 'running' | 'stopped' | 'not_installed' | 'error';
}

export interface ProcessExporterStatus {
  installed: boolean;
  port: number;
  installedAt?: string | null;
  lastCheckedAt?: string | null;
  status: 'unknown' | 'running' | 'stopped' | 'not_installed' | 'error';
  monitoredProcesses?: string[];
}

export interface SystemInfo {
  _id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline' | 'maintenance' | 'unknown';
  os: string;
  owner: string;
  environment?: 'production' | 'staging' | 'development' | 'testing';
  description?: string;
  port?: number;
  protocol?: string;
  tags?: string[];
  monitoringEnabled?: boolean;
  alertsEnabled?: boolean;
  createdAt: string;
  updatedAt?: string;
  slug?: string;
  // Campos de estado adicionais expostos pelo backend
  uptime?: string;
  lastTest?: string;
  lastTestStatus?: string;
  onboardingStatus?: string;
  scriptStatus?: string;
  statusDisplay?: string;
  onboardingStatusDisplay?: string;
  // Prometheus Exporters
  nodeExporter?: NodeExporterStatus;
  processExporter?: ProcessExporterStatus;
}

export interface CreateSystemData {
  name: string;
  ip: string;
  os: string;
  owner: string;
  description?: string;
  environment?: 'production' | 'staging' | 'development' | 'testing';
  status?: 'online' | 'offline' | 'maintenance' | 'unknown';
  port?: number;
  protocol?: string;
  tags?: string[];
  monitoringEnabled?: boolean;
  alertsEnabled?: boolean;
}

export interface SystemListResponse {
  systems: SystemInfo[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalSystems: number;
  };
}

export interface SystemListParams {
  page?: number;
  limit?: number;
  status?: 'online' | 'offline' | 'maintenance' | 'unknown';
  environment?: 'production' | 'staging' | 'development' | 'testing';
  owner?: string;
  search?: string;
  sortBy?: 'name' | 'ip' | 'status' | 'environment' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class SystemsService {
  /**
   * Verificar saúde do sistema
   */
  async getHealthCheck(): Promise<SystemHealth> {
    try {
      const response = await api.get('/systems/health');
      return extractApiData<SystemHealth>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obter estatísticas do sistema
   */
  async getSystemStats(): Promise<SystemStats> {
    try {
      const response = await api.get('/systems/stats');
      return extractApiData<SystemStats>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Listar todos os sistemas
   */
  async getSystems(params: SystemListParams = {}): Promise<SystemListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.environment) queryParams.append('environment', params.environment);
      if (params.owner) queryParams.append('owner', params.owner);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/systems?${queryParams.toString()}`);
      return extractApiData<SystemListResponse>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obter sistema por ID (includeOnboarding opcional)
   */
  async getSystemById(systemId: string, options?: { includeOnboarding?: boolean }): Promise<{ system: SystemInfo; onboarding?: any }> {
    try {
      const params = new URLSearchParams();
      if (options?.includeOnboarding) params.append('includeOnboarding', 'true');
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/systems/${systemId}${suffix}`);
      return extractApiData<{ system: SystemInfo; onboarding?: any }>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obter sistema por slug
   */
  async getSystemBySlug(slug: string): Promise<{ system: SystemInfo }> {
    try {
      const response = await api.get(`/systems/by-slug/${encodeURIComponent(slug)}`);
      return extractApiData<{ system: SystemInfo }>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Forçar teste imediato (ping)
   */
  async testSystem(systemId: string): Promise<{ system: SystemInfo; testResult: any }> {
    try {
      const response = await api.post(`/systems/${systemId}/test`);
      return extractApiData<{ system: SystemInfo; testResult: any }>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Criar novo sistema (apenas admin)
   */
  async createSystem(systemData: CreateSystemData): Promise<SystemInfo> {
    try {
      const response = await api.post('/systems', systemData);
      return extractApiData<{ system: SystemInfo }>(response).system;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obter estatísticas detalhadas dos sistemas
   */
  async getSystemsStats(): Promise<SystemStats> {
    try {
      const response = await api.get('/systems/stats');
      return extractApiData<SystemStats>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Atualizar sistema existente
   */
  async updateSystem(systemId: string, systemData: Partial<CreateSystemData>): Promise<SystemInfo> {
    try {
      console.log('🔄 [SYSTEMS] Updating system:', systemId, 'with data:', systemData);
      const response = await api.put(`/systems/${systemId}`, systemData);
      const updatedSystem = extractApiData<{ system: SystemInfo }>(response).system;
      console.log('✅ [SYSTEMS] System updated successfully:', updatedSystem);
      return updatedSystem;
    } catch (error) {
      console.error('❌ [SYSTEMS] Failed to update system:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Apagar sistema (soft delete)
   */
  async deleteSystem(systemId: string): Promise<void> {
    try {
      console.log('🗑️ [SYSTEMS] Deleting system:', systemId);
      await api.delete(`/systems/${systemId}`);
      // Alguns backends retornam 204 No Content para delete bem-sucedido
      console.log('✅ [SYSTEMS] System deleted successfully');
      return;
    } catch (error) {
      console.error('❌ [SYSTEMS] Failed to delete system:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Re-parsear perfil do sistema a partir do onboarding existente
   */
  async reparseSystemProfile(systemId: string): Promise<{ system: SystemInfo; profile: any }> {
    try {
      console.log('🔄 [SYSTEMS] Re-parsing system profile:', systemId);
      const response = await api.post(`/systems/${systemId}/reparse-profile`);
      const result = extractApiData<{ systemId: string; systemName: string; profile: any }>(response);
      console.log('✅ [SYSTEMS] Profile re-parsed successfully:', result);
      return result as any;
    } catch (error) {
      console.error('❌ [SYSTEMS] Failed to re-parse profile:', error);
      throw new Error(handleApiError(error));
    }
  }
}

export const systemsService = new SystemsService(); 