const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateCreateUiTestRun, validateRunId, handleValidationErrors } = require('../validators/uiTestRuns');
const { createRun, listRuns, getRunById } = require('../controllers/uiTestRunsController');

/**
 * @swagger
 * tags:
 *   - name: UI Test Runs
 *     description: Execução de testes de UI no agente externo
 */

/**
 * @swagger
 * /ui-tests/run:
 *   post:
 *     summary: Criar e executar um teste de UI através do agente externo
 *     tags: [UI Test Runs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testId, steps]
 *             properties:
 *               testId: { type: string }
 *               steps: { type: array, items: { type: string } }
 *               relatedUiTestId: { type: string }
 *               systemSlug: { type: string }
 *     responses:
 *       201:
 *         description: Execução criada e enviada ao agente
 */
// POST /api/ui-tests/run - Criar execução
router.post('/', authenticate, validateCreateUiTestRun, handleValidationErrors, createRun);

// GET /api/ui-tests/run - Lista execuções
router.get('/', authenticate, listRuns);

// GET /api/ui-tests/run/:runId - Detalhe de execução
router.get('/:runId', authenticate, validateRunId, handleValidationErrors, getRunById);

module.exports = router;

