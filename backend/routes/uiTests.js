const express = require('express');
const router = express.Router();
const { authenticate: authMiddleware } = require('../middleware/auth');
const { createUiTest, finalizeAndRun, listUiTests, getUiTestById, deleteUiTest, runExistingTest } = require('../controllers/uiTestsController');
const { streamUiTestUpdates } = require('../controllers/uiTestsRealtimeController');
const { startSshSession, executeStep, executeCustomCommand, endSshSession, cancelRun, getRunStatus, listRuns } = require('../controllers/systemTestExecutorController');
const { validateCreateUiTest, validateFinalizeAndRun, handleValidationErrors } = require('../validators/uiTests');

/**
 * @swagger
 * tags:
 *   - name: UI Tests
 *     description: Gestão de testes de UI
 */

/**
 * @swagger
 * /ui-tests:
 *   get:
 *     summary: Listar UI Tests com filtros
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: systemSlug
 *         schema:
 *           type: string
 *       - in: query
 *         name: finalized
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de UI Tests
 */
router.get('/', authMiddleware, listUiTests);

/**
 * @swagger
 * /ui-tests:
 *   post:
 *     summary: Criar um novo teste de UI
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [systemSlug, url, description]
 *             properties:
 *               systemSlug:
 *                 type: string
 *               url:
 *                 type: string
 *               description:
 *                 type: string
 *               extraDescription:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teste UI criado
 *       400:
 *         description: Dados inválidos
 */
router.post('/', authMiddleware, validateCreateUiTest, handleValidationErrors, createUiTest);

/**
 * @swagger
 * /ui-tests/finalize-and-run:
 *   post:
 *     summary: Guardar o teste final e executar no agente de UI
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, objective, url, systemSlug, steps]
 *             properties:
 *               title: { type: string }
 *               objective: { type: string }
 *               url: { type: string }
 *               systemSlug: { type: string }
 *               steps: { type: array, items: { type: string } }
 *               acceptanceCriteria: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Teste guardado e execução criada
 */
router.post('/finalize-and-run', authMiddleware, validateFinalizeAndRun, handleValidationErrors, finalizeAndRun);

/**
 * @swagger
 * /ui-tests/runs/{runId}/status:
 *   get:
 *     summary: Obter status de uma execução com resultados dos steps
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status da execução
 *       404:
 *         description: Execução não encontrada
 */
router.get('/runs/:runId/status', authMiddleware, getRunStatus);

/**
 * @swagger
 * /ui-tests/runs/{runId}/execute-step:
 *   post:
 *     summary: Executar o próximo comando SSH
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stepIndex:
 *                 type: integer
 *                 description: Índice específico do step (opcional)
 *     responses:
 *       200:
 *         description: Comando executado
 *       400:
 *         description: Sessão expirada ou step inválido
 */
router.post('/runs/:runId/execute-step', authMiddleware, executeStep);

/**
 * @swagger
 * /ui-tests/runs/{runId}/execute-command:
 *   post:
 *     summary: Executar um comando customizado (editado)
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [command]
 *             properties:
 *               command:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comando executado
 *       400:
 *         description: Sessão expirada ou comando inválido
 */
router.post('/runs/:runId/execute-command', authMiddleware, executeCustomCommand);

/**
 * @swagger
 * /ui-tests/runs/{runId}/end-session:
 *   post:
 *     summary: Terminar sessão SSH
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sessão terminada
 */
router.post('/runs/:runId/end-session', authMiddleware, endSshSession);

/**
 * @swagger
 * /ui-tests/runs/{runId}/cancel:
 *   post:
 *     summary: Cancelar uma execução em curso
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Execution cancelled
 *       400:
 *         description: Execution is not running
 */
router.post('/runs/:runId/cancel', authMiddleware, cancelRun);

/**
 * @swagger
 * /ui-tests/runs:
 *   get:
 *     summary: Listar histórico de execuções
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: systemSlug
 *         schema:
 *           type: string
 *       - in: query
 *         name: uiTestId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Lista de execuções
 */
router.get('/runs', authMiddleware, listRuns);

/**
 * @swagger
 * /ui-tests/{uiTestId}:
 *   get:
 *     summary: Obter detalhes de um UI Test
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uiTestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes do UI Test
 *       404:
 *         description: UI Test não encontrado
 */
router.get('/:uiTestId', authMiddleware, getUiTestById);

/**
 * @swagger
 * /ui-tests/{uiTestId}:
 *   delete:
 *     summary: Apagar um UI Test
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uiTestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: UI Test apagado
 *       404:
 *         description: UI Test não encontrado
 */
router.delete('/:uiTestId', authMiddleware, deleteUiTest);

/**
 * @swagger
 * /ui-tests/{uiTestId}/run:
 *   post:
 *     summary: Executar um UI Test existente
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uiTestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teste executado
 *       404:
 *         description: UI Test não encontrado
 */
router.post('/:uiTestId/run', authMiddleware, runExistingTest);

/**
 * @swagger
 * /ui-tests/{uiTestId}/start-ssh:
 *   post:
 *     summary: Iniciar sessão SSH para teste de sistema
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uiTestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credentials]
 *             properties:
 *               credentials:
 *                 type: object
 *                 required: [username]
 *                 properties:
 *                   username: { type: string }
 *                   password: { type: string }
 *                   privateKey: { type: string }
 *     responses:
 *       200:
 *         description: Sessão SSH iniciada
 *       404:
 *         description: Teste não encontrado
 */
router.post('/:uiTestId/start-ssh', authMiddleware, startSshSession);

/**
 * @swagger
 * /ui-tests/{uiTestId}/stream:
 *   get:
 *     summary: Stream de atualizações do UI Test (SSE)
 *     tags: [UI Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uiTestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stream estabelecido
 */
router.get('/:uiTestId/stream', authMiddleware, streamUiTestUpdates);

module.exports = router;

