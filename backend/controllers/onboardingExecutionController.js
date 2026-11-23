const onboardingExecutionService = require('../services/onboardingExecutionService');
const sshService = require('../services/sshService');
const { logRequest } = require('../middleware/auth');

/**
 * Executar onboarding completo via SSH
 * @swagger
 * /onboarding-execution/run:
 *   post:
 *     summary: Executar onboarding completo via SSH
 *     tags: [Onboarding Execution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - systemId
 *               - credentials
 *             properties:
 *               systemId:
 *                 type: string
 *                 description: ID do sistema
 *               credentials:
 *                 type: object
 *                 description: Credenciais SSH
 *                 properties:
 *                   username:
 *                     type: string
 *                     description: Nome de usuário SSH
 *                   password:
 *                     type: string
 *                     description: Senha SSH (opcional)
 *                   privateKey:
 *                     type: string
 *                     description: Chave privada SSH (opcional)
 *                   privateKeyPath:
 *                     type: string
 *                     description: Caminho para chave privada (opcional)
 *               options:
 *                 type: object
 *                 description: Opções de execução
 *                 properties:
 *                   autoRetry:
 *                     type: boolean
 *                     description: Retry automático em falhas
 *                   maxRetries:
 *                     type: integer
 *                     description: Máximo de tentativas
 *                   timeout:
 *                     type: integer
 *                     description: Timeout em segundos
 *                   continueOnFailure:
 *                     type: boolean
 *                     description: Continuar mesmo com falhas
 *     responses:
 *       200:
 *         description: Onboarding executado com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Sistema não encontrado
 *       409:
 *         description: Onboarding já em progresso
 */
const runOnboarding = async (req, res) => {
  
  try {
    logRequest(req, res, () => {}); // Função vazia como next

    const { systemId, credentials, options = {} } = req.body;
    const userId = req.user?._id;

    // Debug removido para limpar logs

    
    // Validar dados obrigatórios
    if (!systemId) {
      return res.status(400).json({
        success: false,
        message: 'ID do sistema é obrigatório'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado - ID do usuário é obrigatório'
      });
    }

    if (!credentials || !credentials.username) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais SSH são obrigatórias (pelo menos username)'
      });
    }

    if (!credentials.password && !credentials.privateKey && !credentials.privateKeyPath) {
      return res.status(400).json({
        success: false,
        message: 'Senha ou chave privada SSH é obrigatória'
      });
    }

    // Adicionar userId às opções
    options.userId = userId;

    console.log(`🚀 Iniciando execução de onboarding via SSH para sistema ${systemId}`);

    // Executar onboarding
    const result = await onboardingExecutionService.runOnboarding(systemId, credentials, options);

    res.json({
      success: true,
      message: 'Onboarding executado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro na execução de onboarding:', error);

    // Determinar código de status baseado no tipo de erro
    let statusCode = 500;
    if (error.message.includes('não encontrado')) {
      statusCode = 404;
    } else if (error.message.includes('já em progresso')) {
      statusCode = 409;
    } else if (error.message.includes('credenciais') || error.message.includes('SSH')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: 'Erro na execução de onboarding',
      error: error.message
    });
  }
};

/**
 * Executar passo individual manualmente
 * @swagger
 * /onboarding-execution/step:
 *   post:
 *     summary: Executar passo individual de onboarding via SSH
 *     tags: [Onboarding Execution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - onboardingId
 *               - stepIndex
 *               - credentials
 *             properties:
 *               onboardingId:
 *                 type: string
 *                 description: ID do processo de onboarding
 *               stepIndex:
 *                 type: integer
 *                 description: Índice do passo a executar
 *               credentials:
 *                 $ref: '#/components/schemas/SSHCredentials'
 *               options:
 *                 $ref: '#/components/schemas/OnboardingExecutionOptions'
 *     responses:
 *       200:
 *         description: Passo executado com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Processo ou passo não encontrado
 */
const executeStepManually = async (req, res) => {
  try {
    logRequest(req, res, () => {}); // Função vazia como next

    const { onboardingId, stepIndex, credentials, options = {} } = req.body;

    if (!onboardingId || stepIndex === undefined || !credentials) {
      return res.status(400).json({
        success: false,
        message: 'OnboardingId, stepIndex e credenciais são obrigatórios'
      });
    }

    console.log(`🔧 Executando passo ${stepIndex} manualmente para processo ${onboardingId}`);

    const result = await onboardingExecutionService.executeStepManually(
      onboardingId, 
      stepIndex, 
      credentials, 
      options
    );

    res.json({
      success: true,
      message: 'Passo executado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro na execução manual de passo:', error);

    let statusCode = 500;
    if (error.message.includes('não encontrado')) {
      statusCode = 404;
    } else if (error.message.includes('inválido')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: 'Erro na execução manual do passo',
      error: error.message
    });
  }
};

