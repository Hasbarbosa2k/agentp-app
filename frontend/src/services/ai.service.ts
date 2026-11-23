import { api } from './api';

// ===========================
// Interfaces TypeScript
// ===========================

export interface AIEngine {
  name: string;
  model: string;
  tokens: number;
}

export interface TestStep {
  step: number;
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  preconditions: string[];
  steps: TestStep[];
  testData: string;
  expectedResult: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  type: 'functional' | 'performance' | 'security' | 'integration';
  estimatedTime: string;
}

export interface TestSuite {
  name: string;
  description: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  testCases: TestCase[];
}

export interface TestPlan {
  title: string;
  description: string;
  testSuites: TestSuite[];
  riskAnalysis: string[];
  resources: {
    personnel: string;
    tools: string[];
    environments: string[];
  };
  schedule: {
    estimatedDuration: string;
    phases: Array<{
      phase: string;
      duration: string;
      activities: string[];
    }>;
  };
}

export interface GenerateTestPlanRequest {
  systemInfo: string;
  features: string[];
  context?: string;
  constraints?: string;
}

export interface GenerateTestPlanResponse {
  success: true;
  timestamp: string;
  duration: string;
  input: GenerateTestPlanRequest;
  engine: AIEngine;
  result: {
    content: string;
    parsedContent?: {
      testPlan: TestPlan;
    };
  };
}

export interface GenerateTestCasesRequest {
  feature: string;
  description: string;
  requirements: string;
}

export interface GenerateTestCasesResponse {
  success: true;
  testCases: TestCase[];
}

export interface AnalyzeRisksRequest {
  systemInfo: string;
  features: string[];
  environment: string;
}

export interface RiskAnalysis {
  risks: Array<{
    category: string;
    description: string;
    impact: 'Alta' | 'Média' | 'Baixa';
    probability: 'Alta' | 'Média' | 'Baixa';
    mitigation: string;
  }>;
}

export interface AnalyzeRisksResponse {
  success: true;
  riskAnalysis: RiskAnalysis;
}

export interface AIScenario {
  id: string;
  name: string;
  description: string;
  features: string[];
}

export interface ScenariosResponse {
  success: true;
  scenarios: AIScenario[];
}

export interface GenerateFromScenarioRequest {
  scenario: string;
  customization?: {
    projectName?: string;
    additionalFeatures?: string[];
  };
}

export interface AIInfo {
  generator: {
    name: string;
    version: string;
  };
  engine: {
    name: string;
    defaultModel: string;
    configured: boolean;
    supportedModels: string[];
  };
  scenarios: string[];
  historyCount: number;
}

export interface AIInfoResponse {
  success: true;
  data: AIInfo;
}

export interface TestConnectionResponse {
  success: true;
  message: string;
  data: {
    configured: boolean;
    model: string;
    response: string;
  };
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  type: 'test-plan' | 'test-cases' | 'risk-analysis' | 'scenario';
  request: any;
  response: any;
}

export interface HistoryResponse {
  success: true;
  history: HistoryEntry[];
}

export interface AIErrorResponse {
  success: false;
  message: string;
  error?: string;
  example?: any;
}

// ===========================
// Classe do Serviço de IA
// ===========================

class AIService {
  private baseUrl = '/ai';

  /**
   * Gera um plano de teste completo (ENDPOINT PRINCIPAL)
   */
  async generateTestPlan(request: GenerateTestPlanRequest): Promise<TestPlan | null> {
    try {
      const response = await api.post(`${this.baseUrl}/generate-test-plan`, request);
      const data = response.data as any;
      
      // 🔍 LOG COMPLETO DA RESPOSTA PARA DEBUG
      console.log('🤖 RESPOSTA COMPLETA DA API DE IA:');
      console.log('📋 Status:', data.success);
      console.log('🔗 URL:', `${this.baseUrl}/generate-test-plan`);
      console.log('📤 Request enviado:', JSON.stringify(request, null, 2));
      console.log('📥 Response completa:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        const testPlan = data.data?.result?.parsedContent?.testPlan;
        
        // LOG específico do testPlan extraído
        console.log('🎯 TestPlan extraído:', JSON.stringify(testPlan, null, 2));
        
        if (testPlan?.testSuites) {
          console.log('📚 Total de Test Suites encontradas:', testPlan.testSuites.length);
          testPlan.testSuites.forEach((suite: any, index: number) => {
            console.log(`📋 Suite ${index + 1}: ${suite.name} (${suite.testCases?.length || 0} test cases)`);
            if (suite.testCases) {
              suite.testCases.forEach((testCase: any, caseIndex: number) => {
                console.log(`  🧪 Test Case ${caseIndex + 1}: ${testCase.title} (${testCase.steps?.length || 0} steps)`);
              });
            }
          });
        }
        
        return testPlan || null;
      }
      
      throw new Error(data.message || 'Error generating test plan');
    } catch (error) {
      console.error('❌ Error generating test plan:', error);
      this.handleAIError(error);
      throw error;
    }
  }

