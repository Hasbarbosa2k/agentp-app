const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  generateDocumentation, 
  previewDocumentation,
  listReports,
  getReport,
  downloadReport,
  getSystemTestRuns
} = require('../controllers/documentationController');

/**
 * @swagger
 * /api/documentation/generate:
 *   post:
 *     summary: Gera relatório de documentação em PDF
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testDescription
 *             properties:
 *               systemId:
 *                 type: string
 *                 description: ID do sistema (opcional se systemName fornecido)
 *               systemName:
 *                 type: string
 *                 description: Nome do sistema (obrigatório se systemId não fornecido)
 *               testDescription:
 *                 type: string
 *                 description: Descrição detalhada dos testes realizados (prompt)
 *               testRunId:
 *                 type: string
 *                 description: ID do test run para incluir resultados
 *               includeSystemInfo:
 *                 type: boolean
 *                 default: true
 *                 description: Incluir informações do sistema no relatório
 *               additionalContext:
 *                 type: string
 *                 description: Contexto adicional para o relatório
 *     responses:
 *       200:
 *         description: PDF gerado com sucesso
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao gerar relatório
 */
router.post('/generate', authenticate, generateDocumentation);

/**
 * @swagger
 * /api/documentation/preview:
 *   post:
 *     summary: Preview do relatório em HTML (sem conversão para PDF)
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testDescription
 *             properties:
 *               systemId:
 *                 type: string
 *               systemName:
 *                 type: string
 *               testDescription:
 *                 type: string
 *               testRunId:
 *                 type: string
 *               includeSystemInfo:
 *                 type: boolean
 *                 default: true
 *               additionalContext:
 *                 type: string
 *     responses:
 *       200:
 *         description: HTML gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 title:
 *                   type: string
 *                 metadata:
 *                   type: object
 *                 html:
 *                   type: string
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao gerar preview
 */
router.post('/preview', authenticate, previewDocumentation);

/**
 * @swagger
 * /api/documentation/reports:
 *   get:
 *     summary: Lista todos os relatórios gerados
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: systemId
 *         schema:
 *           type: string
 *         description: Filtrar por sistema
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de relatórios
 */
router.get('/reports', authenticate, listReports);

/**
 * @swagger
 * /api/documentation/reports/{reportId}:
 *   get:
 *     summary: Obtém um relatório específico
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relatório encontrado
 *       404:
 *         description: Relatório não encontrado
 */
router.get('/reports/:reportId', authenticate, getReport);

/**
 * @swagger
 * /api/documentation/reports/{reportId}/download:
 *   get:
 *     summary: Download de um relatório em PDF
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF do relatório
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/reports/:reportId/download', authenticate, downloadReport);

/**
 * @swagger
 * /api/documentation/systems/{systemId}/test-runs:
 *   get:
 *     summary: Busca testes executados de um sistema
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de testes executados
 */
router.get('/systems/:systemId/test-runs', authenticate, getSystemTestRuns);

module.exports = router;
