/**
 * System Profile Analyzer - Análise AI de dados do onboarding
 */

const { getOpenAIEngine } = require('./engines/openai');

class SystemProfileAnalyzer {
  constructor() {
    this.engine = getOpenAIEngine();
  }

  /**
   * Analisar dados do onboarding e gerar perfil estruturado do sistema
   * @param {Object} onboardingProcess - Processo de onboarding completo
   * @param {Object} system - Dados do sistema
   * @returns {Promise<Object>} Perfil analisado do sistema
   */
  async analyzeSystemProfile(onboardingProcess, system) {
    console.log(`🤖 Iniciando análise AI do perfil do sistema ${system.name}`);

    try {
      // Preparar dados para análise
      const systemData = this.prepareOnboardingData(onboardingProcess, system);
      
      // Criar prompt para análise
      const prompt = this.createSystemAnalysisPrompt(systemData);
      
      // Chamar AI para análise
      const aiResponse = await this.engine.generateContent(prompt, {
        temperature: 0.3, // Baixa para respostas mais consistentes
        maxTokens: 3000
      });

      // Processar resposta da AI
      const analyzedProfile = this.parseAIResponse(aiResponse.content);

      console.log(`✅ Análise AI concluída para sistema ${system.name}`);
      console.log(`💰 Tokens usados: ${aiResponse.usage?.total_tokens || 'N/A'}`);

      return {
        success: true,
        profile: analyzedProfile,
        metadata: {
          analyzedAt: new Date().toISOString(),
          aiModel: aiResponse.model,
          tokensUsed: aiResponse.usage?.total_tokens || 0,
          systemId: system._id,
          onboardingId: onboardingProcess._id
        }
      };

    } catch (error) {
      console.error(`❌ Erro na análise AI do sistema ${system.name}:`, error.message);
      return {
        success: false,
        error: error.message,
        metadata: {
          analyzedAt: new Date().toISOString(),
          systemId: system._id,
          onboardingId: onboardingProcess._id
        }
      };
    }
  }

  /**
   * Preparar dados do onboarding para análise
   * @param {Object} onboardingProcess - Processo de onboarding
   * @param {Object} system - Sistema
   * @returns {Object} Dados estruturados
   */
  prepareOnboardingData(onboardingProcess, system) {
    // Extrair outputs dos steps concluídos
    const stepOutputs = {};
    const stepCategories = {};
    
    onboardingProcess.steps
      .filter(step => step.status === 'success' && step.output)
      .forEach(step => {
        stepOutputs[step.step] = step.output;
        stepCategories[step.step] = step.category || 'general';
      });

    return {
      system: {
        name: system.name,
        ip: system.ip,
        os: system.os,
        environment: system.environment,
        description: system.description
      },
      onboarding: {
        status: onboardingProcess.status,
        totalSteps: onboardingProcess.totalSteps,
        completedSteps: onboardingProcess.completedSteps,
        duration: onboardingProcess.totalDuration,
        osInfo: onboardingProcess.osInfo
      },
      stepOutputs,
      stepCategories,
      availableCategories: [...new Set(Object.values(stepCategories))]
    };
  }

