const OnboardingProcess = require('../models/OnboardingProcess');
const System = require('../models/System');

/**
 * Serviço para persistência de dados do onboarding
 */
class OnboardingPersistenceService {
  
  /**
   * Criar ou obter processo de onboarding para um sistema
   * @param {string} systemId - ID do sistema
   * @param {string} userId - ID do usuário que iniciou
   * @param {boolean} restart - Se deve reiniciar um processo existente
   * @returns {Promise<OnboardingProcess>}
   */
  async getOrCreateOnboardingProcess(systemId, userId, restart = false) {
    // Validar userId obrigatório
    if (!userId) {
      throw new Error('userId é obrigatório para criar/atualizar processo de onboarding');
    }
    
    let process = await OnboardingProcess.findOne({ systemId });
    
    if (process) {
      // APENAS reiniciar se explicitamente solicitado ou se está cancelado
      if (restart || process.status === 'cancelled') {
        console.log(`🔄 Reiniciando processo de onboarding existente para sistema ${systemId}`);
        
        // Resetar processo existente
        process.status = 'in_progress';
        process.startedAt = new Date();
        process.completedAt = null;
        process.completedBy = null;
        process.initiatedBy = userId;
        process.steps = [];
        process.logs = [];
        process.totalSteps = 0;
        process.completedSteps = 0;
        process.failedSteps = 0;
        process.skippedSteps = 0;
        process.osInfo = {};
        process.networkInfo = {
          connectivity: false,
          responseTime: null,
          lastPingAt: null
        };
        
        process.addLog('info', 'Processo de onboarding reiniciado');
        await process.save();
        
      } else {
        // Para processos completed/failed, continuar adicionando passos
        if (['completed', 'failed'].includes(process.status)) {
          console.log(`📋 Continuando a adicionar passos ao processo existente (${process.status}) para sistema ${systemId}`);
          // Não reiniciar - apenas continuar a adicionar passos
          // Atualizar status para in_progress para indicar que está ativo novamente
          if (process.status !== 'in_progress') {
            process.status = 'in_progress';
            process.addLog('info', 'Processo reativado para adicionar novos passos');
          }
        } else {
          console.log(`📋 Continuando processo de onboarding existente para sistema ${systemId}`);
        }
      }
    } else {
      // Criar novo processo
      process = new OnboardingProcess({
        systemId,
        initiatedBy: userId,
        status: 'in_progress'
      });
      
      console.log(`📋 Criando novo processo de onboarding para sistema ${systemId}`);
      await process.save();
    }
    
    // Atualizar status do sistema apenas se necessário
    const system = await System.findById(systemId);
    if (system && system.onboardingStatus !== 'in_progress') {
      await System.findByIdAndUpdate(systemId, {
        onboardingStatus: 'in_progress'
      });
    }
    
    return process;
  }

  /**
   * Adicionar ou atualizar step no processo de onboarding
   * @param {string} systemId - ID do sistema
   * @param {string} userId - ID do usuário
   * @param {Object} stepData - Dados do step
   * @returns {Promise<OnboardingProcess>}
   */
  async addOrUpdateStep(systemId, userId, stepData) {
    const process = await this.getOrCreateOnboardingProcess(systemId, userId);
    
    // Verificar se step já existe (por nome)
    const existingStepIndex = process.steps.findIndex(s => s.step === stepData.step);
    
    if (existingStepIndex >= 0) {
      // Atualizar step existente
      process.updateStep(existingStepIndex, {
        ...stepData,
        endedAt: new Date()
      });
      console.log(`🔄 Atualizando step existente: ${stepData.step}`);
    } else {
      // Adicionar novo step
      process.addStep({
        ...stepData,
        startedAt: new Date(),
        endedAt: new Date()
      });
      console.log(`➕ Adicionando novo step: ${stepData.step}`);
    }
    
    // Manter o processo como 'in_progress' até que seja explicitamente finalizado
    if (process.status !== 'in_progress') {
      process.status = 'in_progress';
    }
    
    await process.save();
    return process;
  }

