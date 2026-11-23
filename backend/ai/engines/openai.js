/**
 * OpenAI Engine para Geração de Conteúdo
 */

const axios = require('axios');

class OpenAIEngine {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4';
    
    if (!this.apiKey) {
      console.warn('⚠️  OPENAI_API_KEY não configurada. Funcionalidades de IA estarão limitadas.');
    }
  }

  /**
   * Verificar se o engine está configurado
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Fazer request para a API da OpenAI
   * @param {Object} prompt - Objeto com system e user messages
   * @param {Object} options - Opções adicionais (model, temperature, etc.)
   * @returns {Promise<string>} Response da IA
   */
  async generateContent(prompt, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key não configurada. Configure OPENAI_API_KEY no .env');
    }

    try {
      const requestData = {
        model: options.model || this.defaultModel,
        messages: [
          {
            role: 'system',
            content: prompt.system
          },
          {
            role: 'user', 
            content: prompt.user
          }
        ],
        temperature: prompt.temperature || options.temperature || 0.7,
        max_tokens: prompt.maxTokens || options.maxTokens || 4000,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0
      };

      // Suporte opcional a JSON mode quando disponível
      // Use options.responseFormatJson === true para tentar forçar JSON
      if (options.responseFormatJson) {
        requestData.response_format = { type: 'json_object' };
      }

      console.log('🤖 Enviando request para OpenAI...');
      console.log('📊 Model:', requestData.model);
      console.log('🌡️  Temperature:', requestData.temperature);
      console.log('📏 Max Tokens:', requestData.max_tokens);

      let response;
      try {
        response = await axios.post(`${this.baseURL}/chat/completions`, requestData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 segundos timeout
        });
      } catch (e) {
        // Alguns modelos não suportam response_format. Retentar sem ele.
        if (options.responseFormatJson && e?.response?.status === 400) {
          delete requestData.response_format;
          response = await axios.post(`${this.baseURL}/chat/completions`, requestData, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          });
        } else {
          throw e;
        }
      }

      const aiResponse = response.data.choices[0].message.content;
      
      console.log('✅ Response recebida da OpenAI');
      console.log('💰 Tokens usados:', response.data.usage?.total_tokens || 'N/A');

      return {
        content: aiResponse,
        usage: response.data.usage,
        model: response.data.model,
        created: response.data.created
      };

    } catch (error) {
      console.error('❌ Erro ao comunicar com OpenAI:', error.message);
      
      if (error.response) {
        const { status, data } = error.response;
        console.error(`📊 Status: ${status}`);
        console.error(`📄 Data:`, data);
        
        switch (status) {
          case 401:
            throw new Error('API key da OpenAI inválida ou expirada');
          case 429:
            throw new Error('Rate limit excedido. Tente novamente mais tarde');
          case 500:
            throw new Error('Erro interno da OpenAI. Tente novamente mais tarde');
          default:
            throw new Error(`Erro da OpenAI: ${data.error?.message || 'Erro desconhecido'}`);
        }
      }
      
      throw new Error('Erro de conexão com a OpenAI. Verifique sua conexão de internet');
    }
  }

  /**
   * Gerar plano de teste usando OpenAI
   * @param {Object} prompt - Prompt estruturado
   * @returns {Promise<Object>} Plano de teste estruturado
   */
  async generateTestPlan(prompt) {
    const response = await this.generateContent(prompt);
    
    try {
      // Tentar fazer parse do JSON retornado
      const content = response.content;
      
      // Limpar markdown se existir
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const parsedPlan = JSON.parse(cleanedContent);
      
      return {
        ...response,
        parsedContent: parsedPlan,
        success: true
      };
      
    } catch (parseError) {
      console.warn('⚠️  Não foi possível fazer parse do JSON. Retornando content raw.');
      
      return {
        ...response,
        parsedContent: null,
        parseError: parseError.message,
        success: false
      };
    }
  }

  /**
   * Listar modelos disponíveis
   * @returns {Promise<Array>} Lista de modelos
   */
  async listModels() {
    if (!this.isConfigured()) {
      return ['Configuração necessária'];
    }

    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data.data
        .filter(model => model.id.includes('gpt'))
        .map(model => ({
          id: model.id,
          created: model.created,
          owned_by: model.owned_by
        }))
        .sort((a, b) => b.created - a.created);
        
    } catch (error) {
      console.error('❌ Erro ao listar modelos:', error.message);
      return [];
    }
  }

  /**
   * Testar conexão com a API
   * @returns {Promise<Object>} Status da conexão
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'API key não configurada',
        configured: false
      };
    }

    try {
      const response = await this.generateContent({
        system: 'Você é um assistente útil.',
        user: 'Responda apenas com "OK" se estiver funcionando.',
        temperature: 0,
        maxTokens: 10
      });

      return {
        success: true,
        message: 'Conexão com OpenAI estabelecida com sucesso',
        configured: true,
        model: this.defaultModel,
        response: response.content
      };

    } catch (error) {
      return {
        success: false,
        message: `Erro de conexão: ${error.message}`,
        configured: true,
        error: error.message
      };
    }
  }

  /**
   * Obter informações do engine
   */
  getInfo() {
    return {
      name: 'OpenAI Engine',
      version: '1.0.0',
      defaultModel: this.defaultModel,
      configured: this.isConfigured(),
      supportedModels: [
        'gpt-4',
        'gpt-4-turbo-preview',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k'
      ],
      capabilities: [
        'Text Generation',
        'Test Plan Generation', 
        'Code Analysis',
        'JSON Structured Output'
      ]
    };
  }
}

/**
 * Engine factory para criar instância singleton
 */
let openAIInstance = null;

function getOpenAIEngine() {
  if (!openAIInstance) {
    openAIInstance = new OpenAIEngine();
  }
  return openAIInstance;
}

module.exports = {
  OpenAIEngine,
  getOpenAIEngine
}; 