/**
 * Listar processos de onboarding em execução
 * @swagger
 * /onboarding-execution/running:
 *   get:
 *     summary: Listar processos de onboarding em execução
 *     tags: [Onboarding Execution]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de processos em execução
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     runningProcesses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           systemId:
 *                             type: string
 *                           onboardingId:
 *                             type: string
 *                           status:
 *                             type: string
 *                           currentStep:
 *                             type: integer
 *                           stepName:
 *                             type: string
 *                           startedAt:
 *                             type: string
 *                             format: date-time
 *                           duration:
 *                             type: integer
 *                           durationFormatted:
 *                             type: string
 *                           isStuck:
 *                             type: boolean
 *                     totalRunning:
 *                       type: integer
 *                     summary:
 *                       type: object
 */
const getRunningProcesses = async (req, res) => {
  try {
    logRequest(req, res, () => {}); // Função vazia como next

    console.log('📋 Listando processos de onboarding em execução');

    const runningProcesses = await onboardingExecutionService.getRunningProcesses();

    res.json({
      success: true,
      message: 'Processos em execução listados com sucesso',
      data: runningProcesses
    });

  } catch (error) {
    console.error('❌ Erro ao listar processos em execução:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao listar processos',
      error: error.message
    });
  }
};

/**
 * Cancelar processo de onboarding em execução
 * @swagger
 * /onboarding-execution/cancel:
 *   post:
 *     summary: Cancelar processo de onboarding em execução
 *     tags: [Onboarding Execution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - systemId
 *             properties:
 *               systemId:
 *                 type: string
 *                 description: ID do sistema
 *               reason:
 *                 type: string
 *                 description: Motivo do cancelamento (opcional)
 *     responses:
 *       200:
 *         description: Processo cancelado com sucesso
 *       404:
 *         description: Processo não encontrado
 */
const cancelRunningProcess = async (req, res) => {
  try {
    logRequest(req, res, () => {}); // Função vazia como next

    const { systemId, reason } = req.body;

    if (!systemId) {
      return res.status(400).json({
        success: false,
        message: 'ID do sistema é obrigatório'
      });
    }

    console.log(`🛑 Cancelando processo de onboarding para sistema ${systemId}`);

    const result = await onboardingExecutionService.cancelRunningProcess(systemId, reason);

    res.json({
      success: true,
      message: 'Processo cancelado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao cancelar processo:', error);

    let statusCode = 500;
    if (error.message.includes('não encontrado')) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      message: 'Erro ao cancelar processo',
      error: error.message
    });
  }
};

/**
 * Testar conectividade SSH
 * @swagger
 * /onboarding-execution/test-connection:
 *   post:
 *     summary: Testar conectividade SSH
 *     tags: [Onboarding Execution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - host
 *               - credentials
 *             properties:
 *               host:
 *                 type: string
 *                 description: IP ou hostname do servidor
 *               port:
 *                 type: integer
 *                 description: Porta SSH (padrão 22)
 *                 default: 22
 *               credentials:
 *                 type: object
 *                 description: Credenciais SSH
 *     responses:
 *       200:
 *         description: Teste de conectividade realizado
 */
