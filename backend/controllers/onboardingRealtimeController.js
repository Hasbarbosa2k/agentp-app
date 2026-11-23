const OnboardingProcess = require('../models/OnboardingProcess');
const System = require('../models/System');
const { logRequest } = require('../middleware/auth');

// Armazenar conexões ativas para SSE
const activeConnections = new Map();

/**
 * Conectar ao stream de atualizações do onboarding
 * @swagger
 * /onboarding/realtime/{systemId}/stream:
 *   get:
 *     summary: Stream de atualizações em tempo real do onboarding
 *     tags: [Onboarding Realtime]
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
 *         description: Stream de eventos estabelecido
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
const streamOnboardingUpdates = async (req, res) => {
  try {
    logRequest(req);

    const { systemId } = req.params;
    const userId = req.user.userId;

    // Verificar se o sistema existe
    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    // Configurar headers para SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // ID único para esta conexão
    const connectionId = `${systemId}_${userId}_${Date.now()}`;
    
    // Função para enviar dados
    const sendEvent = (eventType, data) => {
      const eventData = JSON.stringify(data);
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${eventData}\n\n`);
    };

    // Armazenar conexão
    activeConnections.set(connectionId, {
      systemId,
      userId,
      response: res,
      sendEvent,
      connectedAt: new Date()
    });

    // Enviar estado inicial
    const onboardingProcess = await OnboardingProcess.findOne({ systemId })
      .populate('initiatedBy', 'username email displayName')
      .populate('completedBy', 'username email displayName');

    if (onboardingProcess) {
      sendEvent('initial_state', {
        onboarding: {
          ...onboardingProcess.toObject(),
          detailedStatus: onboardingProcess.detailedStatus
        },
        system: {
          id: system._id,
          name: system.name,
          ip: system.ip,
          onboardingStatus: system.onboardingStatus
        }
      });
    } else {
      sendEvent('initial_state', {
        hasOnboarding: false,
        system: {
          id: system._id,
          name: system.name,
          ip: system.ip,
          onboardingStatus: system.onboardingStatus
        }
      });
    }

    // Heartbeat a cada 30 segundos
    const heartbeatInterval = setInterval(() => {
      if (activeConnections.has(connectionId)) {
        sendEvent('heartbeat', { timestamp: new Date().toISOString() });
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // Cleanup quando cliente desconecta
    req.on('close', () => {
      console.log(`🔌 Cliente desconectado do stream: ${connectionId}`);
      activeConnections.delete(connectionId);
      clearInterval(heartbeatInterval);
    });

    console.log(`🔌 Cliente conectado ao stream: ${connectionId} para sistema ${system.name}`);

  } catch (error) {
    console.error('❌ Erro ao estabelecer stream SSE:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obter histórico detalhado de logs do onboarding
 * @swagger
 * /onboarding/realtime/{systemId}/logs:
 *   get:
 *     summary: Obter histórico detalhado de logs
 *     tags: [Onboarding Realtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do sistema
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warning, error, debug]
 *         description: Filtrar por nível de log
 *       - in: query
 *         name: stepIndex
 *         schema:
 *           type: integer
 *         description: Filtrar por índice do passo (-1 para logs gerais)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Limite de logs retornados
 *     responses:
 *       200:
 *         description: Logs obtidos com sucesso
 */
