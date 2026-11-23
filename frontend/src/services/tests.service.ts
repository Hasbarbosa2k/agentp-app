import { api } from './api';

// ===========================
// Interfaces TypeScript para Testes
// ===========================

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  steps: string[];
  expectedResult: string;
  estimatedTime: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  tags?: string[];
}

export interface TestSuite {
  name: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  testCases: TestCase[];
}

export interface TestStatistics {
  totalSuites: number;
  totalTestCases: number;
  priorityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
}

export interface TestExecutionResults {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

export interface TestExecution {
  id: string;
  executedAt: string;
  executedBy: {
    username: string;
    email: string;
    displayName: string;
  };
  environment: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    completed: number;
    total: number;
  };
  results: TestExecutionResults;
  duration: string;
  passRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserInfo {
  username: string;
  email: string;
  displayName: string;
}

export interface TestDetails {
  // Informações básicas
  id: string;
  title: string;
  description: string;
  systemInfo: string;
  features: string[];
  context?: string;
  constraints?: string;
  scope?: string[];
  status: 'active' | 'inactive' | 'draft';
  isTemplate: boolean;
  tags: string[];
  
  // Configurações
  testTypes: string[];
  testEnvironments: string[];
  estimatedDuration: string;
  totalTestCases: number;
  
  // Test Suites e Cases
  testSuites: TestSuite[];
  
  // Estatísticas
  statistics: TestStatistics;
  
  // Histórico de execuções
  recentExecutions: TestExecution[];
  
  // Metadados
  createdBy: UserInfo;
  updatedBy: UserInfo;
  createdAt: string;
  updatedAt: string;
}

export interface TestDetailsResponse {
  success: true;
  message: string;
  data: {
    test: TestDetails;
  };
}

export interface TestListItem {
  id: string;
  title: string;
  status: string;
  totalTestCases: number;
  estimatedDuration: string;
  lastExecuted?: string;
  passRate?: number;
}

export interface TestListResponse {
  success: true;
  data: {
    tests: TestListItem[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
    };
  };
}

// ===========================
// Classe do Serviço de Testes
// ===========================

class TestsService {
  private baseUrl = '/tests';

  /**
   * Busca detalhes completos de um teste específico
   */
  async getTestDetails(testId: string): Promise<TestDetails> {
    try {
      console.log('🔍 Buscando detalhes do teste:', testId);
      
      const response = await api.get(`${this.baseUrl}/${testId}`);
      const data = response.data as TestDetailsResponse;
      
      // 🔍 LOG COMPLETO PARA DEBUG
      console.log('✅ DETALHES DO TESTE - RESPOSTA COMPLETA:');
      console.log('📋 Status:', data.success);
      console.log('🔗 URL:', `${this.baseUrl}/${testId}`);
      console.log('📥 Response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        const test = data.data.test;
        
        // Log específico das informações do teste
        console.log('🎯 Teste carregado:', {
          id: test.id,
          title: test.title,
          totalSuites: test.testSuites?.length || 0,
          totalCases: test.totalTestCases,
          totalExecutions: test.recentExecutions?.length || 0,
          estimatedDuration: test.estimatedDuration
        });
        
        // Log detalhado das test suites
        if (test.testSuites) {
          console.log('📚 Test Suites encontradas:', test.testSuites.length);
          test.testSuites.forEach((suite, index) => {
            console.log(`📋 Suite ${index + 1}: ${suite.name} (${suite.testCases?.length || 0} cases)`);
            if (suite.testCases) {
              suite.testCases.forEach((testCase, caseIndex) => {
                console.log(`  🧪 Case ${caseIndex + 1}: ${testCase.title} (${testCase.steps?.length || 0} steps)`);
              });
            }
          });
        }
        
        // Log das execuções recentes
        if (test.recentExecutions) {
          console.log('🔄 Execuções recentes:', test.recentExecutions.length);
          test.recentExecutions.forEach((execution, index) => {
            console.log(`  📊 Execução ${index + 1}: ${execution.status} (${execution.passRate}% pass rate)`);
          });
        }
        
        return test;
      }
      
      throw new Error(data.message || 'Error fetching test details');
    } catch (error) {
      console.error('❌ Error fetching test details:', error);
      this.handleTestError(error);
      throw error;
    }
  }

