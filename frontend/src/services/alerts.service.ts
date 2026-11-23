import { api } from './api';

export interface AlertAnnotations {
  summary?: string;
  description?: string;
  runbook_url?: string;
}

export interface AlertAIMetadata {
  model?: string;
  generatedAt?: string;
  tokensUsed?: number;
  confidence?: number;
}

export interface AlertHistoryEntry {
  action: 'created' | 'updated' | 'enabled' | 'disabled' | 'approved' | 'rejected' | 'synced' | 'error';
  timestamp: string;
  userId?: {
    _id: string;
    username: string;
  };
  details?: string;
}

export interface Alert {
  _id: string;
  systemId: string | {
    _id: string;
    name: string;
    ip: string;
  };
  alertName: string;
  description: string;
  expr: string;
  forDuration: string;
  severity: 'info' | 'warning' | 'critical';
  labels?: Record<string, string>;
  annotations?: AlertAnnotations;
  status: 'draft' | 'pending_approval' | 'active' | 'disabled' | 'error';
  enabled: boolean;
  originalPrompt?: string;
  generatedYaml?: string;
  aiMetadata?: AlertAIMetadata;
  history?: AlertHistoryEntry[];
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'pending';
  lastSyncError?: string;
  createdBy?: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedAlert {
  alertName: string;
  description: string;
  expr: string;
  forDuration: string;
  severity: 'info' | 'warning' | 'critical';
  annotations?: AlertAnnotations;
}

export interface GenerateAlertResponse {
  success: boolean;
  data?: {
    alert: GeneratedAlert;
    yamlPreview: string;
    confidence: number;
    originalPrompt: string;
  };
  error?: string;
}

export interface SystemMetrics {
  cpu: Record<string, number>;
  memory: {
    total?: number;
    available?: number;
    usedPercent?: string;
  };
  disk: Record<string, number>;
  network: Record<string, number>;
  load: {
    load1?: number;
    load5?: number;
    load15?: number;
  };
  uptime?: number;
}

export interface MetricsResponse {
  success: boolean;
  data?: {
    success: boolean;
    metrics?: SystemMetrics;
    error?: string;
    timestamp: string;
  };
}

export class AlertsService {
  /**
   * Generate alert from prompt using AI
   */
  async generateAlertFromPrompt(systemId: string, prompt: string): Promise<GenerateAlertResponse> {
    try {
      console.log('🤖 [ALERTS] Generating alert from prompt:', prompt);
      const response = await api.post(`/alerts/system/${systemId}/generate`, { prompt });
      console.log('🤖 [ALERTS] Alert generated:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('🤖 [ALERTS] Failed to generate alert:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Create alert
   */
  async createAlert(systemId: string, alertData: Partial<Alert> & { yamlPreview?: string }): Promise<{ success: boolean; data?: { alert: Alert }; error?: string }> {
    try {
      console.log('📝 [ALERTS] Creating alert:', alertData);
      const response = await api.post(`/alerts/system/${systemId}`, alertData);
      console.log('📝 [ALERTS] Alert created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('📝 [ALERTS] Failed to create alert:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Listar alertas de um sistema
   */
  async getAlertsBySystem(systemId: string, filters?: { status?: string; severity?: string; enabled?: boolean }): Promise<{ success: boolean; data?: { alerts: Alert[]; total: number } }> {
    try {
      console.log('📋 [ALERTS] Fetching alerts for system:', systemId);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.enabled !== undefined) params.append('enabled', String(filters.enabled));
      
      const response = await api.get(`/alerts/system/${systemId}?${params.toString()}`);
      console.log('📋 [ALERTS] Alerts fetched:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('📋 [ALERTS] Failed to fetch alerts:', error);
      return { success: false };
    }
  }

  /**
   * Obter todos os alertas agrupados por sistema
   */
  async getAllAlertsGrouped(filters?: { status?: string; severity?: string; enabled?: boolean }): Promise<{
    success: boolean;
    data?: {
      groups: Array<{
        system: {
          _id: string;
          name: string;
          ip: string;
          environment?: string;
        };
        alerts: Alert[];
      }>;
      stats: {
        totalSystems: number;
        totalAlerts: number;
        bySeverity: {
          critical: number;
          warning: number;
          info: number;
        };
        byStatus: {
          active: number;
          pending_approval: number;
          disabled: number;
          draft: number;
          error: number;
        };
      };
    };
    error?: string;
  }> {
    try {
      console.log('📋 [ALERTS] Fetching all alerts grouped by system');
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.enabled !== undefined) params.append('enabled', String(filters.enabled));
      
      const response = await api.get(`/alerts/all?${params.toString()}`);
      console.log('📋 [ALERTS] All alerts fetched:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('📋 [ALERTS] Failed to fetch all alerts:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Obter alertas do Prometheus agrupados por sistema
   */
  async getFiringAlertsGrouped(filters?: { state?: 'firing' | 'pending' | 'all'; severity?: 'critical' | 'warning' | 'info' }): Promise<{
    success: boolean;
    data?: {
      groups: Array<{
        system: {
          _id: string | null;
          name: string;
          ip: string;
          environment?: string;
        };
        alerts: Array<{
          alertName: string;
          severity: string;
          state: string;
          instance: string;
          summary: string;
          description?: string;
          activeAt: string;
          value?: string;
          labels?: Record<string, string>;
        }>;
      }>;
      stats: {
        totalSystems: number;
        totalAlerts: number;
        bySeverity: {
          critical: number;
          warning: number;
          info: number;
        };
        byState: {
          firing: number;
          pending: number;
        };
      };
    };
    error?: string;
  }> {
    try {
      console.log('🔔 [ALERTS] Fetching alerts grouped by system', filters);
      const params = new URLSearchParams();
      if (filters?.state) params.append('state', filters.state);
      if (filters?.severity) params.append('severity', filters.severity);
      
      const url = `/alerts/firing${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      console.log('🔔 [ALERTS] Alerts fetched:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('🔔 [ALERTS] Failed to fetch alerts:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: {
          groups: [],
          stats: {
            totalSystems: 0,
            totalAlerts: 0,
            bySeverity: { critical: 0, warning: 0, info: 0 },
            byState: { firing: 0, pending: 0 }
          }
        }
      };
    }
  }

  /**
   * Aprovar alerta
   */
  async approveAlert(alertId: string): Promise<{ success: boolean; data?: { alert: Alert }; error?: string }> {
    try {
      console.log('✅ [ALERTS] Approving alert:', alertId);
      const response = await api.post(`/alerts/${alertId}/approve`);
      console.log('✅ [ALERTS] Alert approved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('✅ [ALERTS] Failed to approve alert:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Rejeitar alerta
   */
  async rejectAlert(alertId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('❌ [ALERTS] Rejecting alert:', alertId);
      const response = await api.post(`/alerts/${alertId}/reject`, { reason });
      return response.data;
    } catch (error: any) {
      console.error('❌ [ALERTS] Failed to reject alert:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Activar/Desactivar alerta
   */
  async toggleAlert(alertId: string, enabled: boolean): Promise<{ success: boolean; data?: { alert: Alert }; error?: string }> {
    try {
      console.log(`🔄 [ALERTS] ${enabled ? 'Enabling' : 'Disabling'} alert:`, alertId);
      const response = await api.post(`/alerts/${alertId}/toggle`, { enabled });
      return response.data;
    } catch (error: any) {
      console.error('🔄 [ALERTS] Failed to toggle alert:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Eliminar alerta
   */
  async deleteAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ [ALERTS] Deleting alert:', alertId);
      const response = await api.delete(`/alerts/${alertId}`);
      return response.data;
    } catch (error: any) {
      console.error('🗑️ [ALERTS] Failed to delete alert:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Obter métricas do Node Exporter
   */
  async getSystemMetrics(systemId: string): Promise<MetricsResponse> {
    try {
      console.log('📊 [ALERTS] Fetching metrics for system:', systemId);
      const response = await api.get(`/alerts/system/${systemId}/metrics`);
      console.log('📊 [ALERTS] Metrics fetched:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('📊 [ALERTS] Failed to fetch metrics:', error);
      return {
        success: false,
        data: {
          success: false,
          error: error.response?.data?.message || error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Sincronizar alertas com Prometheus
   */
  async syncWithPrometheus(): Promise<{ success: boolean; data?: { alertsCount: number }; error?: string }> {
    try {
      console.log('🔄 [ALERTS] Syncing with Prometheus');
      const response = await api.post('/alerts/sync');
      return response.data;
    } catch (error: any) {
      console.error('🔄 [ALERTS] Failed to sync with Prometheus:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Obter estado dos targets do Prometheus
   */
  async getPrometheusTargets(): Promise<{
    success: boolean;
    targets?: Array<{
      instance: string;
      systemName: string;
      health: 'up' | 'down' | 'unknown';
      lastScrape: string;
      lastError: string;
      scrapeUrl: string;
    }>;
    prometheusHealth?: string;
    error?: string;
  }> {
    try {
      console.log('📡 [ALERTS] Getting Prometheus targets');
      const response = await api.get('/alerts/prometheus/targets');
      return response.data;
    } catch (error: any) {
      console.error('📡 [ALERTS] Failed to get Prometheus targets:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Testar um alarme - executar query e ver resultado
   */
  async testAlert(alertId: string): Promise<{
    success: boolean;
    data?: {
      alertName: string;
      alertSeverity: string;
      expression: string;
      queryValid: boolean;
      wouldFire: boolean;
      currentStatus: 'FIRING' | 'OK';
      results: Array<{
        instance: string;
        value: string;
        rawValue: string;
        timestamp: string;
      }>;
      resultCount: number;
      testedAt: string;
      message: string;
    };
    error?: string;
  }> {
    try {
      console.log('🧪 [ALERTS] Testing alert:', alertId);
      const response = await api.post(`/alerts/${alertId}/test`);
      return response.data;
    } catch (error: any) {
      console.error('🧪 [ALERTS] Failed to test alert:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Verificar conectividade com Node Exporter
   */
  async checkNodeExporterConnectivity(systemId: string): Promise<{
    success: boolean;
    data?: {
      systemId: string;
      systemName: string;
      ip: string;
      port: number;
      reachable: boolean;
      status: 'up' | 'down' | 'error';
      message: string;
    };
    error?: string;
  }> {
    try {
      console.log('🔌 [ALERTS] Checking Node Exporter connectivity for:', systemId);
      const response = await api.get(`/alerts/system/${systemId}/connectivity`);
      return response.data;
    } catch (error: any) {
      console.error('🔌 [ALERTS] Failed to check connectivity:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Obter alertas que estão a disparar (FIRING) no Prometheus
   */
  async getFiringAlerts(systemId?: string): Promise<{
    success: boolean;
    firing?: Array<{
      alertName: string;
      severity: string;
      state: string;
      instance: string;
      summary: string;
      description?: string;
      activeAt: string;
      value?: string;
      labels?: Record<string, string>;
    }>;
    pending?: Array<{
      alertName: string;
      severity: string;
      state: string;
      instance: string;
      summary: string;
      activeAt: string;
    }>;
    total?: number;
    error?: string;
  }> {
    try {
      const url = systemId 
        ? `/alerts/prometheus/firing/${systemId}`
        : '/alerts/prometheus/firing';
      console.log('🔔 [ALERTS] Getting firing alerts');
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('🔔 [ALERTS] Failed to get firing alerts:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        firing: [],
        pending: []
      };
    }
  }

  /**
   * Verificar e actualizar estado dos exporters de um sistema
   * Faz requests HTTP directamente aos exporters para verificar se estão online
   */
  async refreshExporterStatus(systemId: string): Promise<{
    success: boolean;
    message?: string;
    data?: {
      systemId: string;
      systemName: string;
      ip: string;
      nodeExporter: {
        installed: boolean;
        status: string;
        port?: number;
        version?: string;
        lastCheckedAt?: string;
      };
      processExporter: {
        installed: boolean;
        status: string;
        port?: number;
        monitoredProcesses?: string[];
        lastCheckedAt?: string;
      };
      checkResults: {
        nodeExporter: { status: string; version?: string; port?: number; error?: string } | null;
        processExporter: { status: string; port?: number; monitoredProcesses?: string[]; error?: string } | null;
      };
    };
    error?: string;
  }> {
    try {
      console.log('🔄 [ALERTS] Refreshing exporter status for:', systemId);
      const response = await api.post(`/alerts/system/${systemId}/refresh-exporters`);
      console.log('🔄 [ALERTS] Exporter status refreshed:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('🔄 [ALERTS] Failed to refresh exporter status:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

export const alertsService = new AlertsService();

