import { api, handleApiError } from './api';

export interface CreateUiTestRequest {
  systemSlug: string;
  url?: string;
  description: string;
  extraDescription?: string;
  testType?: 'ui' | 'api' | 'database' | 'performance' | 'os' | 'network';
  skipAiPlan?: boolean;
}

export interface CreateUiTestRawResponse {
  success?: boolean;
  message?: string;
  data?: any;
  [key: string]: any;
}

export interface FinalizeAndRunUiTestRequest {
  title: string;
  objective: string;
  steps: string[];
  acceptanceCriteria?: string[];
  url?: string;
  systemSlug: string;
  testType?: 'ui' | 'api' | 'database' | 'performance' | 'os' | 'network';
}

export interface FinalizeAndRunUiTestResponse {
  success?: boolean;
  message?: string;
  data?: any;
  [key: string]: any;
}

export interface UiTestItem {
  _id: string;
  title: string | null;
  objective: string | null;
  testType: 'ui' | 'api' | 'database' | 'performance' | 'os' | 'network';
  systemSlug: string;
  url: string;
  description: string;
  extraDescription?: string;
  steps: string[];
  acceptanceCriteria?: string[];
  finalized: boolean;
  status: 'pending' | 'processing' | 'answered' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface ListUiTestsResponse {
  success: boolean;
  data: {
    total: number;
    page: number;
    limit: number;
    items: UiTestItem[];
  };
}

export interface GetUiTestResponse {
  success: boolean;
  data: {
    uiTest: UiTestItem;
    runs: any[];
  };
}

class UiTestsService {
  private readonly baseUrl = '/ui-tests';

