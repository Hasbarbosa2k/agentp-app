const express = require('express');
const router = express.Router();

const {
  runOnboarding,
  executeStepManually,
  getRunningProcesses,
  cancelRunningProcess,
  testSSHConnection,
  getOnboardingConfigs
} = require('../controllers/onboardingExecutionController');

const { authMiddleware: auth } = require('../middleware/auth');
const { validateSSHCredentials, validateStepExecution } = require('../validators/onboardingExecution');

/**
 * @swagger
 * tags:
 *   name: Onboarding Execution
 *   description: Execução de onboarding via SSH
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SSHCredentials:
 *       type: object
 *       required:
 *         - username
 *       properties:
 *         username:
 *           type: string
 *           description: Nome de usuário SSH
 *         password:
 *           type: string
 *           description: Senha SSH (opcional se usar chave privada)
 *         privateKey:
 *           type: string
 *           description: Chave privada SSH em formato string (opcional)
 *         privateKeyPath:
 *           type: string
 *           description: Caminho para arquivo de chave privada (opcional)
 *     OnboardingExecutionOptions:
 *       type: object
 *       properties:
 *         autoRetry:
 *           type: boolean
 *           description: Ativar retry automático em falhas
 *           default: true
 *         maxRetries:
 *           type: integer
 *           description: Número máximo de tentativas por comando
 *           default: 3
 *         timeout:
 *           type: integer
 *           description: Timeout em segundos para comandos
 *           default: 30
 *         continueOnFailure:
 *           type: boolean
 *           description: Continuar execução mesmo com falhas
 *           default: false
 *         connectionTimeout:
 *           type: integer
 *           description: Timeout para estabelecer conexão SSH
 *           default: 30000
 *         retryDelay:
 *           type: integer
 *           description: Delay entre tentativas em milissegundos
 *           default: 2000
 *     OnboardingExecutionResult:
 *       type: object
 *       properties:
 *         onboardingId:
 *           type: string
 *           description: ID do processo de onboarding criado
 *         status:
 *           type: string
 *           enum: [completed, failed, in_progress]
 *           description: Status final do onboarding
 *         progress:
 *           type: number
 *           description: Progresso em percentagem (0-100)
 *         totalSteps:
 *           type: number
 *           description: Total de passos executados
 *         completedSteps:
 *           type: number
 *           description: Passos completados com sucesso
 *         failedSteps:
 *           type: number
 *           description: Passos que falharam
 *         osDetected:
 *           type: string
 *           description: Sistema operativo detectado
 *         executionSummary:
 *           type: object
 *           properties:
 *             duration:
 *               type: number
 *               description: Duração total em milissegundos
 *             successRate:
 *               type: number
 *               description: Taxa de sucesso em percentagem
 *             hasFailures:
 *               type: boolean
 *               description: Se houve falhas na execução
 */

// Executar onboarding completo via SSH
router.post('/run', auth, validateSSHCredentials, runOnboarding);

// Executar passo individual manualmente
router.post('/step', auth, validateStepExecution, executeStepManually);

// Listar processos em execução
router.get('/running', auth, getRunningProcesses);

// Cancelar processo em execução
router.post('/cancel', auth, cancelRunningProcess);

// Testar conectividade SSH
router.post('/test-connection', auth, testSSHConnection);

// Obter configurações disponíveis
router.get('/configs', auth, getOnboardingConfigs);

module.exports = router; 