const testSSHConnection = async (req, res) => {
  try {
    logRequest(req, res, () => {}); // Função vazia como next

    const { host, port = 22, credentials } = req.body;

    // Validação mais robusta
    if (!host) {
      return res.status(400).json({
        success: false,
        message: 'Host é obrigatório',
        error: 'MISSING_HOST'
      });
    }

    if (!credentials) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais são obrigatórias',
        error: 'MISSING_CREDENTIALS'
      });
    }

    if (!credentials.username) {
      return res.status(400).json({
        success: false,
        message: 'Username é obrigatório',
        error: 'MISSING_USERNAME'
      });
    }

    if (!credentials.password && !credentials.privateKey && !credentials.privateKeyPath) {
      return res.status(400).json({
        success: false,
        message: 'Senha ou chave privada é obrigatória',
        error: 'MISSING_AUTH'
      });
    }

    console.log(`🔍 Testando conectividade SSH para ${host}:${port} com usuário ${credentials.username}`);

    let connectionId = null;
    const startTime = Date.now();

    try {
      // Validar se sshService está disponível
      if (!sshService || typeof sshService.createConnection !== 'function') {
        throw new Error('SSHService não está disponível ou não foi inicializado corretamente');
      }

      // Configuração de conexão com timeout mais baixo para teste
      const connectionConfig = {
        host,
        port: parseInt(port),
        username: credentials.username,
        timeout: 10000 // 10 segundos para teste rápido
      };

      // Adicionar autenticação
      if (credentials.password) {
        connectionConfig.password = credentials.password;
      }
      if (credentials.privateKey) {
        connectionConfig.privateKey = credentials.privateKey;
      }
      if (credentials.privateKeyPath) {
        connectionConfig.privateKeyPath = credentials.privateKeyPath;
      }

      console.log(`🔗 Tentando conectar SSH com config:`, {
        host: connectionConfig.host,
        port: connectionConfig.port,
        username: connectionConfig.username,
        hasPassword: !!connectionConfig.password,
        hasPrivateKey: !!connectionConfig.privateKey,
        hasPrivateKeyPath: !!connectionConfig.privateKeyPath,
        timeout: connectionConfig.timeout
      });

      // Tentar conectar
      const connection = await sshService.createConnection(connectionConfig);
      connectionId = connection.connectionId;
      
      console.log(`✅ Conexão SSH estabelecida: ${connectionId}`);
      
      // Testar comando básico
      console.log(`🧪 Executando comando de teste...`);
      const testResult = await sshService.executeCommand(connectionId, 'echo "SSH test successful"', {
        timeout: 5000
      });

      const connectionTime = Date.now() - startTime;

      // Fechar conexão
      await sshService.closeConnection(connectionId);
      console.log(`🔒 Conexão SSH fechada`);

      console.log(`✅ Teste SSH bem-sucedido para ${host}:${port} (${connectionTime}ms)`);

      res.json({
        success: true,
        message: 'Conectividade SSH testada com sucesso',
        data: {
          host,
          port,
          connectionTime,
          testCommand: {
            success: true,
            output: testResult.stdout || testResult.output,
            error: testResult.stderr || testResult.error || ''
          },
          connectivity: {
            status: 'success',
            responseTime: connectionTime,
            testedAt: new Date().toISOString()
          }
        }
      });

    } catch (connectionError) {
      const connectionTime = Date.now() - startTime;
      
      // Tentar fechar conexão se foi criada
      if (connectionId) {
        try {
          await sshService.closeConnection(connectionId);
        } catch (closeError) {
          console.warn(`⚠️ Erro ao fechar conexão ${connectionId}:`, closeError.message);
        }
      }
      
      console.warn(`⚠️ Teste SSH falhou para ${host}:${port}: ${connectionError.message}`);

      // Determinar tipo de erro
      let errorType = 'CONNECTION_FAILED';
      if (connectionError.message.includes('timeout')) {
        errorType = 'TIMEOUT';
      } else if (connectionError.message.includes('refused')) {
        errorType = 'CONNECTION_REFUSED';
      } else if (connectionError.message.includes('authentication')) {
        errorType = 'AUTH_FAILED';
      } else if (connectionError.message.includes('host')) {
        errorType = 'HOST_UNREACHABLE';
      }

      res.json({
        success: false,
        message: 'Falha na conectividade SSH',
        data: {
          host,
          port,
          connectionTime,
          connectivity: {
            status: 'failed',
            error: connectionError.message,
            errorType,
            responseTime: connectionTime,
            testedAt: new Date().toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro interno no teste de conectividade:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Erro interno no teste de conectividade',
      error: {
        message: error.message,
        type: error.constructor.name,
        code: error.code || 'INTERNAL_ERROR'
      }
    });
  }
};

/**
 * Obter configurações de onboarding disponíveis
 * @swagger
 * /onboarding-execution/configs:
 *   get:
 *     summary: Obter configurações de onboarding disponíveis
 *     tags: [Onboarding Execution]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configurações obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     supportedOS:
 *                       type: array
 *                       items:
 *                         type: string
 *                     defaultSteps:
 *                       type: array
 *                       items:
 *                         type: object
 *                     defaultOptions:
 *                       type: object
 *                     sshOptions:
 *                       type: object
 */
const getOnboardingConfigs = async (req, res) => {
  try {
    logRequest(req, res, () => {}); // Função vazia como next

    console.log('⚙️ Obtendo configurações de onboarding');

    const { COMPLETE_ONBOARDING_STEPS, OS_SPECIFIC_ADDITIONAL_STEPS } = require('../configs/onboardingSteps');

    const configs = {
      supportedOS: Object.keys(OS_SPECIFIC_ADDITIONAL_STEPS),
      defaultSteps: COMPLETE_ONBOARDING_STEPS,
      defaultOptions: {
        autoRetry: true,
        maxRetries: 3,
        timeout: 30,
        continueOnFailure: false
      },
      sshOptions: {
        defaultPort: 22,
        supportedAuth: ['password', 'privateKey'],
        defaultTimeout: 30000
      }
    };

    res.json({
      success: true,
      message: 'Configurações obtidas com sucesso',
      data: configs
    });

  } catch (error) {
    console.error('❌ Erro ao obter configurações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao obter configurações',
      error: error.message
    });
  }
};

module.exports = {
  runOnboarding,
  executeStepManually,
  getRunningProcesses,
  cancelRunningProcess,
  testSSHConnection,
  getOnboardingConfigs
}; 