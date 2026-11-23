/**
 * Controller para execução de testes de sistema via SSH
 * Executa comandos um a um, controlado pelo utilizador
 */

const UiTest = require('../models/UiTest');
const UiTestRun = require('../models/UiTestRun');
const System = require('../models/System');
const sshService = require('../services/sshService');

// Tipos de teste que usam SSH
const SSH_TEST_TYPES = ['os', 'performance', 'network', 'database'];

// Mapa de conexões SSH ativas por runId
const activeConnections = new Map();

/**
 * Inicia uma sessão de teste SSH (cria run e estabelece conexão)
 */
async function startSshSession(req, res) {
  const { uiTestId } = req.params;
  const { credentials } = req.body;

  try {
    // Buscar teste
    const uiTest = await UiTest.findById(uiTestId);
    if (!uiTest) {
      return res.status(404).json({ success: false, message: 'Teste não encontrado' });
    }

    if (!uiTest.steps || uiTest.steps.length === 0) {
      return res.status(400).json({ success: false, message: 'Teste não tem steps definidos' });
    }

    // Verificar se é teste SSH
    if (!SSH_TEST_TYPES.includes(uiTest.testType)) {
      return res.status(400).json({ 
        success: false, 
        message: `Tipo de teste '${uiTest.testType}' não suporta execução SSH`
      });
    }

    // Buscar sistema para obter IP
    const system = await System.findOne({ slug: uiTest.systemSlug });
    if (!system) {
      return res.status(404).json({ success: false, message: 'Sistema não encontrado' });
    }

    // Validar credenciais
    if (!credentials || !credentials.username) {
      return res.status(400).json({ success: false, message: 'Credenciais SSH são obrigatórias' });
    }

    if (!credentials.password && !credentials.privateKey) {
      return res.status(400).json({ success: false, message: 'Password ou chave privada é obrigatória' });
    }

    // Criar run
    const testId = `${uiTest.testType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const run = new UiTestRun({
      testId,
      relatedUiTestId: uiTest._id,
      systemSlug: uiTest.systemSlug,
      testType: uiTest.testType,
      steps: uiTest.steps,
      stepResults: uiTest.steps.map((cmd, idx) => ({
        stepIndex: idx,
        command: cmd,
        status: 'pending'
      })),
      status: 'running',
      currentStep: -1, // Nenhum step executado ainda
      createdBy: req.user?._id || req.user?.userId,
      startedAt: new Date()
    });
    await run.save();

    // Atualizar status do teste
    await UiTest.findByIdAndUpdate(uiTestId, { status: 'processing' });

    // Estabelecer conexão SSH
    console.log(`🔗 [SSH-TEST] Conectando a ${system.ip}...`);

    try {
      const connection = await sshService.createConnection({
        host: system.ip,
        port: 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        timeout: 30000,
        frontendUser: req.user?.username || 'unknown'
      });

      // Guardar conexão no mapa
      activeConnections.set(run._id.toString(), {
        connectionId: connection.connectionId,
        system,
        credentials,
        user: req.user,
        createdAt: new Date()
      });

      console.log(`✅ [SSH-TEST] Sessão iniciada: ${run._id}`);

      res.json({
        success: true,
        message: 'Sessão SSH iniciada',
        data: {
          runId: run._id,
          testId: run.testId,
          status: 'running',
          currentStep: -1,
          totalSteps: uiTest.steps.length,
          steps: uiTest.steps.map((cmd, idx) => ({
            index: idx,
            command: cmd,
            status: 'pending'
          }))
        }
      });

    } catch (connError) {
      // Falha na conexão - atualizar run
      run.status = 'failed';
      run.error = `Falha na conexão SSH: ${connError.message}`;
      run.completedAt = new Date();
      await run.save();

      await UiTest.findByIdAndUpdate(uiTestId, { status: 'failed', error: connError.message });

      return res.status(502).json({
        success: false,
        message: 'Falha na conexão SSH',
        error: connError.message
      });
    }

  } catch (error) {
    console.error('❌ Erro ao iniciar sessão SSH:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

/**
 * Executa o próximo comando (ou um comando específico por índice)
 */
async function executeStep(req, res) {
  const { runId } = req.params;
  const { stepIndex } = req.body; // Opcional: índice específico

  try {
    const run = await UiTestRun.findById(runId);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    }

    if (run.status !== 'running') {
      return res.status(400).json({ success: false, message: 'Execução já terminada' });
    }

    // Determinar qual step executar
    const targetStep = stepIndex !== undefined ? stepIndex : run.currentStep + 1;

    if (targetStep < 0 || targetStep >= run.steps.length) {
      return res.status(400).json({ success: false, message: 'Índice de step inválido' });
    }

    // Verificar se step já foi executado
    if (run.stepResults[targetStep].status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Step ${targetStep + 1} já foi executado (status: ${run.stepResults[targetStep].status})`
      });
    }

    // Obter conexão SSH
    const connInfo = activeConnections.get(runId);
    if (!connInfo) {
      return res.status(400).json({ success: false, message: 'Sessão SSH expirada. Reinicie o teste.' });
    }

    const command = run.steps[targetStep];
    const stepStartTime = Date.now();

    // Atualizar step como running
    run.currentStep = targetStep;
    run.stepResults[targetStep].status = 'running';
    run.stepResults[targetStep].startedAt = new Date();
    await run.save();

    console.log(`🚀 [SSH-TEST] Executando step ${targetStep + 1}/${run.steps.length}: ${command}`);

    try {
      // Executar comando
      const result = await sshService.executeCommand(connInfo.connectionId, command, {
        timeout: 120000,
        frontendUser: connInfo.user?.username || 'unknown'
      });

      const durationMs = Date.now() - stepStartTime;

      // Atualizar step result
      run.stepResults[targetStep].status = result.success ? 'success' : 'failed';
      run.stepResults[targetStep].stdout = result.stdout || '';
      run.stepResults[targetStep].stderr = result.stderr || '';
      run.stepResults[targetStep].exitCode = result.code;
      run.stepResults[targetStep].durationMs = durationMs;
      run.stepResults[targetStep].completedAt = new Date();
      await run.save();

      console.log(`${result.success ? '✅' : '❌'} [SSH-TEST] Step ${targetStep + 1} ${result.success ? 'sucesso' : 'falhou'} (${durationMs}ms)`);

      // Verificar se é o último step
      const isLastStep = targetStep === run.steps.length - 1;
      const allCompleted = run.stepResults.every(s => s.status !== 'pending');

      res.json({
        success: true,
        message: result.success ? 'Comando executado com sucesso' : 'Comando falhou',
        data: {
          stepIndex: targetStep,
          command,
          status: result.success ? 'success' : 'failed',
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: result.code,
          durationMs,
          isLastStep,
          allCompleted,
          nextStep: isLastStep ? null : targetStep + 1
        }
      });

    } catch (cmdError) {
      const durationMs = Date.now() - stepStartTime;

      // Atualizar step como failed
      run.stepResults[targetStep].status = 'failed';
      run.stepResults[targetStep].stderr = cmdError.message;
      run.stepResults[targetStep].exitCode = -1;
      run.stepResults[targetStep].durationMs = durationMs;
      run.stepResults[targetStep].completedAt = new Date();
      await run.save();

      console.error(`❌ [SSH-TEST] Step ${targetStep + 1} erro: ${cmdError.message}`);

      res.json({
        success: true, // Request succeeded, but command failed
        message: 'Comando falhou',
        data: {
          stepIndex: targetStep,
          command,
          status: 'failed',
          stdout: '',
          stderr: cmdError.message,
          exitCode: -1,
          durationMs,
          isLastStep: targetStep === run.steps.length - 1,
          allCompleted: false,
          nextStep: targetStep + 1 < run.steps.length ? targetStep + 1 : null
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro ao executar step:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

/**
 * Finaliza a sessão SSH (fecha conexão e atualiza status)
 */
async function endSshSession(req, res) {
  const { runId } = req.params;

  try {
    const run = await UiTestRun.findById(runId);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    }

    // Fechar conexão SSH
    const connInfo = activeConnections.get(runId);
    if (connInfo) {
      try {
        await sshService.closeConnection(connInfo.connectionId);
        console.log(`🔒 [SSH-TEST] Conexão SSH fechada: ${connInfo.connectionId}`);
      } catch (closeErr) {
        console.warn(`⚠️ [SSH-TEST] Erro ao fechar conexão: ${closeErr.message}`);
      }
      activeConnections.delete(runId);
    }

    // Calcular status final
    const hasFailure = run.stepResults.some(s => s.status === 'failed');
    const allExecuted = run.stepResults.every(s => s.status !== 'pending');

    run.status = allExecuted ? (hasFailure ? 'failed' : 'completed') : 'failed';
    run.completedAt = new Date();
    await run.save();

    // Atualizar status do teste
    await UiTest.findByIdAndUpdate(run.relatedUiTestId, { 
      status: run.status === 'completed' ? 'answered' : 'failed'
    });

    const successCount = run.stepResults.filter(s => s.status === 'success').length;
    const failedCount = run.stepResults.filter(s => s.status === 'failed').length;
    const pendingCount = run.stepResults.filter(s => s.status === 'pending').length;

    console.log(`🏁 [SSH-TEST] Sessão terminada: ${successCount} sucesso, ${failedCount} falhas, ${pendingCount} pendentes`);

    res.json({
      success: true,
      message: 'Sessão terminada',
      data: {
        runId: run._id,
        status: run.status,
        successCount,
        failedCount,
        pendingCount,
        totalSteps: run.steps.length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao terminar sessão:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

/**
 * Cancela/para uma execução em curso
 */
async function cancelRun(req, res) {
  const { runId } = req.params;

  try {
    const run = await UiTestRun.findById(runId);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    }

    if (run.status !== 'running') {
      return res.status(400).json({ success: false, message: 'Execução já não está a correr' });
    }

    // Fechar conexão SSH
    const connInfo = activeConnections.get(runId);
    if (connInfo) {
      try {
        await sshService.closeConnection(connInfo.connectionId);
        console.log(`🔒 [SSH-TEST] Conexão SSH cancelada: ${connInfo.connectionId}`);
      } catch (closeErr) {
        console.warn(`⚠️ [SSH-TEST] Erro ao fechar conexão: ${closeErr.message}`);
      }
      activeConnections.delete(runId);
    }

    // Marcar steps pendentes como skipped
    run.stepResults.forEach((step, idx) => {
      if (step.status === 'pending' || step.status === 'running') {
        run.stepResults[idx].status = 'skipped';
        run.stepResults[idx].stderr = 'Execution cancelled by user';
      }
    });

    // Atualizar run como cancelled (vamos usar 'failed' já que não temos 'cancelled' no enum)
    run.status = 'failed';
    run.error = 'Execution cancelled by user';
    run.completedAt = new Date();
    await run.save();

    // Atualizar status do teste original
    await UiTest.findByIdAndUpdate(run.relatedUiTestId, { 
      status: 'answered' // Voltamos para answered para permitir nova execução
    });

    const successCount = run.stepResults.filter(s => s.status === 'success').length;
    const skippedCount = run.stepResults.filter(s => s.status === 'skipped').length;

    console.log(`🛑 [SSH-TEST] Execution cancelled: ${successCount} success, ${skippedCount} skipped`);

    res.json({
      success: true,
      message: 'Execution cancelled',
      data: {
        runId: run._id,
        status: 'cancelled',
        successCount,
        skippedCount,
        totalSteps: run.steps.length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao cancelar execução:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

/**
 * Lista histórico de execuções de um teste ou sistema
 */
async function listRuns(req, res) {
  try {
    const { systemSlug, uiTestId, limit = 20, page = 1 } = req.query;

    const filter = {};
    if (systemSlug) filter.systemSlug = systemSlug;
    if (uiTestId) filter.relatedUiTestId = uiTestId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [runs, total] = await Promise.all([
      UiTestRun.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('relatedUiTestId', 'title testType')
        .lean(),
      UiTestRun.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        runs,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar execuções:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

/**
 * Executa um comando customizado (editado pelo utilizador)
 */
async function executeCustomCommand(req, res) {
  const { runId } = req.params;
  const { command } = req.body;

  try {
    if (!command || typeof command !== 'string' || !command.trim()) {
      return res.status(400).json({ success: false, message: 'Comando é obrigatório' });
    }

    const run = await UiTestRun.findById(runId);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    }

    if (run.status !== 'running') {
      return res.status(400).json({ success: false, message: 'Sessão não está ativa' });
    }

    // Obter conexão SSH
    const connInfo = activeConnections.get(runId);
    if (!connInfo) {
      return res.status(400).json({ success: false, message: 'Sessão SSH expirada. Reinicie o teste.' });
    }

    const stepStartTime = Date.now();

    console.log(`🚀 [SSH-TEST] Executando comando customizado: ${command}`);

    try {
      // Executar comando
      const result = await sshService.executeCommand(connInfo.connectionId, command.trim(), {
        timeout: 120000,
        frontendUser: connInfo.user?.username || 'unknown'
      });

      const durationMs = Date.now() - stepStartTime;

      console.log(`${result.success ? '✅' : '❌'} [SSH-TEST] Comando customizado ${result.success ? 'sucesso' : 'falhou'} (${durationMs}ms)`);

      res.json({
        success: true,
        message: result.success ? 'Comando executado com sucesso' : 'Comando falhou',
        data: {
          command: command.trim(),
          status: result.success ? 'success' : 'failed',
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: result.code,
          durationMs
        }
      });

    } catch (cmdError) {
      const durationMs = Date.now() - stepStartTime;

      console.error(`❌ [SSH-TEST] Comando customizado erro: ${cmdError.message}`);

      res.json({
        success: true,
        message: 'Comando falhou',
        data: {
          command: command.trim(),
          status: 'failed',
          stdout: '',
          stderr: cmdError.message,
          exitCode: -1,
          durationMs
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro ao executar comando customizado:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

/**
 * Obtém o status de uma execução com resultados de todos os steps
 */
async function getRunStatus(req, res) {
  try {
    const { runId } = req.params;
    
    const run = await UiTestRun.findById(runId);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    }

    // Verificar se há conexão ativa
    const hasActiveConnection = activeConnections.has(runId);

    res.json({
      success: true,
      data: {
        runId: run._id,
        testId: run.testId,
        status: run.status,
        testType: run.testType,
        currentStep: run.currentStep,
        totalSteps: run.steps.length,
        stepResults: run.stepResults,
        steps: run.steps,
        error: run.error,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        hasActiveConnection
      }
    });
  } catch (error) {
    console.error('❌ Erro ao obter status da execução:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

// Limpar conexões inativas a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutos

  for (const [runId, connInfo] of activeConnections) {
    if (now - connInfo.createdAt.getTime() > maxAge) {
      console.log(`🧹 [SSH-TEST] Limpando conexão inativa: ${runId}`);
      sshService.closeConnection(connInfo.connectionId).catch(() => {});
      activeConnections.delete(runId);
    }
  }
}, 10 * 60 * 1000);

module.exports = {
  startSshSession,
  executeStep,
  executeCustomCommand,
  endSshSession,
  cancelRun,
  getRunStatus,
  listRuns,
  SSH_TEST_TYPES
};
