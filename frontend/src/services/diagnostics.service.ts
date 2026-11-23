import { api, handleApiError, extractApiData } from './api';

export interface DiagnosticsCredentials {
  username: string;
  password?: string;
  privateKey?: string;
  privateKeyPath?: string;
}

export interface RunDiagnosticsResponse {
  success: boolean;
  message?: string;
  data?: any;
}

class DiagnosticsService {
  async runDiagnostics(systemId: string, credentials: DiagnosticsCredentials): Promise<RunDiagnosticsResponse> {
    try {
      const payload = { credentials };
      // Debug request (sanitized)
      try {
        const safe = {
          systemId,
          credentials: {
            username: credentials.username,
            hasPassword: !!credentials.password,
            passwordLength: credentials.password?.length || 0,
            hasPrivateKey: !!credentials.privateKey,
            privateKeyLength: credentials.privateKey?.length || 0,
            privateKeyPath: credentials.privateKeyPath || undefined,
          },
        };
        console.log('🚀 [DIAGNOSTICS][RUN] Request:', safe);
      } catch {}

      // Remover/estender timeout no lado do cliente para permitir execução longa
      const response = await api.post(`/diagnostics/${systemId}/run`, payload, {
        timeout: 0, // sem timeout no cliente
        maxContentLength: Infinity as unknown as number,
        maxBodyLength: Infinity as unknown as number,
      } as any);
      console.log('✅ [DIAGNOSTICS][RUN] Response:', response.data);
      // Some backends wrap in { success, data }, others in data.data
      const data = (response.data && response.data.success !== undefined)
        ? response.data as RunDiagnosticsResponse
        : ({ success: true, data: extractApiData<any>(response) });
      return data;
    } catch (error: any) {
      console.error('❌ [DIAGNOSTICS][RUN] Error:', error);
      // Enriquecer mensagem de erro com status e texto do backend
      const status = error?.response?.status;
      const statusText = error?.response?.statusText;
      const apiMsg = error?.response?.data?.message || error?.response?.data?.error;
      if (status) {
        throw new Error(`${status} ${statusText || ''} - ${apiMsg || error.message}`.trim());
      }
      throw new Error(handleApiError(error));
    }
  }
}

export const diagnosticsService = new DiagnosticsService();

