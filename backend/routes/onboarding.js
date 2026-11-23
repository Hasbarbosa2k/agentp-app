const express = require('express');
const router = express.Router();

const {
  startOnboarding,
  getOnboardingStatus,
  executeStep,
  cancelOnboarding,
  listOnboardingProcesses,
  getOnboardingDetails
} = require('../controllers/onboardingController');

const { authMiddleware: auth } = require('../middleware/auth');
const { validateOnboardingStart, validateStepExecution } = require('../validators/onboarding');

/**
 * @swagger
 * tags:
 *   name: Onboarding
 *   description: Gerenciamento de processos de onboarding de sistemas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OnboardingProcess:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do processo
 *         systemId:
 *           type: string
 *           description: ID do sistema
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed, failed, cancelled]
 *           description: Status do processo
 *         progress:
 *           type: number
 *           description: Progresso em percentagem (0-100)
 *         totalSteps:
 *           type: number
 *           description: Total de passos
 *         completedSteps:
 *           type: number
 *           description: Passos completados
 *         failedSteps:
 *           type: number
 *           description: Passos falhados
 *         startedAt:
 *           type: string
 *           format: date-time
 *           description: Data de início
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: Data de conclusão
 *         osInfo:
 *           type: object
 *           description: Informações do sistema operacional
 *           properties:
 *             id:
 *               type: string
 *             version:
 *               type: string
 *             name:
 *               type: string
 *             prettyName:
 *               type: string
 *         steps:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               step:
 *                 type: string
 *                 description: Nome do passo
 *               command:
 *                 type: string
 *                 description: Comando a executar
 *               status:
 *                 type: string
 *                 enum: [pending, running, success, failed, skipped]
 *               output:
 *                 type: string
 *                 description: Output do comando
 *               error:
 *                 type: string
 *                 description: Mensagem de erro (se houver)
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *               endedAt:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *                 description: Duração em milissegundos
 *     OnboardingStep:
 *       type: object
 *       properties:
 *         step:
 *           type: string
 *           description: Nome do passo
 *         command:
 *           type: string
 *           description: Comando a executar
 *         description:
 *           type: string
 *           description: Descrição do passo
 */

// Iniciar processo de onboarding
router.post('/start', auth, startOnboarding);

// Listar processos de onboarding (com filtros)
router.get('/', auth, listOnboardingProcesses);

// Obter status de onboarding por sistema
router.get('/system/:systemId', auth, getOnboardingStatus);

// Obter detalhes completos de um processo
router.get('/:onboardingId', auth, getOnboardingDetails);

// DESATIVADO: Execução manual de passos - apenas templates são permitidos
// router.post('/:onboardingId/step/:stepIndex/execute', auth, validateStepExecution, executeStep);

// Cancelar processo de onboarding
router.post('/:onboardingId/cancel', auth, cancelOnboarding);

module.exports = router; 