import { api } from './api';

// Tipos para Issue Helper
export interface CreateIssueMessageRequest {
  systemId: string;
  subject?: string;
  message: string;
  context?: unknown;
}

export type IssueStatus = 'answered' | 'failed' | 'processing' | 'pending';

export interface AiReference {
  idx: number;
  path: string;
  score?: number;
}

export interface AiResponsePayload {
  text?: string;
  structured?: any;
  references?: AiReference[];
}

export interface AiMetaPayload {
  provider?: string;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  cost?: number;
}

export interface IssueMessage {
  id: string;
  systemId: string;
  subject?: string;
  message: string;
  context?: unknown;
  aiResponse?: AiResponsePayload | null;
  status: IssueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueMessageResponse {
  success: boolean;
  message?: string;
  data: IssueMessage;
}

export interface ListMyIssuesParams {
  status?: IssueStatus | '';
  limit?: number;
  since?: string; // ISO date string
}

export type ListMyIssuesResponse = IssueMessage[];

export interface SaveAIResponseRequest {
  aiResponse: AiResponsePayload;
  status: IssueStatus;
  aiMeta?: AiMetaPayload;
}

export interface SaveAIResponse {
  success: boolean;
  message?: string;
  data: IssueMessage;
}

class IssueHelperService {
  private baseUrl = '/issue-helper';

  async createMessage(payload: CreateIssueMessageRequest): Promise<IssueMessage> {
    console.log('📝 [ISSUE-HELPER][CREATE] Payload:', payload);
    const response = await api.post<CreateIssueMessageResponse>(`${this.baseUrl}/`, payload);
    console.log('📝 [ISSUE-HELPER][CREATE] Response:', response.data);
    return response.data.data;
  }

  async listMyMessages(params?: ListMyIssuesParams): Promise<IssueMessage[]> {
    const search = new URLSearchParams();
    if (params?.status !== undefined && params.status !== '') search.append('status', params.status);
    if (params?.limit !== undefined) search.append('limit', String(params.limit));
    if (params?.since !== undefined) search.append('since', params.since);

    const url = search.toString() ? `${this.baseUrl}/me?${search.toString()}` : `${this.baseUrl}/me`;
    console.log('📥 [ISSUE-HELPER][LIST-ME] GET', url);
    const response = await api.get<{ success: boolean; data: IssueMessage[] }>(url);
    console.log('📥 [ISSUE-HELPER][LIST-ME] Response:', response.data);
    return response.data.data;
  }

  async saveAIResponse(issueId: string, payload: SaveAIResponseRequest): Promise<IssueMessage> {
    console.log('🤖 [ISSUE-HELPER][AI-RESPONSE] POST', `${this.baseUrl}/${issueId}/ai-response`, payload);
    const response = await api.post<SaveAIResponse>(`${this.baseUrl}/${issueId}/ai-response`, payload);
    console.log('🤖 [ISSUE-HELPER][AI-RESPONSE] Response:', response.data);
    return response.data.data;
  }

  async listBySystem(systemId: string, params?: { limit?: number; since?: string; status?: IssueStatus }): Promise<IssueMessage[]> {
    const search = new URLSearchParams();
    if (params?.status) search.append('status', params.status);
    if (params?.limit !== undefined) search.append('limit', String(params.limit));
    if (params?.since !== undefined) search.append('since', params.since);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    console.log('📥 [ISSUE-HELPER][LIST-SYSTEM] GET', `${this.baseUrl}/system/${systemId}${suffix}`);
    const response = await api.get<{ success: boolean; data: IssueMessage[] }>(`${this.baseUrl}/system/${systemId}${suffix}`);
    console.log('📥 [ISSUE-HELPER][LIST-SYSTEM] Response:', response.data);
    return response.data.data;
  }

  async solve(issueId: string, payload: { system: string; issue: string; topK?: number; options?: Record<string, unknown> }): Promise<{ status: IssueStatus; aiResponse?: AiResponsePayload | null }> {
    console.log('🧠 [ISSUE-HELPER][SOLVE] POST', `${this.baseUrl}/${issueId}/solve`, payload);
    const response = await api.post<{ success: boolean; message: string; data: { _id: string; status: IssueStatus; aiResponse?: AiResponsePayload | null } }>(
      `${this.baseUrl}/${issueId}/solve`,
      payload
    );
    console.log('🧠 [ISSUE-HELPER][SOLVE] Response:', response.data);
    return { status: response.data.data.status, aiResponse: (response.data.data as any).aiResponse ?? null };
  }
}

export const issueHelperService = new IssueHelperService();

