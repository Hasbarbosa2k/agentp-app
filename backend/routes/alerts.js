const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/auth').authMiddleware;

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Gestão de alertas Prometheus
 */

/**
 * @swagger
 * /api/alerts/all:
 *   get:
 *     summary: Obter todos os alertas agrupados por sistema
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending_approval, active, disabled, error]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, critical]
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de alertas agrupados por sistema
 */
router.get('/all', authMiddleware, alertController.getAllAlertsGrouped);

/**
 * @swagger
 * /api/alerts/firing:
 *   get:
 *     summary: Obter alertas do Prometheus agrupados por sistema
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [firing, pending, all]
 *           default: all
 *         description: Filtrar por estado do alerta
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, warning, info]
 *         description: Filtrar por severidade
 *     responses:
 *       200:
 *         description: Lista de alertas agrupados por sistema
 */
router.get('/firing', authMiddleware, alertController.getFiringAlertsGrouped);

/**
 * @swagger
 * /api/alerts/system/{systemId}:
 *   get:
 *     summary: Listar alertas de um sistema
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending_approval, active, disabled, error]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, critical]
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de alertas
 */
router.get('/system/:systemId', authMiddleware, alertController.getAlertsBySystem);

/**
 * @swagger
 * /api/alerts/system/{systemId}/generate:
 *   post:
 *     summary: Gerar alerta a partir de prompt usando AI
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Descrição do alarme em linguagem natural
 *                 example: "Alertar quando CPU estiver acima de 90% por mais de 5 minutos"
 *     responses:
 *       200:
 *         description: Alerta gerado com sucesso
 */
router.post('/system/:systemId/generate', authMiddleware, alertController.generateAlertFromPrompt);

/**
 * @swagger
 * /api/alerts/system/{systemId}:
 *   post:
 *     summary: Criar alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alertName
 *               - description
 *               - expr
 *               - severity
 *             properties:
 *               alertName:
 *                 type: string
 *               description:
 *                 type: string
 *               expr:
 *                 type: string
 *               forDuration:
 *                 type: string
 *                 default: "5m"
 *               severity:
 *                 type: string
 *                 enum: [info, warning, critical]
 *     responses:
 *       201:
 *         description: Alerta criado
 */
router.post('/system/:systemId', authMiddleware, alertController.createAlert);

/**
 * @swagger
 * /api/alerts/system/{systemId}/metrics:
 *   get:
 *     summary: Obter métricas do Node Exporter
 *     tags: [Alerts]
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
 *         description: Métricas do sistema
 */
router.get('/system/:systemId/metrics', authMiddleware, alertController.getSystemMetrics);

/**
 * @swagger
 * /api/alerts/{alertId}:
 *   get:
 *     summary: Obter detalhes de um alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes do alerta
 */
router.get('/:alertId', authMiddleware, alertController.getAlert);

/**
 * @swagger
 * /api/alerts/{alertId}:
 *   put:
 *     summary: Actualizar alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Alerta actualizado
 */
router.put('/:alertId', authMiddleware, alertController.updateAlert);

/**
 * @swagger
 * /api/alerts/{alertId}:
 *   delete:
 *     summary: Eliminar alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alerta eliminado
 */
router.delete('/:alertId', authMiddleware, alertController.deleteAlert);

/**
 * @swagger
 * /api/alerts/{alertId}/approve:
 *   post:
 *     summary: Aprovar e activar alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alerta aprovado
 */
router.post('/:alertId/approve', authMiddleware, alertController.approveAlert);

/**
 * @swagger
 * /api/alerts/{alertId}/reject:
 *   post:
 *     summary: Rejeitar alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alerta rejeitado
 */
router.post('/:alertId/reject', authMiddleware, alertController.rejectAlert);

/**
 * @swagger
 * /api/alerts/{alertId}/toggle:
 *   post:
 *     summary: Activar ou desactivar alerta
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado alterado
 */
router.post('/:alertId/toggle', authMiddleware, alertController.toggleAlert);

/**
 * @swagger
 * /api/alerts/{alertId}/test:
 *   post:
 *     summary: Testar um alarme - executar query e ver resultado actual
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resultado do teste
 */
router.post('/:alertId/test', authMiddleware, alertController.testAlert);

/**
 * @swagger
 * /api/alerts/query:
 *   post:
 *     summary: Executar query PromQL arbitrária
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expr
 *             properties:
 *               expr:
 *                 type: string
 *                 description: Expressão PromQL
 *     responses:
 *       200:
 *         description: Resultado da query
 */
router.post('/query', authMiddleware, alertController.executeQuery);

/**
 * @swagger
 * /api/alerts/sync:
 *   post:
 *     summary: Sincronizar alertas com Prometheus
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sincronização concluída
 */
router.post('/sync', authMiddleware, alertController.syncWithPrometheus);

/**
 * @swagger
 * /api/alerts/sync-targets:
 *   post:
 *     summary: Sincronizar targets (sistemas) com Prometheus
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Targets sincronizados
 */
router.post('/sync-targets', authMiddleware, alertController.syncTargets);

/**
 * @swagger
 * /api/alerts/prometheus/targets:
 *   get:
 *     summary: Obter estado dos targets do Prometheus
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de targets com estado
 */
router.get('/prometheus/targets', authMiddleware, alertController.getPrometheusTargets);

/**
 * @swagger
 * /api/alerts/prometheus/firing:
 *   get:
 *     summary: Obter todos os alertas que estão a disparar (FIRING)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alertas firing e pending
 */
router.get('/prometheus/firing', authMiddleware, alertController.getFiringAlerts);

/**
 * @swagger
 * /api/alerts/prometheus/firing/{systemId}:
 *   get:
 *     summary: Obter alertas que estão a disparar para um sistema específico
 *     tags: [Alerts]
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
 *         description: Lista de alertas firing e pending para o sistema
 */
router.get('/prometheus/firing/:systemId', authMiddleware, alertController.getFiringAlerts);

/**
 * @swagger
 * /api/alerts/system/{systemId}/connectivity:
 *   get:
 *     summary: Verificar conectividade com Node Exporter
 *     tags: [Alerts]
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
 *         description: Estado da conectividade
 */
router.get('/system/:systemId/connectivity', authMiddleware, alertController.checkNodeExporterConnectivity);

/**
 * @swagger
 * /api/alerts/system/{systemId}/refresh-exporters:
 *   post:
 *     summary: Verificar e actualizar estado dos exporters do sistema
 *     tags: [Alerts]
 *     description: Faz requests HTTP directamente aos exporters para verificar se estão online e actualiza a base de dados
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
 *         description: Estado dos exporters actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     nodeExporter:
 *                       type: object
 *                       properties:
 *                         installed:
 *                           type: boolean
 *                         status:
 *                           type: string
 *                         port:
 *                           type: number
 *                         version:
 *                           type: string
 *                     processExporter:
 *                       type: object
 *                       properties:
 *                         installed:
 *                           type: boolean
 *                         status:
 *                           type: string
 *                         port:
 *                           type: number
 *                         monitoredProcesses:
 *                           type: array
 *                           items:
 *                             type: string
 */
router.post('/system/:systemId/refresh-exporters', authMiddleware, alertController.refreshExporterStatus);

module.exports = router;

