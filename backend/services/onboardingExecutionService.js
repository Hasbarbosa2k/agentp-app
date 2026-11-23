const sshService = require('./sshService');
const OnboardingProcess = require('../models/OnboardingProcess');
const System = require('../models/System');
// Removido getCompleteStepsForOS - apenas templates são usados
const { detectOS, normalizeOSId, validateOSInfo } = require('../utils/osDetector');
const { processStepOutput } = require('../configs/onboardingSteps');
const onboardingPersistenceService = require('./onboardingPersistenceService');
const { notifyClients } = require('../controllers/onboardingRealtimeController');
const { getSystemProfileAnalyzer } = require('../ai/systemProfileAnalyzer');
const { getSystemProfileParser } = require('./systemProfileParser');

/**
 * Serviço de execução de onboarding via SSH
 */
class OnboardingExecutionService {
  constructor() {
    this.runningProcesses = new Map(); // Processos em execução
    this.defaultTimeout = 30000;
    this.maxRetries = 3;
  }

  /**
   * Executar processo completo de onboarding
   * @param {string} systemId - ID do sistema
   * @param {Object} credentials - Credenciais SSH
   * @param {Object} options - Opções de execução
   * @returns {Promise<Object>} Resultado do onboarding
   */
  async runOnboarding(systemId, credentials, options = {}) {
    console.log(`🚀 Iniciando onboarding para sistema ${systemId}`);
    
    let connectionId = null;
    let onboardingProcess = null;
    
    try {
      // 1. Verificar se sistema existe
      const system = await System.findById(systemId);
      if (!system) {
        throw new Error(`Sistema não encontrado: ${systemId}`);
      }

      // 2. Buscar processo de onboarding existente (qualquer status)
      const existingProcess = await OnboardingProcess.findOne({ systemId });
      
      if (existingProcess) {
        console.log(`📋 Usando processo de onboarding existente: ${existingProcess._id} (status: ${existingProcess.status})`);
        onboardingProcess = existingProcess;
        
        // Verificar se o processo tem passos definidos (template já associado)
        if (onboardingProcess.steps && onboardingProcess.steps.length > 0) {
          console.log(`✅ Processo tem ${onboardingProcess.steps.length} passos definidos do template, prosseguindo com execução`);
          
          // Atualizar status para in_progress se necessário
          if (onboardingProcess.status !== 'in_progress') {
            onboardingProcess.status = 'in_progress';
            onboardingProcess.addLog('info', 'Processo reativado para execução');
            await onboardingProcess.save();
          }
        } else {
          console.log(`⚠️ Processo existente sem passos - template deve ser associado primeiro via POST /onboarding/start`);
        }
      } else {
        // 3. Não existe processo - deve ser criado primeiro via POST /onboarding/start
        throw new Error('PROCESS_NOT_FOUND: Processo de onboarding não existe. Execute primeiro POST /onboarding/start com templateId para criar o processo com template.');
      }
      
      // Atualizar configurações do processo
      onboardingProcess.config = {
        autoRetry: options.autoRetry !== false,
        maxRetries: options.maxRetries || this.maxRetries,
        timeoutSeconds: options.timeout || this.defaultTimeout / 1000
      };
      
      await onboardingProcess.save();
      console.log(`📋 Processo de onboarding preparado: ${onboardingProcess._id}`);

      // 4. Registrar processo como ativo
      this.runningProcesses.set(systemId, {
        onboardingId: onboardingProcess._id,
        startedAt: new Date(),
        status: 'connecting'
      });

      // 5. Estabelecer conexão SSH
      console.log(`🔗 Conectando via SSH ao sistema ${system.ip}...`);
      onboardingProcess.addLog('info', `Iniciando conexão SSH para ${system.ip}`);
      
      const connectionConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        privateKeyPath: credentials.privateKeyPath,
        timeout: options.connectionTimeout || 30000,
        frontendUser: options.userId || 'unknown'
      };

      const connection = await sshService.createConnection(connectionConfig);
      connectionId = connection.connectionId;
      
      onboardingProcess.addLog('info', 'Conexão SSH estabelecida com sucesso');
      onboardingProcess.networkInfo.connectivity = true;
      await onboardingProcess.save();

      // 6. Detectar sistema operativo
      console.log('🔍 Detectando sistema operativo...');
      const osInfo = await detectOS(sshService, connectionId);
      
      if (validateOSInfo(osInfo)) {
        onboardingProcess.osInfo = osInfo;
        onboardingProcess.addLog('info', `Sistema operativo detectado: ${osInfo.prettyName || osInfo.name}`);
        console.log(`✅ OS detectado: ${osInfo.prettyName || osInfo.name}`);
      } else {
        onboardingProcess.addLog('warning', 'Não foi possível detectar o sistema operativo de forma confiável');
        console.warn('⚠️ Detecção de OS falhada, usando passos genéricos');
      }

      // 7. Verificar se existem passos definidos (do template) - OBRIGATÓRIO
      if (onboardingProcess.steps && onboardingProcess.steps.length > 0) {
        console.log(`📋 Usando ${onboardingProcess.steps.length} passos definidos do template`);
        onboardingProcess.addLog('info', `Executando ${onboardingProcess.steps.length} passos do template`);
      } else {
        // SEM TEMPLATE = SEM ONBOARDING
        const errorMsg = 'Processo de onboarding sem passos definidos. Template é obrigatório.';
        console.error(`❌ ${errorMsg}`);
        onboardingProcess.addLog('error', errorMsg);
        onboardingProcess.status = 'failed';
        await onboardingProcess.save();
        
        throw new Error('TEMPLATE_REQUIRED: Onboarding deve ter um template associado com passos definidos');
      }

      // 9. Atualizar status do sistema e scriptStatus
      await system.updateOnboardingStatus('in_progress');
      system.scriptStatus = 'running';
      await system.save();

      // 10. Executar todos os passos
      await this.executeAllSteps(connectionId, onboardingProcess, options);

      // 11. Finalizar processo
      await this.finalizeOnboarding(onboardingProcess, system);

      console.log(`✅ Onboarding concluído para sistema ${systemId}`);
      
      // Notificar clientes sobre conclusão do onboarding
      notifyClients(systemId, 'onboarding_completed', {
        status: onboardingProcess.status,
        progress: onboardingProcess.progress,
        totalSteps: onboardingProcess.totalSteps,
        completedSteps: onboardingProcess.completedSteps,
        failedSteps: onboardingProcess.failedSteps,
        completedAt: onboardingProcess.completedAt,
        totalDuration: onboardingProcess.totalDuration,
        osInfo: onboardingProcess.osInfo
      });
      
      return {
        success: true,
        onboardingId: onboardingProcess._id,
        status: onboardingProcess.status,
        progress: onboardingProcess.progress,
        totalSteps: onboardingProcess.totalSteps,
        completedSteps: onboardingProcess.completedSteps,
        failedSteps: onboardingProcess.failedSteps,
        osInfo: onboardingProcess.osInfo
      };

    } catch (error) {
      console.error(`❌ Erro no onboarding do sistema ${systemId}:`, error.message);
      
      // Atualizar processo com erro
      if (onboardingProcess) {
        onboardingProcess.status = 'failed';
        onboardingProcess.addLog('error', `Onboarding falhou: ${error.message}`);
        await onboardingProcess.save();
        
        // Notificar clientes sobre falha do onboarding
        notifyClients(systemId, 'onboarding_failed', {
          status: 'failed',
          error: error.message,
          progress: onboardingProcess.progress,
          completedSteps: onboardingProcess.completedSteps,
          failedSteps: onboardingProcess.failedSteps,
          failedAt: new Date()
        });
      }

      // Atualizar status do sistema e scriptStatus
      try {
        const system = await System.findById(systemId);
        if (system) {
          await system.updateOnboardingStatus('failed');
          system.scriptStatus = 'failed';
          await system.save();
        }
      } catch (updateError) {
        console.error('❌ Erro ao atualizar status do sistema:', updateError.message);
      }

      throw error;

    } finally {
      // Limpar recursos
      this.runningProcesses.delete(systemId);
      
      if (connectionId) {
        try {
          await sshService.closeConnection(connectionId);
        } catch (closeError) {
          console.warn('⚠️ Erro ao fechar conexão SSH:', closeError.message);
        }
      }
    }
  }

  /**
   * Executar todos os passos sequencialmente
   * @param {string} connectionId - ID da conexão SSH
   * @param {Object} onboardingProcess - Processo de onboarding
   * @param {Object} options - Opções de execução
   */
  async executeAllSteps(connectionId, onboardingProcess, options = {}) {
    console.log(`📋 Executando ${onboardingProcess.steps.length} passos...`);
    
    for (let i = 0; i < onboardingProcess.steps.length; i++) {
      const step = onboardingProcess.steps[i];
      
      try {
        console.log(`🚀 Executando passo ${i + 1}/${onboardingProcess.steps.length}: ${step.step}`);
        
        // Atualizar processo como ativo
        const processInfo = this.runningProcesses.get(onboardingProcess.systemId.toString());
        if (processInfo) {
          processInfo.status = 'executing';
          processInfo.currentStep = i + 1;
          processInfo.stepName = step.step;
        }

        await this.executeStep(connectionId, onboardingProcess, i, options);
        
      } catch (stepError) {
        console.error(`❌ Erro no passo ${i + 1}: ${stepError.message}`);
        
        // Se o passo é obrigatório e falhou, parar
        if (step.required && !options.continueOnFailure) {
          onboardingProcess.addLog('error', `Passo obrigatório falhou: ${step.step}`);
          throw new Error(`Passo obrigatório falhou: ${step.step} - ${stepError.message}`);
        }
        
        // Continuar com próximo passo
        onboardingProcess.addLog('warning', `Passo falhou mas continuando: ${step.step}`);
      }
    }
  }

  /**
   * Executar passo individual
   * @param {string} connectionId - ID da conexão SSH
   * @param {Object} onboardingProcess - Processo de onboarding
   * @param {number} stepIndex - Índice do passo
   * @param {Object} options - Opções de execução
   */
  async executeStep(connectionId, onboardingProcess, stepIndex, options = {}) {
    const step = onboardingProcess.steps[stepIndex];
    
    // Marcar passo como iniciado
    onboardingProcess.startStep(stepIndex);
    await onboardingProcess.save();
    
    // Notificar clientes sobre início do passo
    notifyClients(onboardingProcess.systemId.toString(), 'step_started', {
      stepIndex,
      step: step.step,
      command: step.command,
      status: 'running',
      startedAt: step.startedAt
    });

    let executionDetails = {
      exitCode: null,
      signal: null,
      timeout: false
    };

    try {
      // Log de início detalhado
      onboardingProcess.addStepLog(stepIndex, 'info', `Executando comando: ${step.command}`);
      
      // Configurar opções do comando
      const execOptions = {
        timeout: step.timeout || this.defaultTimeout,
        retryDelay: options.retryDelay || 2000,
        frontendUser: options.userId || 'unknown'
      };

      let result;
      let retryCount = 0;
      
      // Executar com retry se configurado
      if (step.retryable && onboardingProcess.config.autoRetry) {
        execOptions.maxRetries = onboardingProcess.config.maxRetries;
        
        const originalExecute = sshService.executeCommandWithRetry;
        result = await sshService.executeCommandWithRetry(connectionId, step.command, {
          ...execOptions,
          onRetry: (attempt, error) => {
            retryCount = attempt;
            onboardingProcess.addStepLog(stepIndex, 'warning', 
              `Tentativa ${attempt}/${execOptions.maxRetries} falhou: ${error.message}`);
            onboardingProcess.save(); // Salvar log de retry imediatamente
          }
        });
      } else {
        result = await sshService.executeCommand(connectionId, step.command, execOptions);
      }

      // Atualizar retry count no passo
      step.retryCount = retryCount;

      // Capturar detalhes de execução
      executionDetails = {
        exitCode: result.exitCode || (result.success ? 0 : 1),
        signal: result.signal || null,
        timeout: result.timeout || false
      };

      // Processar resultado com estruturação de dados
      const rawOutput = result.stdout || '';
      const errorOutput = result.stderr || '';
      const error = result.success ? null : (errorOutput || result.error || 'Comando falhou');

      // Log detalhado do resultado
      if (rawOutput) {
        onboardingProcess.addStepLog(stepIndex, 'debug', `Output: ${rawOutput.substring(0, 200)}${rawOutput.length > 200 ? '...' : ''}`);
      }
      
      if (errorOutput && result.success) {
        onboardingProcess.addStepLog(stepIndex, 'warning', `Stderr: ${errorOutput}`);
      }

      // Processar output específico do passo
      let finalOutput = rawOutput;
      try {
        const processedOutput = processStepOutput(step.step, rawOutput);
        finalOutput = JSON.stringify(processedOutput, null, 2);
        onboardingProcess.addStepLog(stepIndex, 'debug', 'Output processado e estruturado com sucesso');
      } catch (processError) {
        onboardingProcess.addStepLog(stepIndex, 'warning', `Erro ao processar output: ${processError.message}`);
        finalOutput = rawOutput; // Manter output original se processamento falhar
      }

      // Atualizar passo com detalhes completos
      onboardingProcess.completeStep(stepIndex, finalOutput, error, executionDetails);
      
      // Processamento especial para detecção de OS
      if (step.step.includes('OS Detection') && result.success && rawOutput) {
        await this.processOSDetectionStep(onboardingProcess, rawOutput);
      }

      // Processamento especial para portas abertas
      if (step.step.includes('Open Ports') && result.success && rawOutput) {
        await this.processNetworkInfoStep(onboardingProcess, rawOutput);
      }

      // Processamento especial para instalação do Node Exporter
      if (step.step.includes('Node Exporter') && result.success && rawOutput) {
        await this.processNodeExporterStep(onboardingProcess, rawOutput);
      }

      // Processamento especial para instalação do Process Exporter
      if (step.step.includes('Process Exporter') && result.success && rawOutput) {
        await this.processProcessExporterStep(onboardingProcess, rawOutput);
      }

      // 📊 Atualizar perfil do sistema com dados parseados diretamente (sem AI)
      const profileUpdateSteps = [
        'Analyze Running Processes',
        'Analyze Running Services', 
        'Analyze Open Ports',
        'System Information',
        'Resource Check'
      ];
      
      if (profileUpdateSteps.includes(step.step) && result.success && rawOutput) {
        try {
          const parser = getSystemProfileParser();
          await parser.updateSystemProfileFromStep(
            onboardingProcess.systemId.toString(), 
            step.step, 
            rawOutput
          );
          onboardingProcess.addStepLog(stepIndex, 'info', 'Perfil do sistema atualizado com dados parseados');
        } catch (profileError) {
          console.warn(`⚠️ Erro ao atualizar perfil do sistema: ${profileError.message}`);
          onboardingProcess.addStepLog(stepIndex, 'warning', `Erro ao atualizar perfil: ${profileError.message}`);
        }
      }

      await onboardingProcess.save();
      
      // Notificar clientes sobre conclusão do passo
      notifyClients(onboardingProcess.systemId.toString(), 'step_completed', {
        stepIndex,
        step: step.step,
        status: 'success',
        output: finalOutput,
        executionDetails,
        endedAt: step.endedAt,
        duration: step.duration
      });
      
      console.log(`✅ Passo ${stepIndex + 1} concluído: ${step.step}`);

    } catch (error) {
      // Capturar detalhes do erro
      executionDetails = {
        exitCode: error.exitCode || 1,
        signal: error.signal || null,
        timeout: error.code === 'TIMEOUT' || error.message.includes('timeout')
      };
      
      // Log detalhado do erro
      onboardingProcess.addStepLog(stepIndex, 'error', `Erro de execução: ${error.message}`);
      
      if (error.stack && process.env.NODE_ENV === 'development') {
        onboardingProcess.addStepLog(stepIndex, 'debug', `Stack trace: ${error.stack}`);
      }

      // Marcar passo como falhado com detalhes
      onboardingProcess.completeStep(stepIndex, '', error.message, executionDetails);
      await onboardingProcess.save();
      
      // Notificar clientes sobre falha do passo
      notifyClients(onboardingProcess.systemId.toString(), 'step_failed', {
        stepIndex,
        step: step.step,
        status: 'failed',
        error: error.message,
        executionDetails,
        endedAt: step.endedAt,
        retryCount: step.retryCount
      });
      
      console.error(`❌ Passo ${stepIndex + 1} falhou: ${step.step} - ${error.message}`);
      throw error;
    }
  }

  /**
   * Processar resultado da detecção de OS
   * @param {Object} onboardingProcess - Processo de onboarding
   * @param {string} output - Output do comando
   */
  async processOSDetectionStep(onboardingProcess, output) {
    try {
      const { parseOSRelease } = require('../utils/osDetector');
      const osInfo = parseOSRelease(output);
      
      if (osInfo.id || osInfo.name) {
        // Atualizar informações do OS se ainda não foram detectadas
        if (!onboardingProcess.osInfo.id && !onboardingProcess.osInfo.name) {
          Object.assign(onboardingProcess.osInfo, osInfo);
          onboardingProcess.addLog('info', `OS detectado via comando: ${osInfo.prettyName || osInfo.name}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao processar detecção de OS:', error.message);
    }
  }

  /**
   * Processar informações de rede
   * @param {Object} onboardingProcess - Processo de onboarding
   * @param {string} output - Output do comando
   */
  async processNetworkInfoStep(onboardingProcess, output) {
    try {
      // Contar portas abertas
      const lines = output.split('\n');
      const openPorts = lines.filter(line => 
        line.includes('LISTEN') || line.includes(':')
      ).length;
      
      if (openPorts > 0) {
        onboardingProcess.networkInfo.openPorts = openPorts;
        onboardingProcess.addLog('info', `${openPorts} portas abertas detectadas`);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao processar informações de rede:', error.message);
    }
  }

  /**
   * Processar resultado da instalação do Node Exporter
   * @param {Object} onboardingProcess - Processo de onboarding
   * @param {string} output - Output do comando
   */
  async processNodeExporterStep(onboardingProcess, output) {
    try {
      const system = await System.findById(onboardingProcess.systemId);
      if (!system) {
        console.warn('⚠️ Sistema não encontrado para actualizar Node Exporter');
        return;
      }

      // Extrair status
      const statusMatch = output.match(/NODE_EXPORTER_STATUS=(\w+)/);
      const status = statusMatch ? statusMatch[1] : 'unknown';
      
      // Extrair versão
      const versionMatch = output.match(/node_exporter,?\s*version\s*([\d.]+)/i) || 
                           output.match(/version\s*([\d.]+)/i);
      const version = versionMatch ? versionMatch[1] : null;
      
      // Extrair porta
      const portMatch = output.match(/NODE_EXPORTER_PORT=(\d+)/);
      const port = portMatch ? parseInt(portMatch[1], 10) : 9100;
      
      // Determinar se está instalado e a correr
      const installed = ['already_running', 'installed_not_running', 'installed_successfully'].includes(status);
      const running = status === 'already_running' || status === 'installed_successfully';

      // Atualizar sistema com informações do Node Exporter
      system.nodeExporter = {
        installed,
        port,
        version,
        installedAt: installed ? new Date() : null,
        lastCheckedAt: new Date(),
        status: running ? 'running' : (installed ? 'stopped' : 'not_installed')
      };

      await system.save();

      // Log do resultado
      if (installed) {
        onboardingProcess.addLog('info', 
          `Node Exporter ${running ? 'instalado e a correr' : 'instalado mas parado'} na porta ${port}${version ? ` (v${version})` : ''}`
        );
        console.log(`📊 Node Exporter configurado para ${system.name}: porta ${port}, versão ${version || 'desconhecida'}`);
      } else {
        onboardingProcess.addLog('warning', `Instalação do Node Exporter falhou: ${status}`);
        console.warn(`⚠️ Falha na instalação do Node Exporter para ${system.name}: ${status}`);
      }

    } catch (error) {
      console.warn('⚠️ Erro ao processar instalação do Node Exporter:', error.message);
      onboardingProcess.addLog('error', `Erro ao processar Node Exporter: ${error.message}`);
    }
  }

  /**
   * Processar resultado da instalação do Process Exporter
   * @param {Object} onboardingProcess - Processo de onboarding
   * @param {string} output - Output do comando
   */
  async processProcessExporterStep(onboardingProcess, output) {
    try {
      const system = await System.findById(onboardingProcess.systemId);
      if (!system) {
        console.warn('⚠️ Sistema não encontrado para actualizar Process Exporter');
        return;
      }

      // Extrair status (usar o último)
      const statusMatches = output.match(/PROCESS_EXPORTER_STATUS=(\w+)/g);
      let status = 'unknown';
      if (statusMatches && statusMatches.length > 0) {
        const lastMatch = statusMatches[statusMatches.length - 1];
        status = lastMatch.replace('PROCESS_EXPORTER_STATUS=', '');
      }
      
      // Extrair porta
      const portMatch = output.match(/PROCESS_EXPORTER_PORT=(\d+)/);
      const port = portMatch ? parseInt(portMatch[1], 10) : 9256;
      
      // Extrair processos monitorizados
      const processesMatch = output.match(/namedprocess_namegroup_num_procs\{groupname="([^"]+)"/g);
      const monitoredProcesses = processesMatch 
        ? [...new Set(processesMatch.map(m => m.match(/groupname="([^"]+)"/)[1]))]
        : [];
      
      // Determinar se está instalado e a correr
      const installed = ['already_running', 'installed_not_running', 'installed_successfully'].includes(status);
      const running = status === 'already_running' || status === 'installed_successfully';

      // Atualizar sistema com informações do Process Exporter
      system.processExporter = {
        installed,
        port,
        installedAt: installed ? new Date() : null,
        lastCheckedAt: new Date(),
        status: running ? 'running' : (installed ? 'stopped' : 'not_installed'),
        monitoredProcesses
      };

      await system.save();

      // Log do resultado
      if (installed) {
        onboardingProcess.addLog('info', 
          `Process Exporter ${running ? 'instalado e a correr' : 'instalado mas parado'} na porta ${port} (${monitoredProcesses.length} processos)`
        );
        console.log(`📊 Process Exporter configurado para ${system.name}: porta ${port}, ${monitoredProcesses.length} processos monitorizados`);
      } else {
        onboardingProcess.addLog('warning', `Instalação do Process Exporter falhou: ${status}`);
        console.warn(`⚠️ Falha na instalação do Process Exporter para ${system.name}: ${status}`);
      }

    } catch (error) {
      console.warn('⚠️ Erro ao processar instalação do Process Exporter:', error.message);
      onboardingProcess.addLog('error', `Erro ao processar Process Exporter: ${error.message}`);
    }
  }

  /**
   * Finalizar processo de onboarding
   * @param {Object} onboardingProcess - Processo de onboarding
   * @param {Object} system - Sistema
   */
  async finalizeOnboarding(onboardingProcess, system) {
    console.log('🏁 Finalizando processo de onboarding...');
    
    // Calcular estatísticas finais
    const stats = onboardingProcess.detailedStatus;
    
    // Determinar status final
    if (stats.steps.failed > 0 && stats.steps.completed === 0) {
      onboardingProcess.status = 'failed';
    } else if (stats.steps.completed === stats.steps.total) {
      onboardingProcess.status = 'completed';
    } else if (stats.steps.completed > 0) {
      onboardingProcess.status = 'completed'; // Parcialmente completo
    } else {
      onboardingProcess.status = 'failed';
    }

    // Adicionar log final
    const duration = Math.round(onboardingProcess.totalDuration / 1000);
    onboardingProcess.addLog('info', 
      `Onboarding finalizado: ${stats.steps.completed}/${stats.steps.total} passos (${duration}s)`
    );

    await onboardingProcess.save();

    // Atualizar sistema
    await system.updateOnboardingStatus(onboardingProcess.status);
    if (onboardingProcess.status === 'completed') {
      system.scriptStatus = 'success';
    } else if (onboardingProcess.status === 'failed') {
      system.scriptStatus = 'failed';
    } else if (onboardingProcess.status === 'in_progress') {
      system.scriptStatus = 'running';
    } else if (onboardingProcess.status === 'pending') {
      system.scriptStatus = 'pending';
    }
    await system.save();
    
    // 🤖 NOVA FUNCIONALIDADE: Análise AI se onboarding 100% completo
    if (onboardingProcess.status === 'completed' && stats.steps.completed === stats.steps.total) {
      console.log('🤖 Onboarding 100% completo! Iniciando análise AI do perfil do sistema...');
      
      try {
        onboardingProcess.addLog('info', 'Iniciando análise AI do perfil do sistema...');
        
        // Inicializar analisador AI
        const analyzer = getSystemProfileAnalyzer();
        
        // Analisar perfil do sistema
        const analysisResult = await analyzer.analyzeSystemProfile(onboardingProcess, system);
        
        if (analysisResult.success) {
          // Atualizar sistema com perfil analisado
          await system.updateAIAnalyzedProfile(analysisResult, analysisResult.metadata);
          
          onboardingProcess.addLog('info', 
            `Perfil AI gerado com sucesso! Tokens usados: ${analysisResult.metadata.tokensUsed}`
          );
          
          console.log(`🎉 Perfil AI gerado para sistema ${system.name}:`);
          console.log(`   - ${analysisResult.profile.topProcesses?.length || 0} processos identificados`);
          console.log(`   - ${analysisResult.profile.activeServices?.length || 0} serviços ativos`);
          console.log(`   - ${analysisResult.profile.openPorts?.length || 0} portas abertas`);
          console.log(`   - Kernel: ${analysisResult.profile.systemInfo?.kernel || 'N/A'}`);
          
          // Notificar clientes sobre perfil AI gerado
          notifyClients(system._id, 'ai_profile_generated', {
            systemId: system._id,
            profile: analysisResult.profile,
            metadata: analysisResult.metadata
          });
          
        } else {
          onboardingProcess.addLog('warning', 
            `Falha na análise AI: ${analysisResult.error}`
          );
          console.log(`⚠️ Falha na análise AI para sistema ${system.name}: ${analysisResult.error}`);
        }
        
        await onboardingProcess.save();
        
      } catch (error) {
        console.error(`❌ Erro na análise AI do sistema ${system.name}:`, error.message);
        onboardingProcess.addLog('error', 
          `Erro na análise AI: ${error.message}`
        );
        await onboardingProcess.save();
      }
    }
    
    console.log(`✅ Onboarding finalizado com status: ${onboardingProcess.status}`);
  }

  /**
   * Executar passo individual manualmente
   * @param {string} onboardingId - ID do processo de onboarding
   * @param {number} stepIndex - Índice do passo
   * @param {Object} credentials - Credenciais SSH
   * @param {Object} options - Opções
   * @returns {Promise<Object>} Resultado da execução
   */
  async executeStepManually(onboardingId, stepIndex, credentials, options = {}) {
    console.log(`🔧 Execução manual do passo ${stepIndex + 1} no onboarding ${onboardingId}`);
    
    let connectionId = null;
    
    try {
      // Buscar processo de onboarding
      const onboardingProcess = await OnboardingProcess.findById(onboardingId)
        .populate('systemId');
      
      if (!onboardingProcess) {
        throw new Error(`Processo de onboarding não encontrado: ${onboardingId}`);
      }

      const system = onboardingProcess.systemId;
      
      // Validar índice do passo
      if (stepIndex < 0 || stepIndex >= onboardingProcess.steps.length) {
        throw new Error(`Índice de passo inválido: ${stepIndex}`);
      }

      // Estabelecer conexão SSH
      const connectionConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        privateKeyPath: credentials.privateKeyPath
      };

      const connection = await sshService.createConnection(connectionConfig);
      connectionId = connection.connectionId;

      // Executar o passo
      await this.executeStep(connectionId, onboardingProcess, stepIndex, options);

      const step = onboardingProcess.steps[stepIndex];
      
      console.log(`✅ Passo manual executado: ${step.step}`);
      
      return {
        success: true,
        step: step.toObject(),
        progress: onboardingProcess.progress,
        status: onboardingProcess.status
      };

    } catch (error) {
      console.error(`❌ Erro na execução manual do passo:`, error.message);
      throw error;
      
    } finally {
      if (connectionId) {
        await sshService.closeConnection(connectionId);
      }
    }
  }

  /**
   * Obter status dos processos em execução
   * @returns {Array} Lista de processos ativos
   */
  getRunningProcesses() {
    const processes = [];
    
    for (const [systemId, processInfo] of this.runningProcesses) {
      processes.push({
        systemId,
        onboardingId: processInfo.onboardingId,
        status: processInfo.status,
        currentStep: processInfo.currentStep,
        stepName: processInfo.stepName,
        startedAt: processInfo.startedAt,
        duration: Date.now() - processInfo.startedAt.getTime()
      });
    }
    
    return processes;
  }

  /**
   * Cancelar processo de onboarding em execução
   * @param {string} systemId - ID do sistema
   * @returns {Promise<boolean>} Se foi cancelado com sucesso
   */
  async cancelRunningProcess(systemId) {
    const processInfo = this.runningProcesses.get(systemId);
    
    if (!processInfo) {
      return false;
    }

    try {
      // Atualizar processo no banco
      const onboardingProcess = await OnboardingProcess.findById(processInfo.onboardingId);
      if (onboardingProcess) {
        onboardingProcess.status = 'cancelled';
        onboardingProcess.addLog('warning', 'Processo cancelado manualmente');
        await onboardingProcess.save();
      }

      // Atualizar sistema
      const system = await System.findById(systemId);
      if (system) {
        await system.updateOnboardingStatus('cancelled');
        system.scriptStatus = 'failed';
        await system.save();
      }

      // Remover da lista de processos ativos
      this.runningProcesses.delete(systemId);
      
      console.log(`🛑 Processo de onboarding cancelado: ${systemId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Erro ao cancelar processo:`, error.message);
      return false;
    }
  }
}

// Instância singleton
const onboardingExecutionService = new OnboardingExecutionService();

module.exports = onboardingExecutionService; 