  /**
   * Lista todos os testes do usuário
   */
  async getTests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ tests: TestListItem[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);
      
      const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
      const response = await api.get(url);
      const data = response.data as TestListResponse;
      
      console.log('📋 Lista de testes carregada:', {
        total: data.data.tests.length,
        page: data.data.pagination.currentPage,
        totalPages: data.data.pagination.totalPages
      });
      
      if (data.success) {
        return {
          tests: data.data.tests,
          pagination: data.data.pagination
        };
      }
      
      throw new Error('Erro ao carregar lista de testes');
    } catch (error) {
      console.error('❌ Erro ao carregar testes:', error);
      this.handleTestError(error);
      throw error;
    }
  }

  /**
   * Executa um teste específico
   */
  async executeTest(testId: string, environment?: string): Promise<TestExecution> {
    try {
      console.log('🚀 Executando teste:', testId, 'no ambiente:', environment || 'default');
      
      const response = await api.post(`${this.baseUrl}/${testId}/execute`, {
        environment: environment || 'testing'
      });
      
      const data = response.data as any;
      
      console.log('✅ Teste executado:', {
        testId,
        executionId: data.data?.execution?.id,
        status: data.data?.execution?.status
      });
      
      if (data.success) {
        return data.data.execution;
      }
      
      throw new Error(data.message || 'Erro ao executar teste');
    } catch (error) {
      console.error('❌ Erro ao executar teste:', error);
      this.handleTestError(error);
      throw error;
    }
  }

  /**
   * Para a execução de um teste
   */
  async stopTestExecution(executionId: string): Promise<void> {
    try {
      console.log('⏹️ Parando execução:', executionId);
      
      const response = await api.post(`/executions/${executionId}/stop`);
      const data = response.data as any;
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao parar execução');
      }
      
      console.log('✅ Execução parada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao parar execução:', error);
      this.handleTestError(error);
      throw error;
    }
  }

  /**
   * Busca execuções de um teste específico
   */
  async getTestExecutions(testId: string, limit = 10): Promise<TestExecution[]> {
    try {
      const response = await api.get(`${this.baseUrl}/${testId}/executions?limit=${limit}`);
      const data = response.data as any;
      
      console.log('📊 Execuções do teste carregadas:', {
        testId,
        total: data.data?.executions?.length || 0
      });
      
      if (data.success) {
        return data.data.executions || [];
      }
      
      throw new Error(data.message || 'Erro ao carregar execuções');
    } catch (error) {
      console.error('❌ Erro ao carregar execuções:', error);
      this.handleTestError(error);
      throw error;
    }
  }

  /**
   * Verifica se um teste existe e está disponível
   */
  async testExists(testId: string): Promise<boolean> {
    try {
      await this.getTestDetails(testId);
      return true;
    } catch (error) {
      console.log('ℹ️ Teste não encontrado:', testId);
      return false;
    }
  }

  /**
   * Calcula estatísticas de um teste
   */
  calculateTestStatistics(test: TestDetails): TestStatistics {
    let totalSuites = test.testSuites?.length || 0;
    let totalTestCases = 0;
    let priorityBreakdown = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };

    test.testSuites?.forEach(suite => {
      totalTestCases += suite.testCases?.length || 0;
      
      suite.testCases?.forEach(testCase => {
        priorityBreakdown[testCase.priority]++;
      });
    });

    return {
      totalSuites,
      totalTestCases,
      priorityBreakdown
    };
  }

  /**
   * Tratamento centralizado de erros de testes
   */
  private handleTestError(error: any): void {
    if (error.response?.status === 401) {
      console.error('🔐 Token de autenticação inválido para testes');
    } else if (error.response?.status === 404) {
      console.error('🔍 Teste não encontrado');
    } else if (error.response?.status === 403) {
      console.error('🚫 Sem permissão para acessar este teste');
    } else if (error.response?.status === 400) {
      console.error('📝 Parâmetros inválidos:', error.response?.data?.message);
    } else if (error.response?.status === 500) {
      console.error('🔧 Erro interno do servidor de testes');
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      console.error('🌐 Erro de conexão com serviço de testes');
    }
  }
}

// Exportar instância singleton
export const testsService = new TestsService();
export default testsService; 