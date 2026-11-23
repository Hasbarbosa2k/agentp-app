import { api } from './api';
import { StepValidationResult } from '../types/template.types';

// Types for onboarding
export interface OnboardingCredentials {
  username: string;
  password?: string;
  privateKey?: string;
  privateKeyPath?: string;
}

// Types for onboarding status response
export interface OnboardingStep {
  step: string;
  command: string;
  description: string;
  status: 'success' | 'failed' | 'pending' | 'in_progress';
  output: string;
  error: string | null;
  startedAt: string;
  endedAt?: string;
  duration: number;
  retryCount?: number;
  timeout?: number;
  retryable?: boolean;
  category: string;
  required?: boolean;
  hasValidations?: boolean;
}

export interface OnboardingLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  source: string;
}

export interface OSInfo {
  id: string;
  version: string;
  like: string;
  name: string;
  prettyName: string;
  versionCodename: string;
  architecture: string;
  kernel: string;
}

export interface NetworkInfo {
  connectivity: boolean;
  responseTime: number;
  lastPingAt: string;
}

export interface InitiatedBy {
  _id: string;
  username: string;
  email: string;
  displayName: string;
}

export interface TemplateInfo {
  id: string;
  name: string;
  version: string;
  category: string;
  totalValidations: number;
}

export interface OnboardingData {
  _id: string;
  systemId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  startedAt: string;
  completedAt?: string;
  detailedStatus: string;
  osInfo?: OSInfo;
  networkInfo?: NetworkInfo;
  initiatedBy?: InitiatedBy;
  steps: OnboardingStep[];
  logs: OnboardingLog[];
  template?: TemplateInfo;
  templateId?: string;
  templateName?: string;
  templateVersion?: string;
}

export interface SystemInfo {
  id: string;
  name: string;
  ip: string;
  onboardingStatus: string;
  onboardingStatusDisplay: string;
  lastOnboardingAt?: string;
}

export interface OnboardingStatusResponse {
  success: boolean;
  message: string;
  data: {
    hasOnboarding: boolean;
    onboarding?: OnboardingData;
    system?: SystemInfo;
    systemOnboardingStatus?: string;
    onboardingRequired?: boolean;
    needsOnboarding?: boolean;
  };
}

export interface OnboardingOptions {
  autoRetry?: boolean;
  maxRetries?: number;
  timeout?: number;
  continueOnFailure?: boolean;
  connectionTimeout?: number;
}

export interface OnboardingCustomStep {
  name: string;
  command: string;
  description?: string;
  timeout?: number;
  retryable?: boolean;
  required?: boolean;
  category?: string;
}

export interface OnboardingConfig {
  stopOnFirstError?: boolean;
  allowParallelExecution?: boolean;
  globalTimeout?: number;
  maxRetries?: number;
}

export interface StartOnboardingRequest {
  systemId: string;
  templateId?: string; // Opcional: se não fornecido, apenas passos base são executados
  customSteps?: OnboardingCustomStep[];
  config?: OnboardingConfig;
}

export interface ExecuteStepRequest {
  output: string;
  error?: string | null;
  osInfo?: OSInfo;
}

export interface ExecuteStepResponse {
  step: OnboardingStep;
  stepIndex: number;
  onboardingStatus: string;
  progress: number;
  detailedStatus: any;
  validations?: StepValidationResult;
}

export interface RunOnboardingExecutionRequest {
  systemId: string;
  credentials: OnboardingCredentials;
  options?: OnboardingOptions;
}

