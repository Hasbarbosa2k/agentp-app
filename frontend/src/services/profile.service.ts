import { api, extractApiData, handleApiError } from './api';
import { User } from './auth.service';

// Tipos para perfil
export interface ProfileData {
  id: string;
  email: string;
  displayName: string;
  team?: string;
  role: string;
  lastLoginAt?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  email?: string;
  team?: string;
}

export interface UserPreferences {
  notifications: {
    testCompletion: boolean;
    systemAlerts: boolean;
    emailReports: boolean;
  };
  appearance: {
    theme: 'light' | 'dark';
    accentColor: string;
  };
  advanced: {
    debugMode: boolean;
    detailedLogs: boolean;
  };
}

export interface UpdatePreferencesData {
  notifications?: Partial<UserPreferences['notifications']>;
  appearance?: Partial<UserPreferences['appearance']>;
  advanced?: Partial<UserPreferences['advanced']>;
}

export class ProfileService {
  /**
   * Obter perfil do utilizador atual
   */
  async getProfile(): Promise<ProfileData> {
    try {
      const response = await api.get('/profile');
      const data = extractApiData<{ profile: ProfileData }>(response);
      return data.profile;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Actualizar perfil do utilizador
   */
  async updateProfile(data: UpdateProfileData): Promise<ProfileData> {
    try {
      const response = await api.put('/profile', data);
      return extractApiData<ProfileData>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obter preferências do utilizador
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await api.get('/profile/preferences');
      return extractApiData<UserPreferences>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Actualizar preferências do utilizador
   */
  async updatePreferences(preferences: UpdatePreferencesData): Promise<UserPreferences> {
    try {
      const response = await api.put('/profile/preferences', preferences);
      return extractApiData<UserPreferences>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

// Instância singleton
export const profileService = new ProfileService(); 