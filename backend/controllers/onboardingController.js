const OnboardingProcess = require('../models/OnboardingProcess');
const OnboardingTemplate = require('../models/OnboardingTemplate');
const System = require('../models/System');
const { logRequest } = require('../middleware/auth');
const { processCommand, COMPLETE_ONBOARDING_STEPS } = require('../configs/onboardingSteps');
const onboardingPersistenceService = require('../services/onboardingPersistenceService');

/**
 * VERSÃO FUNCIONAL SIMPLIFICADA DO startOnboarding
 * Remove problemas de middleware e foca na funcionalidade principal
 */
const startOnboardingFixed = async (req, res) => {
  console.log('🚀 startOnboardingFixed executado');
  
  try {
    const { systemId, customSteps, config, templateId } = req.body;
    const userId = req.user?.userId || req.user?._id;

    console.log(`📋 Dados recebidos:`, { systemId, hasCustomSteps: !!customSteps, hasConfig: !!config, hasTemplateId: !!templateId });

    // Verificar se sistema existe
    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    console.log(`✅ Sistema encontrado: ${system.name}`);

    // Obter/criar processo de onboarding (reinicia se já existir um completo/falhado)
    let onboardingProcess;
    let template = null;

    // 1. PASSOS BASE OBRIGATÓRIOS - Sempre executados primeiro
    console.log(`📋 Preparando passos base obrigatórios...`);
    const baseSteps = COMPLETE_ONBOARDING_STEPS.map(baseStep => ({
      step: baseStep.step,
      description: baseStep.description,
      command: processCommand(baseStep.command, system),
      timeout: baseStep.timeout,
      retryable: baseStep.retryable,
      required: baseStep.required !== false, // obrigatório por padrão
      order: baseStep.order,
      category: baseStep.category,
      isBaseStep: true // marcar como passo base
    }));
    
    console.log(`✅ ${baseSteps.length} passos base preparados`);

    // 2. PASSOS DO TEMPLATE (OPCIONAL) - Adicionados após os passos base
    let templateSteps = [];
    
    if (templateId) {
      template = await OnboardingTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
      }

      if (template.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Template não está ativo',
          error: 'TEMPLATE_NOT_ACTIVE'
        });
      }

      console.log(`📋 Usando template adicional: ${template.name} v${template.version}`);
      
      // Converter passos do template - ordem começa após os passos base
      const baseMaxOrder = Math.max(...baseSteps.map(s => s.order));
      
      templateSteps = template.steps.map((templateStep, index) => {
        let command = templateStep.command;
        const systemOS = system.osInfo?.id || system.os || 'ubuntu';
        
        if (templateStep.osSpecificCommands && templateStep.osSpecificCommands[systemOS]) {
          command = templateStep.osSpecificCommands[systemOS];
        }
        
        return {
          step: templateStep.name,
          description: templateStep.description,
          command: processCommand(command, system),
          timeout: templateStep.timeout,
          retryable: templateStep.retryable,
          required: templateStep.required,
          order: baseMaxOrder + templateStep.order, // ordem após passos base
          category: templateStep.category,
          templateValidations: templateStep.validations,
          isBaseStep: false // marcar como passo de template
        };
      });
      
      console.log(`✅ ${templateSteps.length} passos do template preparados`);
    } else {
      console.log(`ℹ️ Nenhum template adicional - apenas passos base serão executados`);
    }

    // 3. COMBINAR PASSOS: Base + Template
    const steps = [...baseSteps, ...templateSteps].sort((a, b) => a.order - b.order);
    
    console.log(`✅ Total: ${steps.length} passos preparados (${baseSteps.length} base + ${templateSteps.length} template)`);

    // Criar/reiniciar processo de onboarding usando o serviço de persistência
    onboardingProcess = await onboardingPersistenceService.getOrCreateOnboardingProcess(
      systemId,
      userId,
      true // restart = true para garantir que reinicia processos anteriores
    );

    // Configurar o processo
    onboardingProcess.config = {
      autoRetry: true,
      maxRetries: 3,
      timeoutSeconds: 300,
      ...config
    };

    // Se usando template, aplicar configurações do template e salvar referência
    if (template) {
      onboardingProcess.config = {
        ...onboardingProcess.config,
        autoRetry: template.config.maxRetries > 0,
        maxRetries: template.config.maxRetries,
        timeoutSeconds: template.config.globalTimeout,
        stopOnFirstError: template.config.stopOnFirstError,
        allowParallelExecution: template.config.allowParallelExecution,
        ...config // user config override template config
      };

      // Salvar referência do template usado
      onboardingProcess.templateId = template._id;
      onboardingProcess.templateName = template.name;
      onboardingProcess.templateVersion = template.version;
    }

    // Adicionar passos
    console.log(`📋 Adicionando ${steps.length} passos...`);
    steps.forEach((stepData, index) => {
      console.log(`   ${index + 1}. ${stepData.step}`);
      onboardingProcess.addStep(stepData);
    });

    // Salvar
    console.log('💾 Salvando processo...');
    await onboardingProcess.save();

    // Atualizar status do sistema e scriptStatus
    await system.updateOnboardingStatus('pending');
    system.scriptStatus = 'pending';
    await system.save();

    console.log(`✅ Onboarding criado com sucesso! ID: ${onboardingProcess._id}`);

    const responseData = {
      onboardingId: onboardingProcess._id,
      systemId,
      totalSteps: onboardingProcess.totalSteps,
      status: onboardingProcess.status,
      progress: onboardingProcess.progress,
      steps: onboardingProcess.steps.map(s => ({
        step: s.step,
        description: s.description,
        status: s.status,
        hasValidations: !!(s.templateValidations && s.templateValidations.length > 0)
      }))
    };

    // Incluir informações do template se foi usado
    if (template) {
      responseData.template = {
        id: template._id,
        name: template.name,
        version: template.version,
        category: template.category,
        totalValidations: template.totalValidations
      };
    }

    res.status(201).json({
      success: true,
      message: template ? 
        `Processo de onboarding iniciado com template "${template.name}"` :
        'Processo de onboarding iniciado com sucesso',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Erro em startOnboardingFixed:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obter status do onboarding de um sistema
 * @swagger
 * /onboarding/system/{systemId}:
 *   get:
 *     summary: Obter status do onboarding
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do sistema
 *     responses:
 *       200:
 *         description: Status do onboarding obtido
 *       404:
 *         description: Sistema ou onboarding não encontrado
 */
const getOnboardingStatus = async (req, res) => {
  try {
    logRequest(req);

    const { systemId } = req.params;

    // Buscar sistema e processo de onboarding
    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    const onboardingProcess = await OnboardingProcess.findOne({ systemId })
      .populate('initiatedBy', 'username email displayName')
      .populate('completedBy', 'username email displayName');

    if (!onboardingProcess) {
      return res.json({
        success: true,
        message: 'Nenhum processo de onboarding encontrado',
        data: {
          hasOnboarding: false,
          systemOnboardingStatus: system.onboardingStatus,
          onboardingRequired: system.onboardingRequired,
          needsOnboarding: system.needsOnboarding()
        }
      });
    }

    console.log(`📋 Status do onboarding obtido para sistema ${system.name}`);

    // Calcular estatísticas avançadas
    const recentLogs = onboardingProcess.logs
      .filter(log => new Date() - new Date(log.timestamp) < 5 * 60 * 1000) // últimos 5 minutos
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const stepsSummary = onboardingProcess.steps.map((step, index) => ({
      index,
      step: step.step,
      status: step.status,
      duration: step.duration,
      output: step.output ? step.output.substring(0, 200) + (step.output.length > 200 ? '...' : '') : '',
      error: step.error || null,
      retryCount: step.retryCount,
      executionDetails: step.executionDetails
    }));

    res.json({
      success: true,
      message: 'Status do onboarding obtido com sucesso',
      data: {
        hasOnboarding: true,
        onboarding: {
          ...onboardingProcess.toObject(),
          detailedStatus: onboardingProcess.detailedStatus,
          stepsSummary,
          recentLogs: recentLogs.slice(0, 10), // últimos 10 logs
          executionStats: onboardingProcess.executionStats
        },
        system: {
          id: system._id,
          name: system.name,
          ip: system.ip,
          onboardingStatus: system.onboardingStatus,
          onboardingStatusDisplay: system.onboardingStatusDisplay,
          lastOnboardingAt: system.lastOnboardingAt
        },
        realtime: {
          streamUrl: `/onboarding/realtime/${system._id}/stream`,
          logsUrl: `/onboarding/realtime/${system._id}/logs`,
          statsUrl: `/onboarding/realtime/${system._id}/stats`
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter status do onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Executar passo do onboarding
 * @swagger
 * /onboarding/{onboardingId}/step/{stepIndex}/execute:
 *   post:
 *     summary: Executar passo específico do onboarding
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: onboardingId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do processo de onboarding
 *       - in: path
 *         name: stepIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Índice do passo (0-based)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               output:
 *                 type: string
 *                 description: Output do comando executado
 *               error:
 *                 type: string
 *                 description: Erro (se houver)
 *               osInfo:
 *                 type: object
 *                 description: Informações do OS (para o passo Detect OS)
 *     responses:
 *       200:
 *         description: Passo executado com sucesso
 *       404:
 *         description: Processo de onboarding não encontrado
 *       400:
 *         description: Índice de passo inválido
 */
const executeStep = async (req, res) => {
  try {
    logRequest(req);

    const { onboardingId, stepIndex } = req.params;
    const { output, error, osInfo } = req.body;

    const onboardingProcess = await OnboardingProcess.findById(onboardingId);
    if (!onboardingProcess) {
      return res.status(404).json({
        success: false,
        message: 'Processo de onboarding não encontrado'
      });
    }

    const stepIdx = parseInt(stepIndex);
    if (stepIdx < 0 || stepIdx >= onboardingProcess.steps.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice de passo inválido'
      });
    }

    // Marcar passo como iniciado se ainda não foi
    if (onboardingProcess.steps[stepIdx].status === 'pending') {
      onboardingProcess.startStep(stepIdx);
    }

    // Executar validações do template se existirem
    let validationResults = null;
    const currentStep = onboardingProcess.steps[stepIdx];
    if (!error && output && currentStep.templateValidations && currentStep.templateValidations.length > 0) {
      console.log(`🔍 Executando ${currentStep.templateValidations.length} validações para passo: ${currentStep.step}`);
      
      // Carregar template para usar os métodos de validação
      if (onboardingProcess.templateId) {
        const template = await OnboardingTemplate.findById(onboardingProcess.templateId);
        if (template) {
          try {
            validationResults = template.validateStepOutput(stepIdx, output);
            onboardingProcess.addLog('info', 
              `Validações: ${validationResults.passedValidations}/${validationResults.totalValidations} passaram`
            );
            
            // Se validações obrigatórias falharam, marcar passo como falho
            if (!validationResults.overallSuccess) {
              const failedRequired = validationResults.validationResults
                .filter(v => !v.success && v.required)
                .map(v => v.description || v.value);
              
              const validationError = `Validações obrigatórias falharam: ${failedRequired.join(', ')}`;
              onboardingProcess.addLog('error', validationError);
              
              // Re-executar completeStep com erro de validação
              onboardingProcess.completeStep(stepIdx, output, validationError);
            }
          } catch (validationError) {
            onboardingProcess.addLog('warning', `Erro nas validações: ${validationError.message}`);
          }
        }
      }
    }

    // Completar o passo
    const step = onboardingProcess.completeStep(stepIdx, output, error);

    // Se for o passo de detecção de OS e temos osInfo, salvar
    if (step.step.includes('Detect OS') && osInfo && !error) {
      onboardingProcess.osInfo = osInfo;
      onboardingProcess.addLog('info', `OS detectado: ${osInfo.prettyName || osInfo.id}`);
    }

    await onboardingProcess.save();

    // Atualizar status do sistema baseado no progresso
    const system = await System.findById(onboardingProcess.systemId);
    if (system) {
      if (onboardingProcess.status === 'completed') {
        await system.updateOnboardingStatus('completed');
        system.scriptStatus = 'success';
        await system.save();
      } else if (onboardingProcess.status === 'in_progress') {
        await system.updateOnboardingStatus('in_progress');
        system.scriptStatus = 'running';
        await system.save();
      } else if (onboardingProcess.status === 'failed') {
        await system.updateOnboardingStatus('failed');
        system.scriptStatus = 'failed';
        await system.save();
      }
    }

    console.log(`🚀 Passo ${stepIdx + 1} executado: ${step.step} - Status: ${step.status}`);

    const responseData = {
      step: step,
      stepIndex: stepIdx,
      onboardingStatus: onboardingProcess.status,
      progress: onboardingProcess.progress,
      detailedStatus: onboardingProcess.detailedStatus
    };

    // Incluir resultados das validações se executadas
    if (validationResults) {
      responseData.validations = validationResults;
    }

    res.json({
      success: true,
      message: validationResults ? 
        `Passo executado com ${validationResults.passedValidations}/${validationResults.totalValidations} validações passaram` :
        'Passo executado com sucesso',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Erro ao executar passo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Cancelar processo de onboarding
 * @swagger
 * /onboarding/{onboardingId}/cancel:
 *   post:
 *     summary: Cancelar processo de onboarding
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: onboardingId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do processo de onboarding
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Motivo do cancelamento
 *     responses:
 *       200:
 *         description: Onboarding cancelado
 *       404:
 *         description: Processo de onboarding não encontrado
 */
const cancelOnboarding = async (req, res) => {
  try {
    logRequest(req);

    const { onboardingId } = req.params;
    const { reason } = req.body;

    const onboardingProcess = await OnboardingProcess.findById(onboardingId);
    if (!onboardingProcess) {
      return res.status(404).json({
        success: false,
        message: 'Processo de onboarding não encontrado'
      });
    }

    // Atualizar status
    onboardingProcess.status = 'cancelled';
    onboardingProcess.addLog('warning', `Onboarding cancelado${reason ? ': ' + reason : ''}`, 'user');

    await onboardingProcess.save();

    // Atualizar status do sistema
    const system = await System.findById(onboardingProcess.systemId);
    if (system) {
      await system.updateOnboardingStatus('cancelled');
    }

    console.log(`⚠️ Onboarding cancelado para sistema ${onboardingProcess.systemId}`);

    res.json({
      success: true,
      message: 'Processo de onboarding cancelado com sucesso',
      data: {
        onboardingId,
        status: onboardingProcess.status,
        cancelledAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Erro ao cancelar onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Listar processos de onboarding
 * @swagger
 * /onboarding:
 *   get:
 *     summary: Listar processos de onboarding
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, failed, cancelled]
 *         description: Filtrar por status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Lista de processos de onboarding
 */
const listOnboardingProcesses = async (req, res) => {
  try {
    logRequest(req);

    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = {};
    if (status) {
      filters.status = status;
    }

    // Buscar processos
    const onboardingProcesses = await OnboardingProcess.find(filters)
      .populate('systemId', 'name ip status environment')
      .populate('initiatedBy', 'username email displayName')
      .populate('completedBy', 'username email displayName')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await OnboardingProcess.countDocuments(filters);

    console.log(`📋 ${onboardingProcesses.length} processos de onboarding listados`);

    res.json({
      success: true,
      message: 'Processos de onboarding listados com sucesso',
      data: {
        onboardingProcesses: onboardingProcesses.map(process => ({
          ...process.toObject(),
          detailedStatus: process.detailedStatus
        })),
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar processos de onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obter detalhes completos de um processo de onboarding
 * @swagger
 * /onboarding/{onboardingId}:
 *   get:
 *     summary: Obter detalhes do processo de onboarding
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: onboardingId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do processo de onboarding
 *     responses:
 *       200:
 *         description: Detalhes do processo de onboarding
 *       404:
 *         description: Processo de onboarding não encontrado
 */
const getOnboardingDetails = async (req, res) => {
  try {
    logRequest(req);

    const { onboardingId } = req.params;

    const onboardingProcess = await OnboardingProcess.findById(onboardingId)
      .populate('systemId', 'name ip status environment owner description')
      .populate('initiatedBy', 'username email displayName')
      .populate('completedBy', 'username email displayName');

    if (!onboardingProcess) {
      return res.status(404).json({
        success: false,
        message: 'Processo de onboarding não encontrado'
      });
    }

    console.log(`📋 Detalhes do onboarding obtidos: ${onboardingId}`);

    res.json({
      success: true,
      message: 'Detalhes do onboarding obtidos com sucesso',
      data: {
        onboarding: {
          ...onboardingProcess.toObject(),
          detailedStatus: onboardingProcess.detailedStatus
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter detalhes do onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  startOnboarding: startOnboardingFixed,
  getOnboardingStatus,
  executeStep,
  cancelOnboarding,
  listOnboardingProcesses,
  getOnboardingDetails
}; 