const getDetailedLogs = async (req, res) => {
  try {
    logRequest(req);

    const { systemId } = req.params;
    const { level, stepIndex, limit = 100 } = req.query;

    const onboardingProcess = await OnboardingProcess.findOne({ systemId });
    if (!onboardingProcess) {
      return res.status(404).json({
        success: false,
        message: 'Processo de onboarding não encontrado'
      });
    }

    // Filtrar logs
    let logs = [...onboardingProcess.logs];

    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    if (stepIndex !== undefined) {
      const stepIdx = parseInt(stepIndex);
      logs = logs.filter(log => log.stepIndex === stepIdx);
    }

    // Ordenar por timestamp (mais recente primeiro)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Aplicar limite
    logs = logs.slice(0, parseInt(limit));

    // Obter logs específicos dos passos também
    const stepLogs = [];
    onboardingProcess.steps.forEach((step, index) => {
      if (step.stepLogs && step.stepLogs.length > 0) {
        step.stepLogs.forEach(stepLog => {
          stepLogs.push({
            ...stepLog.toObject(),
            stepIndex: index,
            stepName: step.step,
            source: 'step'
          });
        });
      }
    });

    // Filtrar step logs se necessário
    let filteredStepLogs = stepLogs;
    if (level) {
      filteredStepLogs = filteredStepLogs.filter(log => log.level === level);
    }
    if (stepIndex !== undefined) {
      const stepIdx = parseInt(stepIndex);
      filteredStepLogs = filteredStepLogs.filter(log => log.stepIndex === stepIdx);
    }

    // Combinar todos os logs
    const allLogs = [...logs, ...filteredStepLogs];
    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      message: 'Logs obtidos com sucesso',
      data: {
        logs: allLogs.slice(0, parseInt(limit)),
        totalLogs: allLogs.length,
        filters: { level, stepIndex, limit },
        summary: {
          totalSteps: onboardingProcess.totalSteps,
          completedSteps: onboardingProcess.completedSteps,
          failedSteps: onboardingProcess.failedSteps,
          status: onboardingProcess.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter logs detalhados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obter estatísticas em tempo real do onboarding
 * @swagger
 * /onboarding/realtime/{systemId}/stats:
 *   get:
 *     summary: Obter estatísticas em tempo real
 *     tags: [Onboarding Realtime]
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
 *         description: Estatísticas obtidas com sucesso
 */
const getRealtimeStats = async (req, res) => {
  try {
    logRequest(req);

    const { systemId } = req.params;

    const onboardingProcess = await OnboardingProcess.findOne({ systemId });
    if (!onboardingProcess) {
      return res.status(404).json({
        success: false,
        message: 'Processo de onboarding não encontrado'
      });
    }

    const stats = {
      overall: {
        status: onboardingProcess.status,
        progress: onboardingProcess.progress,
        startedAt: onboardingProcess.startedAt,
        completedAt: onboardingProcess.completedAt,
        totalDuration: onboardingProcess.totalDuration
      },
      steps: {
        total: onboardingProcess.totalSteps,
        completed: onboardingProcess.completedSteps,
        failed: onboardingProcess.failedSteps,
        skipped: onboardingProcess.skippedSteps,
        pending: onboardingProcess.totalSteps - onboardingProcess.completedSteps - onboardingProcess.failedSteps - onboardingProcess.skippedSteps
      },
      currentStep: onboardingProcess.currentStep,
      execution: onboardingProcess.executionStats,
      logs: {
        total: onboardingProcess.logs.length,
        byLevel: {
          info: onboardingProcess.logs.filter(l => l.level === 'info').length,
          warning: onboardingProcess.logs.filter(l => l.level === 'warning').length,
          error: onboardingProcess.logs.filter(l => l.level === 'error').length,
          debug: onboardingProcess.logs.filter(l => l.level === 'debug').length
        }
      },
      lastActivity: onboardingProcess.updatedAt
    };

    res.json({
      success: true,
      message: 'Estatísticas obtidas com sucesso',
      data: stats
    });

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas em tempo real:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Função auxiliar para notificar atualizações para clientes conectados
 * @param {string} systemId - ID do sistema
 * @param {string} eventType - Tipo do evento
 * @param {Object} data - Dados do evento
 */
const notifyClients = (systemId, eventType, data) => {
  const systemConnections = Array.from(activeConnections.values())
    .filter(conn => conn.systemId === systemId);

  console.log(`📡 Notificando ${systemConnections.length} clientes sobre ${eventType} do sistema ${systemId}`);

  systemConnections.forEach(connection => {
    try {
      connection.sendEvent(eventType, data);
    } catch (error) {
      console.warn('⚠️ Erro ao enviar evento para cliente:', error.message);
      // Remover conexão inválida
      const connectionId = Array.from(activeConnections.entries())
        .find(([id, conn]) => conn === connection)?.[0];
      if (connectionId) {
        activeConnections.delete(connectionId);
      }
    }
  });
};

/**
 * Obter informações sobre conexões ativas (admin)
 */
const getActiveConnections = (req, res) => {
  const connections = Array.from(activeConnections.entries()).map(([id, conn]) => ({
    id,
    systemId: conn.systemId,
    userId: conn.userId,
    connectedAt: conn.connectedAt,
    duration: Date.now() - conn.connectedAt.getTime()
  }));

  res.json({
    success: true,
    data: {
      totalConnections: connections.length,
      connections
    }
  });
};

module.exports = {
  streamOnboardingUpdates,
  getDetailedLogs,
  getRealtimeStats,
  notifyClients,
  getActiveConnections
}; 