  async createUiTest(payload: CreateUiTestRequest): Promise<CreateUiTestRawResponse> {
    try {
      console.log('📝 [UI-TESTS] Request:', {
        method: 'POST',
        url: `${api.defaults.baseURL}${this.baseUrl}`,
        payload,
      });

      const response = await api.post(this.baseUrl, payload);

      console.log('✅ [UI-TESTS] Response status:', response.status);
      console.log('📥 [UI-TESTS] Response data:', response.data);

      return response.data as CreateUiTestRawResponse;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] Request failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  async finalizeAndRun(payload: FinalizeAndRunUiTestRequest): Promise<FinalizeAndRunUiTestResponse> {
    try {
      console.log('📝 [UI-TESTS] Finalize & Run - Request:', {
        method: 'POST',
        url: `${api.defaults.baseURL}${this.baseUrl}/finalize-and-run`,
        payload,
      });

      const response = await api.post(`${this.baseUrl}/finalize-and-run`, payload);

      console.log('✅ [UI-TESTS] Finalize & Run - Response status:', response.status);
      console.log('📥 [UI-TESTS] Finalize & Run - Response data:', response.data);

      return response.data as FinalizeAndRunUiTestResponse;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] Finalize & Run - Request failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  async getRunning(): Promise<any> {
    try {
      const url = `${this.baseUrl}/run`;
      console.log('🔎 [UI-TESTS] GET running tests:', `${api.defaults.baseURL}${url}`);
      const response = await api.get(url);
      console.log('📥 [UI-TESTS] Running tests response:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] GET running tests failed:', { status, errorData, url: `${api.defaults.baseURL}${this.baseUrl}/run` });
      throw new Error(handleApiError(error));
    }
  }

  async getAll(): Promise<any> {
    try {
      const url = `${this.baseUrl}`;
      console.log('🔎 [UI-TESTS] GET all tests:', `${api.defaults.baseURL}${url}`);
      const response = await api.get(url);
      console.log('📥 [UI-TESTS] All tests response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] GET all tests failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  async getRunDetails(runId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/run/${encodeURIComponent(runId)}`;
      console.log('🔎 [UI-TESTS] GET run details:', `${api.defaults.baseURL}${url}`);
      const response = await api.get(url);
      console.log('📥 [UI-TESTS] Run details response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] GET run details failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  async getBySystemSlug(systemSlug: string): Promise<ListUiTestsResponse> {
    try {
      const url = `${this.baseUrl}?systemSlug=${encodeURIComponent(systemSlug)}&finalized=true`;
      console.log('🔎 [UI-TESTS] GET tests by system:', `${api.defaults.baseURL}${url}`);
      const response = await api.get(url);
      console.log('📥 [UI-TESTS] Tests by system response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] GET tests by system failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  async getById(uiTestId: string): Promise<GetUiTestResponse> {
    try {
      const url = `${this.baseUrl}/${encodeURIComponent(uiTestId)}`;
      console.log('🔎 [UI-TESTS] GET test by id:', `${api.defaults.baseURL}${url}`);
      const response = await api.get(url);
      console.log('📥 [UI-TESTS] Test by id response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] GET test by id failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  async delete(uiTestId: string): Promise<{ success: boolean; message: string }> {
    try {
      const url = `${this.baseUrl}/${encodeURIComponent(uiTestId)}`;
      console.log('🗑️ [UI-TESTS] DELETE test:', `${api.defaults.baseURL}${url}`);
      const response = await api.delete(url);
      console.log('📥 [UI-TESTS] Delete response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] DELETE test failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  async runExisting(uiTestId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/${encodeURIComponent(uiTestId)}/run`;
      console.log('▶️ [UI-TESTS] RUN existing test:', `${api.defaults.baseURL}${url}`);
      const response = await api.post(url);
      console.log('📥 [UI-TESTS] Run response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] RUN test failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Iniciar sessão SSH para teste de sistema
   */
  async startSshSession(uiTestId: string, credentials: { username: string; password?: string; privateKey?: string }): Promise<any> {
    try {
      const url = `${this.baseUrl}/${encodeURIComponent(uiTestId)}/start-ssh`;
      console.log('🔗 [UI-TESTS] Start SSH session:', `${api.defaults.baseURL}${url}`);
      const response = await api.post(url, { credentials });
      console.log('📥 [UI-TESTS] SSH session response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] Start SSH session failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Executar o próximo comando SSH
   */
  async executeStep(runId: string, stepIndex?: number): Promise<any> {
    try {
      const url = `${this.baseUrl}/runs/${encodeURIComponent(runId)}/execute-step`;
      console.log('🚀 [UI-TESTS] Execute step:', `${api.defaults.baseURL}${url}`, { stepIndex });
      const response = await api.post(url, stepIndex !== undefined ? { stepIndex } : {});
      console.log('📥 [UI-TESTS] Execute step response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] Execute step failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Executar um comando customizado (editado)
   */
  async executeCustomCommand(runId: string, command: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/runs/${encodeURIComponent(runId)}/execute-command`;
      console.log('🚀 [UI-TESTS] Execute custom command:', `${api.defaults.baseURL}${url}`);
      const response = await api.post(url, { command });
      console.log('📥 [UI-TESTS] Execute command response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] Execute command failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Terminar sessão SSH
   */
  async endSshSession(runId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/runs/${encodeURIComponent(runId)}/end-session`;
      console.log('🔒 [UI-TESTS] End SSH session:', `${api.defaults.baseURL}${url}`);
      const response = await api.post(url);
      console.log('📥 [UI-TESTS] End session response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] End SSH session failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obter status de uma execução com resultados dos steps
   */
  async getRunStatus(runId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/runs/${encodeURIComponent(runId)}/status`;
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] GET run status failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Cancelar uma execução em curso
   */
  async cancelRun(runId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/runs/${encodeURIComponent(runId)}/cancel`;
      console.log('🛑 [UI-TESTS] Cancel run:', `${api.defaults.baseURL}${url}`);
      const response = await api.post(url);
      console.log('📥 [UI-TESTS] Cancel response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] Cancel run failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Listar histórico de execuções
   */
  async listRuns(params?: { systemSlug?: string; uiTestId?: string; limit?: number; page?: number }): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.systemSlug) queryParams.append('systemSlug', params.systemSlug);
      if (params?.uiTestId) queryParams.append('uiTestId', params.uiTestId);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.page) queryParams.append('page', params.page.toString());

      const url = `${this.baseUrl}/runs?${queryParams.toString()}`;
      console.log('📜 [UI-TESTS] List runs:', `${api.defaults.baseURL}${url}`);
      const response = await api.get(url);
      console.log('📥 [UI-TESTS] Runs list response:', response.data);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      console.error('❌ [UI-TESTS] List runs failed:', { status, errorData });
      throw new Error(handleApiError(error));
    }
  }
}

export const uiTestsService = new UiTestsService();
export default uiTestsService;

