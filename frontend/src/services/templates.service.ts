import { api, ApiResponse, extractApiData, handleApiError } from './api';
import {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CloneTemplateRequest,
  TemplateListQuery,
  TemplateListResponse,
  TemplateResponse,
  CloneTemplateResponse,
  ValidationTestOutput,
  ValidationTestResult,
} from '../types/template.types';

export class TemplatesService {
  /**
   * Lista todos os templates com filtros opcionais
   */
  async getTemplates(query: TemplateListQuery = {}): Promise<TemplateListResponse> {
    try {
      console.log('📋 [TEMPLATES] Fetching templates with query:', query);
      
      const params = new URLSearchParams();
      if (query.category) params.append('category', query.category);
      if (query.status) params.append('status', query.status);
      if (query.search) params.append('search', query.search);
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());

      const response = await api.get(`/templates?${params.toString()}`);
      console.log('📋 [TEMPLATES] Templates fetched successfully:', response.data);
      
      return extractApiData<TemplateListResponse>(response);
    } catch (error) {
      console.error('📋 [TEMPLATES] Failed to fetch templates:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obtém um template específico por ID
   */
  async getTemplate(templateId: string): Promise<Template> {
    try {
      console.log('📋 [TEMPLATES] Fetching template:', templateId);
      
      const response = await api.get(`/templates/${templateId}`);
      console.log('📋 [TEMPLATES] Template fetched successfully:', response.data);
      
      return extractApiData<TemplateResponse>(response).template;
    } catch (error) {
      console.error('📋 [TEMPLATES] Failed to fetch template:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Cria um novo template
   */
  async createTemplate(templateData: CreateTemplateRequest): Promise<Template> {
    try {
      console.log('📋 [TEMPLATES] Creating template with request data:');
      console.log('📋 [TEMPLATES] - Name:', templateData.name);
      console.log('📋 [TEMPLATES] - Category:', templateData.category);
      console.log('📋 [TEMPLATES] - SupportedOS:', templateData.supportedOS);
      console.log('📋 [TEMPLATES] - Steps count:', templateData.steps.length);
      console.log('📋 [TEMPLATES] - Full payload:', JSON.stringify(templateData, null, 2));
      
      const response = await api.post('/templates', templateData);
      console.log('📋 [TEMPLATES] Template created successfully:', response.data);
      
      return extractApiData<TemplateResponse>(response).template;
    } catch (error: any) {
      console.error('📋 [TEMPLATES] Failed to create template:', error);
      console.error('📋 [TEMPLATES] Error response:', error.response?.data);
      console.error('📋 [TEMPLATES] Error status:', error.response?.status);
      
      // More specific error handling
      if (error.response?.data?.details) {
        console.error('📋 [TEMPLATES] Validation details:', error.response.data.details);
      }
      
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Atualiza um template existente
   */
  async updateTemplate(templateId: string, templateData: UpdateTemplateRequest): Promise<Template> {
    try {
      console.log('📋 [TEMPLATES] Updating template:', templateId, templateData);
      
      const response = await api.put(`/templates/${templateId}`, templateData);
      console.log('📋 [TEMPLATES] Template updated successfully:', response.data);
      
      return extractApiData<TemplateResponse>(response).template;
    } catch (error) {
      console.error('📋 [TEMPLATES] Failed to update template:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Deleta um template (soft delete por padrão, hard delete com force: true)
   */
  async deleteTemplate(templateId: string, options?: { reason?: string; force?: boolean }): Promise<{ id: string; name: string }> {
    try {
      console.log('📋 [TEMPLATES] Deleting template:', templateId, options);
      
      const reason = options?.reason || 'No reason provided';
      const force = options?.force || false;
      
      // Use query params for DELETE as some servers don't support body
      const params = new URLSearchParams();
      if (reason) params.append('reason', reason);
      if (force) params.append('force', 'true');
      
      const url = `/templates/${templateId}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.delete(url);
      console.log('📋 [TEMPLATES] Template deleted successfully:', response.data);
      
      // Handle both archivedTemplate and deletedTemplate responses
      const data = extractApiData<any>(response);
      return data.deletedTemplate || data.archivedTemplate || { id: templateId, name: 'Unknown' };
    } catch (error) {
      console.error('📋 [TEMPLATES] Failed to delete template:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Clona um template existente
   */
  async cloneTemplate(templateId: string, cloneData: CloneTemplateRequest): Promise<{ template: Template; originalTemplate: Template }> {
    try {
      console.log('📋 [TEMPLATES] Cloning template:', templateId, cloneData);
      
      const response = await api.post(`/templates/${templateId}/clone`, cloneData);
      console.log('📋 [TEMPLATES] Template cloned successfully:', response.data);
      
      return extractApiData<CloneTemplateResponse>(response);
    } catch (error) {
      console.error('📋 [TEMPLATES] Failed to clone template:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Testa validações de um template
   */
  async testTemplateValidations(templateId: string, testOutputs: ValidationTestOutput[]): Promise<ValidationTestResult> {
    try {
      console.log('📋 [TEMPLATES] Testing template validations:', templateId, testOutputs);
      
      const response = await api.post(`/templates/${templateId}/test-validations`, {
        testOutputs
      });
      console.log('📋 [TEMPLATES] Template validations tested successfully:', response.data);
      
      return extractApiData<ValidationTestResult>(response);
    } catch (error) {
      console.error('📋 [TEMPLATES] Failed to test template validations:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obtém templates ativos por categoria
   */
  async getActiveTemplatesByCategory(category: string): Promise<Template[]> {
    const result = await this.getTemplates({ 
      category: category as any, 
      status: 'active' 
    });
    return result.templates;
  }

  /**
   * Restaura um template arquivado
   */
  async restoreTemplate(templateId: string, newStatus: 'active' | 'draft' = 'active'): Promise<Template> {
    try {
      console.log('📋 [TEMPLATES] Restoring template:', templateId, 'with status:', newStatus);
      
      const response = await api.post(`/templates/${templateId}/restore`, { newStatus });
      console.log('📋 [TEMPLATES] Template restored successfully:', response.data);
      
      return extractApiData<TemplateResponse>(response).template;
    } catch (error) {
      console.error('📋 [TEMPLATES] Failed to restore template:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obtém estatísticas gerais dos templates
   */
  async getTemplateStats(): Promise<{ active: number; draft: number; archived: number; byCategory: Record<string, number> }> {
    const result = await this.getTemplates({ limit: 1 }); // Só precisamos das stats
    return result.stats;
  }
}

export const templatesService = new TemplatesService();