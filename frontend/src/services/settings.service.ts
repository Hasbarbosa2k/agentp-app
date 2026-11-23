import { api, extractApiData, handleApiError } from './api';

// Tipos para configurações do sistema
export interface SystemSettings {
  database: {
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    autoCleanup: boolean;
    retentionDays: number;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordExpiration: number;
    twoFactorRequired: boolean;
  };
  system: {
    maintenanceMode: boolean;
    allowRegistration: boolean;
    defaultUserRole: 'user' | 'editor';
  };
  notifications: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    discordEnabled: boolean;
  };
  monitoring: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableMetrics: boolean;
    alertThresholds: {
      cpu: number;
      memory: number;
      disk: number;
    };
  };
}

export interface SettingsSummary {
  systemStatus: 'operational' | 'maintenance' | 'degraded';
  lastBackup: string;
  activeUsers: number;
  totalUsers: number;
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface DatabaseSettings {
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  autoCleanup: boolean;
  retentionDays: number;
}

export interface SecuritySettings {
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordExpiration: number;
  twoFactorRequired: boolean;
}

export interface AppearanceSettings {
  defaultTheme: 'light' | 'dark';
  defaultAccentColor: string;
  allowCustomThemes: boolean;
}

export interface AdvancedSettings {
  debugMode: boolean;
  detailedLogs: boolean;
  maintenanceMode: boolean;
}

export interface SettingsExport {
  exportDate: string;
  settings: SystemSettings;
}

export class SettingsService {
  /**
   * Obter todas as configurações do sistema
   */
  async getAllSettings(): Promise<SystemSettings> {
    try {
      const response = await api.get('/settings');
      return extractApiData<SystemSettings>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obter resumo das configurações
   */
  async getSettingsSummary(): Promise<SettingsSummary> {
    try {
      const response = await api.get('/settings/summary');
      return extractApiData<SettingsSummary>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Actualizar configurações de base de dados
   */
  async updateDatabaseSettings(settings: Partial<DatabaseSettings>): Promise<DatabaseSettings> {
    try {
      const response = await api.put('/settings/database', settings);
      return extractApiData<DatabaseSettings>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Actualizar configurações de aparência
   */
  async updateAppearanceSettings(settings: Partial<AppearanceSettings>): Promise<AppearanceSettings> {
    try {
      const response = await api.put('/settings/appearance', settings);
      return extractApiData<AppearanceSettings>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Actualizar configurações avançadas
   */
  async updateAdvancedSettings(settings: Partial<AdvancedSettings>): Promise<AdvancedSettings> {
    try {
      const response = await api.put('/settings/advanced', settings);
      return extractApiData<AdvancedSettings>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Actualizar configurações de segurança
   */
  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
    try {
      const response = await api.put('/settings/security', settings);
      return extractApiData<SecuritySettings>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Exportar configurações
   */
  async exportSettings(): Promise<SettingsExport> {
    try {
      const response = await api.get('/settings/export');
      return extractApiData<SettingsExport>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Importar configurações
   */
  async importSettings(settings: Partial<SystemSettings>): Promise<void> {
    try {
      await api.post('/settings/import', { settings });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

// Instância singleton
export const settingsService = new SettingsService(); 