  /**
   * Criar prompt para análise do sistema
   * @param {Object} systemData - Dados do sistema preparados
   * @returns {Object} Prompt estruturado
   */
  createSystemAnalysisPrompt(systemData) {
    const systemPrompt = `Você é um especialista em análise de sistemas Linux/Unix. Sua tarefa é analisar dados coletados durante o onboarding de um sistema e extrair informações estruturadas para criar um perfil completo do sistema.

IMPORTANTE: Responda APENAS com um JSON válido, sem texto adicional antes ou depois.

Analise os dados fornecidos e extraia as seguintes informações:

1. TOP PROCESSES: Liste os 4 processos mais importantes/críticos com uso de CPU
2. ACTIVE SERVICES: Liste os 4 serviços mais importantes que estão ativos
3. OPEN PORTS: Liste as 4 portas mais importantes abertas com protocolo
4. SYSTEM INFO: Informações do kernel, arquitetura, load average e usuários

Use o formato JSON exato abaixo:
{
  "topProcesses": [
    {"name": "apache2", "cpuUsage": "2.5%"},
    {"name": "mysqld", "cpuUsage": "1.8%"},
    {"name": "nginx", "cpuUsage": "0.6%"},
    {"name": "python3", "cpuUsage": "0.3%"}
  ],
  "activeServices": [
    {"name": "apache2.service", "status": "active"},
    {"name": "mysql.service", "status": "active"},
    {"name": "nginx.service", "status": "active"},
    {"name": "ssh.service", "status": "active"}
  ],
  "openPorts": [
    {"port": ":22 (SSH)", "protocol": "tcp"},
    {"port": ":80 (HTTP)", "protocol": "tcp"},
    {"port": ":443 (HTTPS)", "protocol": "tcp"},
    {"port": ":3306 (MySQL)", "protocol": "tcp"}
  ],
  "systemInfo": {
    "kernel": "5.15.0-91-generic",
    "architecture": "x86_64", 
    "loadAverage": "2.45, 2.12, 1.89",
    "loggedUsers": "3 logged in"
  }
}

Extraia apenas informações REAIS presentes nos dados fornecidos. Se alguma informação não estiver disponível, use "N/A".`;

    const userPrompt = `Analise os seguintes dados de onboarding do sistema "${systemData.system.name}":

INFORMAÇÕES DO SISTEMA:
- Nome: ${systemData.system.name}
- IP: ${systemData.system.ip}
- OS: ${systemData.system.os}
- Ambiente: ${systemData.system.environment}

DADOS DO ONBOARDING:
- Status: ${systemData.onboarding.status}
- Passos completados: ${systemData.onboarding.completedSteps}/${systemData.onboarding.totalSteps}
- Duração: ${Math.round(systemData.onboarding.duration / 1000)}s
- OS Detectado: ${JSON.stringify(systemData.onboarding.osInfo)}

OUTPUTS DOS COMANDOS EXECUTADOS:
${Object.entries(systemData.stepOutputs)
  .map(([step, output]) => `\n=== ${step} (${systemData.stepCategories[step]}) ===\n${output.substring(0, 1500)}${output.length > 1500 ? '\n... (truncado)' : ''}`)
  .join('\n')}

Baseado nestes dados, extraia e estruture as informações do sistema no formato JSON solicitado.`;

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Processar resposta da AI e extrair JSON
   * @param {string} aiResponse - Resposta bruta da AI
   * @returns {Object} Dados estruturados
   */
  parseAIResponse(aiResponse) {
    try {
      // Limpar resposta (remover markdown, etc.)
      let cleanResponse = aiResponse.trim();
      
      // Remover markdown code blocks se existirem
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
      
      // Encontrar JSON na resposta
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Nenhum JSON válido encontrado na resposta da AI');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Validar estrutura básica
      if (!parsedData.topProcesses || !parsedData.activeServices || 
          !parsedData.openPorts || !parsedData.systemInfo) {
        throw new Error('Estrutura JSON inválida: campos obrigatórios ausentes');
      }

      console.log('✅ Resposta da AI parseada com sucesso');
      return parsedData;

    } catch (error) {
      console.error('❌ Erro ao parsear resposta da AI:', error.message);
      console.log('🔍 Resposta bruta da AI:', aiResponse.substring(0, 500));
      
      // Retornar estrutura padrão em caso de erro
      return {
        topProcesses: [
          {"name": "N/A", "cpuUsage": "N/A"}
        ],
        activeServices: [
          {"name": "N/A", "status": "N/A"}
        ],
        openPorts: [
          {"port": "N/A", "protocol": "N/A"}
        ],
        systemInfo: {
          "kernel": "N/A",
          "architecture": "N/A", 
          "loadAverage": "N/A",
          "loggedUsers": "N/A"
        },
        parseError: error.message
      };
    }
  }
}

module.exports = {
  SystemProfileAnalyzer,
  getSystemProfileAnalyzer: () => new SystemProfileAnalyzer()
}; 