  /**
   * Gera casos de teste específicos para uma funcionalidade
   */
  async generateTestCases(request: GenerateTestCasesRequest): Promise<TestCase[]> {
    try {
      const response = await api.post(`${this.baseUrl}/generate-test-cases`, request);
      const data = response.data as any;
      
      // 🔍 LOG COMPLETO PARA DEBUG
      console.log('🧪 GENERATE TEST CASES - RESPOSTA COMPLETA:');
      console.log('📤 Request:', JSON.stringify(request, null, 2));
      console.log('📥 Response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        const testCases = data.data.testCases;
        console.log(`🎯 Total de test cases gerados: ${testCases?.length || 0}`);
        
        if (testCases) {
          testCases.forEach((testCase: any, index: number) => {
            console.log(`  🧪 Test Case ${index + 1}: ${testCase.title} (${testCase.steps?.length || 0} steps)`);
          });
        }
        
        return testCases;
      }
      
      throw new Error(data.message || 'Error generating test cases');
    } catch (error) {
      console.error('❌ Error generating test cases:', error);
      this.handleAIError(error);
      throw error;
    }
  }

  /**
   * Analisa riscos do sistema
   */
  async analyzeRisks(request: AnalyzeRisksRequest): Promise<RiskAnalysis> {
    try {
      const response = await api.post(`${this.baseUrl}/analyze-risks`, request);
      const data = response.data as any;
      
      // 🔍 LOG COMPLETO PARA DEBUG
      console.log('⚠️ ANALYZE RISKS - RESPOSTA COMPLETA:');
      console.log('📤 Request:', JSON.stringify(request, null, 2));
      console.log('📥 Response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        const riskAnalysis = data.data.riskAnalysis;
        console.log(`🎯 Total de riscos identificados: ${riskAnalysis?.risks?.length || 0}`);
        
        if (riskAnalysis?.risks) {
          riskAnalysis.risks.forEach((risk: any, index: number) => {
            console.log(`  ⚠️ Risco ${index + 1}: ${risk.category} - ${risk.description} (Impact: ${risk.impact}, Probability: ${risk.probability})`);
          });
        }
        
        return riskAnalysis;
      }
      
      throw new Error(data.message || 'Error analyzing risks');
    } catch (error) {
      console.error('❌ Error analyzing risks:', error);
      this.handleAIError(error);
      throw error;
    }
  }

  /**
   * Gera plano baseado em cenário pré-definido
   */
  async generateFromScenario(request: GenerateFromScenarioRequest): Promise<TestPlan | null> {
    try {
      const response = await api.post(`${this.baseUrl}/generate-from-scenario`, request);
      const data = response.data as any;
      
      // 🔍 LOG COMPLETO PARA DEBUG
      console.log('🎭 GENERATE FROM SCENARIO - RESPOSTA COMPLETA:');
      console.log('📤 Request:', JSON.stringify(request, null, 2));
      console.log('📥 Response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        const testPlan = data.data?.result?.parsedContent?.testPlan;
        
        console.log('🎯 TestPlan por cenário extraído:', JSON.stringify(testPlan, null, 2));
        
        if (testPlan?.testSuites) {
          console.log('📚 Total de Test Suites do cenário:', testPlan.testSuites.length);
          testPlan.testSuites.forEach((suite: any, index: number) => {
            console.log(`📋 Suite ${index + 1}: ${suite.name} (${suite.testCases?.length || 0} test cases)`);
          });
        }
        
        return testPlan || null;
      }
      
      throw new Error(data.message || 'Erro ao gerar plano por cenário');
    } catch (error) {
      console.error('❌ Error generating plan by scenario:', error);
      this.handleAIError(error);
      throw error;
    }
  }

  /**
   * Lista cenários pré-definidos disponíveis
   */
  async getScenarios(): Promise<AIScenario[]> {
    try {
      const response = await api.get(`${this.baseUrl}/scenarios`);
      const data = response.data as any;
      
      if (data.success) {
        return data.data.scenarios;
      }
      
      throw new Error(data.message || 'Error loading scenarios');
    } catch (error) {
      console.error('❌ Error loading scenarios:', error);
      this.handleAIError(error);
      throw error;
    }
  }

  /**
   * Obtém informações sobre o motor de IA
   */
  async getAIInfo(): Promise<AIInfo> {
    try {
      const response = await api.get(`${this.baseUrl}/info`);
      const data = response.data as any;
      
      if (data.success) {
        return data.data;
      }
      
      throw new Error(data.message || 'Error getting AI information');
    } catch (error) {
      console.error('❌ Error getting AI information:', error);
      this.handleAIError(error);
      throw error;
    }
  }