export class OnboardingService {
  /**
   * Inicia um processo de onboarding
   * Suporta templates ou steps customizados
   */
  async startOnboarding(request: StartOnboardingRequest): Promise<any> {
    try {
      // templateId é opcional - se não fornecido, apenas passos base são executados
      const templateInfo = request.templateId 
        ? `with template ${request.templateId}` 
        : 'with base steps only (no template)';
      
      console.log(`🚀 [ONBOARDING] Starting onboarding process ${templateInfo}:`, request);
      const response = await api.post('/onboarding/start', request);
      console.log('🚀 [ONBOARDING] Onboarding started successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('🚀 [ONBOARDING] Failed to start onboarding:', error);
      throw error;
    }
  }

  /**
   * Executa um step específico do onboarding
   */
  async executeStep(onboardingId: string, stepIndex: number, request: ExecuteStepRequest): Promise<ExecuteStepResponse> {
    try {
      console.log('⚡ [ONBOARDING] Executing step:', { onboardingId, stepIndex, request });
      const response = await api.post(`/onboarding/${onboardingId}/step/${stepIndex}/execute`, request);
      console.log('⚡ [ONBOARDING] Step executed successfully:', response.data);
      return (response.data as any).data;
    } catch (error) {
      console.error('⚡ [ONBOARDING] Failed to execute step:', error);
      throw error;
    }
  }

  async runOnboardingExecution(request: RunOnboardingExecutionRequest): Promise<any> {
    try {
      console.log('🚀 [ONBOARDING-EXECUTION] Sending request:', JSON.stringify(request, null, 2));
      console.log('🔐 [ONBOARDING-EXECUTION] Full credentials being sent:', {
        systemId: request.systemId,
        username: request.credentials.username,
        password: request.credentials.password || 'NOT_SENT',
        privateKey: request.credentials.privateKey ? 'PRIVATE_KEY_SENT' : 'NOT_SENT',
        hasPassword: !!request.credentials.password,
        passwordLength: request.credentials.password?.length || 0,
        fullPassword: request.credentials.password || 'NO_PASSWORD'
      });
      
      // Log simples e visível para debug
      console.log('🔐 [ONBOARDING-EXECUTION] PASSWORD DEBUG:', request.credentials.password);
      console.log('🔐 [ONBOARDING-EXECUTION] USERNAME DEBUG:', request.credentials.username);
      console.log('🔐 [ONBOARDING-EXECUTION] SYSTEM ID DEBUG:', request.systemId);
      const response = await api.post('/onboarding-execution/run', request);
      console.log('🚀 [ONBOARDING-EXECUTION] Response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [ONBOARDING-EXECUTION] Failed to run onboarding execution:', error);
      if (error.response?.data) {
        console.error('❌ [ONBOARDING-EXECUTION] Error details:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Monitora progresso de onboarding em tempo real via Server-Sent Events (SSE)
   * ENDPOINT ATIVO: GET /onboarding/realtime
   */
  subscribeToRealtimeUpdates(systemId: string, onUpdate: (data: any) => void): () => void {
    try {
      console.log('🔄 [ONBOARDING-REALTIME] Starting real-time monitoring for system:', systemId);
      
      const eventSource = new EventSource(`${api.defaults.baseURL}/onboarding/realtime?systemId=${systemId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 [ONBOARDING-REALTIME] Received update:', data);
          onUpdate(data);
        } catch (error) {
          console.error('❌ [ONBOARDING-REALTIME] Failed to parse event data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ [ONBOARDING-REALTIME] EventSource error:', error);
      };

      // Return cleanup function
      return () => {
        console.log('🔄 [ONBOARDING-REALTIME] Closing real-time connection');
        eventSource.close();
      };
      
    } catch (error) {
      console.error('❌ [ONBOARDING-REALTIME] Failed to start real-time monitoring:', error);
      throw error;
    }
  }

  async testConnection(request: {
    host: string;
    port?: number;
    credentials: OnboardingCredentials;
  }): Promise<any> {
    try {
      console.log('🔌 [SSH-TEST] Starting SSH connection test:', request);
      console.log('🔐 [SSH-TEST] Full credentials being sent:', {
        host: request.host,
        port: request.port,
        username: request.credentials.username,
        password: request.credentials.password || 'NOT_SENT',
        privateKey: request.credentials.privateKey ? 'PRIVATE_KEY_SENT' : 'NOT_SENT',
        hasPassword: !!request.credentials.password,
        passwordLength: request.credentials.password?.length || 0,
        fullPassword: request.credentials.password || 'NO_PASSWORD'
      });
      
      // Log simples e visível para debug
      console.log('🔐 [SSH-TEST] PASSWORD DEBUG:', request.credentials.password);
      console.log('🔐 [SSH-TEST] USERNAME DEBUG:', request.credentials.username);
      console.log('🔐 [SSH-TEST] HOST DEBUG:', request.host);
      
      // Alert temporário para debug (remover depois)
      if (request.credentials.password) {
        console.log('🔐 [SSH-TEST] ALERT: Password encontrada:', request.credentials.password);
      } else {
        console.log('🔐 [SSH-TEST] ALERT: Password NÃO encontrada!');
      }
      const response = await api.post('/onboarding-execution/test-connection', request);
      console.log('🔌 [SSH-TEST] SSH connection test response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔌 [SSH-TEST] Failed to test SSH connection:', error);
      throw error;
    }
  }

  /**
   * Obtém o status completo do onboarding de um sistema específico
   * Este endpoint retorna TODOS os dados possíveis sobre o onboarding
   */
  async getOnboardingStatus(systemId: string): Promise<OnboardingStatusResponse> {
    try {
      console.log('📊 [ONBOARDING-STATUS] Getting complete onboarding status for system:', systemId);
      const response = await api.get(`/onboarding/system/${systemId}`);
      console.log('📊 [ONBOARDING-STATUS] Complete onboarding data received:', response.data);
      return response.data as OnboardingStatusResponse;
    } catch (error) {
      console.error('📊 [ONBOARDING-STATUS] Failed to get onboarding status:', error);
      throw error;
    }
  }

  /**
   * Reseta o status de onboarding de um sistema (útil quando está em estado failed)
   */
  async resetOnboardingStatus(systemId: string): Promise<any> {
    try {
      console.log('🔄 [ONBOARDING-RESET] Resetting onboarding status for system:', systemId);
      const response = await api.post(`/onboarding/system/${systemId}/reset`);
      console.log('🔄 [ONBOARDING-RESET] Onboarding status reset successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔄 [ONBOARDING-RESET] Failed to reset onboarding status:', error);
      throw error;
    }
  }
}

export const onboardingService = new OnboardingService(); 