  /**
   * Atualizar informações do OS no processo
   * @param {string} systemId - ID do sistema
   * @param {string} userId - ID do usuário
   * @param {Object} osInfo - Informações do OS
   * @returns {Promise<OnboardingProcess>}
   */
  async updateOSInfo(systemId, userId, osInfo) {
    const process = await this.getOrCreateOnboardingProcess(systemId, userId);
    
    // Atualizar osInfo
    process.osInfo = {
      ...process.osInfo,
      ...osInfo
    };
    
    // Também atualizar campo OS no System se detectado
    if (osInfo.prettyName || osInfo.name) {
      await System.findByIdAndUpdate(systemId, {
        os: osInfo.prettyName || osInfo.name
      });
      console.log(`🖥️ OS do sistema atualizado: ${osInfo.prettyName || osInfo.name}`);
    }
    
    process.addLog('info', `OS atualizado: ${osInfo.prettyName || osInfo.name || 'Detecção falhou'}`);
    await process.save();
    
    return process;
  }

  /**
   * Marcar step como completado com sucesso
   * @param {string} systemId - ID do sistema
   * @param {string} userId - ID do usuário
   * @param {string} stepName - Nome do step
   * @param {string} command - Comando executado
   * @param {string} output - Output do comando
   * @param {number} duration - Duração em ms
   * @returns {Promise<OnboardingProcess>}
   */
  async completeStep(systemId, userId, stepName, command, output, duration = 0) {
    return await this.addOrUpdateStep(systemId, userId, {
      step: stepName,
      command: command,
      output: output,
      status: 'success',
      error: '',
      duration: duration
    });
  }

  /**
   * Marcar step como falhado
   * @param {string} systemId - ID do sistema
   * @param {string} userId - ID do usuário
   * @param {string} stepName - Nome do step
   * @param {string} command - Comando executado
   * @param {string} error - Erro ocorrido
   * @param {number} duration - Duração em ms
   * @returns {Promise<OnboardingProcess>}
   */
  async failStep(systemId, userId, stepName, command, error, duration = 0) {
    return await this.addOrUpdateStep(systemId, userId, {
      step: stepName,
      command: command,
      output: '',
      status: 'failed',
      error: error,
      duration: duration
    });
  }

  /**
   * Atualizar informações de conectividade
   * @param {string} systemId - ID do sistema
   * @param {string} userId - ID do usuário
   * @param {Object} connectivityInfo - Info de conectividade
   * @returns {Promise<OnboardingProcess>}
   */
  async updateConnectivity(systemId, userId, connectivityInfo) {
    const process = await this.getOrCreateOnboardingProcess(systemId, userId);
    
    process.networkInfo = {
      ...process.networkInfo,
      ...connectivityInfo,
      lastPingAt: new Date()
    };
    
    process.addLog('info', `Conectividade atualizada: ${connectivityInfo.connectivity ? 'OK' : 'FAILED'}`);
    await process.save();
    
    return process;
  }

  /**
   * Finalizar processo de onboarding
   * @param {string} systemId - ID do sistema
   * @param {string} userId - ID do usuário
   * @param {boolean} success - Se foi bem sucedido
   * @returns {Promise<OnboardingProcess>}
   */
  async finalizeProcess(systemId, userId, success = true) {
    const process = await this.getOrCreateOnboardingProcess(systemId, userId);
    
    const finalStatus = success ? 'completed' : 'failed';
    process.status = finalStatus;
    process.completedAt = new Date();
    process.completedBy = userId;
    
    process.addLog('info', `Onboarding ${success ? 'concluído com sucesso' : 'falhou'}`);
    await process.save();
    
    // Atualizar sistema
    await System.findByIdAndUpdate(systemId, {
      onboardingStatus: finalStatus,
      lastOnboardingAt: new Date()
    });
    
    console.log(`🏁 Processo de onboarding ${finalStatus} para sistema ${systemId}`);
    return process;
  }

  /**
   * Obter status atual do onboarding
   * @param {string} systemId - ID do sistema
   * @returns {Promise<Object>}
   */
  async getOnboardingStatus(systemId) {
    const process = await OnboardingProcess.findOne({ systemId })
      .populate('initiatedBy', 'username email')
      .populate('completedBy', 'username email');
      
    const system = await System.findById(systemId);
    
    if (!process) {
      return {
        hasOnboarding: false,
        systemStatus: system?.onboardingStatus || 'not_started',
        needsOnboarding: system?.needsOnboarding() || true
      };
    }
    
    return {
      hasOnboarding: true,
      process: process.toObject(),
      systemStatus: system?.onboardingStatus,
      progress: process.progress,
      detailedStatus: process.detailedStatus
    };
  }
}

module.exports = new OnboardingPersistenceService(); 