  /**
   * Testa conexão com OpenAI
   */
  async testConnection(): Promise<{ configured: boolean; model: string; response: string }> {
    try {
      const response = await api.post(`${this.baseUrl}/test-connection`, {});
      const data = response.data as any;
      
      if (data.success) {
        return data.data;
      }
      
      throw new Error(data.message || 'Error testing connection');
    } catch (error) {
      console.error('❌ Error testing connection:', error);
      this.handleAIError(error);
      throw error;
    }
  }

  /**
   * Obtém histórico de gerações
   */
  async getHistory(): Promise<HistoryEntry[]> {
    try {
      const response = await api.get(`${this.baseUrl}/history`);
      const data = response.data as any;
      
      if (data.success) {
        return data.data.history;
      }
      
      throw new Error(data.message || 'Error loading history');
    } catch (error) {
      console.error('❌ Error loading history:', error);
      this.handleAIError(error);
      throw error;
    }
  }

  /**
   * Limpa histórico de gerações
   */
  async clearHistory(): Promise<void> {
    try {
      const response = await api.delete(`${this.baseUrl}/history`);
      const data = response.data as any;
      
      if (!data.success) {
        throw new Error(data.message || 'Error clearing history');
      }
    } catch (error) {
      console.error('❌ Error clearing history:', error);
      this.handleAIError(error);
      throw error;
    }
  }

  /**
   * Gera passos de teste simplificados para o AddTestModal
   * Usa o endpoint /ai/generate-test-plan
   * Retorna array vazio se AI não disponível
   * 
   * Para testes de OS/Performance/Network/Database, gera comandos executáveis
   * Para testes de UI/API, gera descrições de passos
   */
  async generateSimpleSteps(description: string, testType: string): Promise<string[]> {
    try {
      // Construir instruction apropriada para o tipo de teste
      const isCommandBased = ['os', 'performance', 'network', 'database'].includes(testType.toLowerCase());
      
      const instruction = isCommandBased
        ? `${description}\n\nGenerate executable shell commands for this ${testType} test.`
        : `Tipo de teste: ${testType}\nDescrição: ${description}\nGerar passos de teste detalhados e executáveis.`;
      
      const response = await api.post(`${this.baseUrl}/generate-test-plan`, {
        instruction,
        system: testType,
        testType: testType.toLowerCase(),
        options: {}
      });

      const data = response.data as any;
      console.log('🔍 Resposta da API:', data);

      if (data.success && data.data) {
        const aiResponse = data.data;
        let steps: string[] = [];
        
        if (aiResponse.parsed?.steps && Array.isArray(aiResponse.parsed.steps)) {
          steps = aiResponse.parsed.steps;
        } else if (aiResponse.result?.parsedContent?.testPlan?.testSuites) {
          const suites = aiResponse.result.parsedContent.testPlan.testSuites;
          suites.forEach((suite: any) => {
            suite.testCases?.forEach((tc: any) => {
              tc.steps?.forEach((step: any) => {
                if (step.action) steps.push(step.action);
              });
            });
          });
        } else if (aiResponse.plan && typeof aiResponse.plan === 'string') {
          const lines = aiResponse.plan.split('\n').filter((line: string) => {
            const trimmed = line.trim();
            return trimmed.length > 5 && (
              trimmed.match(/^\d+[\.\)]/) ||
              trimmed.match(/^[-•*]/) ||
              trimmed.toLowerCase().startsWith('step')
            );
          });
          steps = lines.map((line: string) => line.replace(/^[\d\.\)\-•*\s]+/, '').trim());
        }

        if (steps.length > 0) {
          console.log(`🎯 Steps extraídos da AI: ${steps.length}`);
          return steps;
        }
      }

      // AI respondeu mas sem steps
      console.log('⚠️ AI sem steps');
      return [];
    } catch (error) {
      // AI não disponível
      console.warn('⚠️ AI não disponível:', error);
      return [];
    }
  }

  /**
   * Verifica se a IA está configurada e disponível
   */
  async isAIAvailable(): Promise<boolean> {
    try {
      const info = await this.getAIInfo();
      return info.engine.configured;
    } catch (error) {
      console.error('❌ IA não disponível:', error);
      return false;
    }
  }

  /**
   * Tratamento centralizado de erros de IA
   */
  private handleAIError(error: any): void {
    if (error.response?.status === 401) {
      console.error('🔐 Token de autenticação inválido para IA');
    } else if (error.response?.status === 400) {
      console.error('📝 Parâmetros inválidos para IA:', error.response?.data?.message);
    } else if (error.response?.status === 500) {
      console.error('🤖 Erro interno da IA:', error.response?.data?.message);
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      console.error('🌐 Erro de conexão com serviço de IA');
    }
  }
}

// Exportar instância singleton
export const aiService = new AIService();
export default aiService; 