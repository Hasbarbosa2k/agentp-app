const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate: authMiddleware } = require('../middleware/auth');
const {
  validateUpdateProfile,
  validateUpdatePreferences,
  handleValidationErrors
} = require('../validators/profile');

/**
 * @swagger
 * tags:
 *   - name: Profile
 *     description: Gestão de profile e preferências do utilizador
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Obter profile do utilizador
 *     description: Retorna informações completas do profile do utilizador autenticado
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile obtido com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 60f7b3b3c4e4f82d8c8b4567
 *                         username:
 *                           type: string
 *                           example: johndoe
 *                         email:
 *                           type: string
 *                           example: john@exemplo.com
 *                         displayName:
 *                           type: string
 *                           example: QA Engineer
 *                         team:
 *                           type: string
 *                           example: qa-team
 *                         role:
 *                           type: string
 *                           enum: [user, admin]
 *                           example: user
 *                         lastLoginAt:
 *                           type: string
 *                           format: date-time
 *                           example: 2024-01-01T12:00:00.000Z
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Token de acesso inválido ou em falta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Utilizador não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authMiddleware, profileController.getProfile);

/**
 * @swagger
 * /profile:
 *   put:
 *     summary: Atualizar profile do utilizador
 *     description: Atualiza informações do profile como displayName, email e team
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Nome de exibição do utilizador
 *                 example: Senior QA Engineer
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Novo endereço de email
 *                 example: john.senior@exemplo.com
 *               team:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: Team do utilizador
 *                 example: senior-qa-team
 *           examples:
 *             update_display_name:
 *               summary: Atualizar nome de exibição
 *               value:
 *                 displayName: Senior QA Engineer
 *             update_email:
 *               summary: Atualizar email
 *               value:
 *                 email: john.new@exemplo.com
 *             update_team:
 *               summary: Atualizar team
 *               value:
 *                 team: senior-qa-team
 *             update_all:
 *               summary: Atualizar tudo
 *               value:
 *                 displayName: Senior QA Engineer
 *                 email: john.senior@exemplo.com
 *                 team: senior-qa-team
 *     responses:
 *       200:
 *         description: Profile atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile atualizado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         displayName:
 *                           type: string
 *                         team:
 *                           type: string
 *                         role:
 *                           type: string
 *                         lastLoginAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Dados inválidos ou email já em uso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Este email já está a ser utilizado por outro utilizador
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *                       value:
 *                         type: string
 *       401:
 *         description: Token de acesso inválido ou em falta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/', authMiddleware, validateUpdateProfile, handleValidationErrors, profileController.updateProfile);

/**
 * @swagger
 * /profile/preferences:
 *   get:
 *     summary: Obter preferências do utilizador
 *     description: Retorna todas as preferências de notificações, aparência e configurações avançadas
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferências obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Preferências obtidas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     preferences:
 *                       type: object
 *                       properties:
 *                         notifications:
 *                           type: object
 *                           properties:
 *                             testCompletion:
 *                               type: boolean
 *                               example: true
 *                               description: Notificações de conclusão de testes
 *                             systemAlerts:
 *                               type: boolean
 *                               example: true
 *                               description: Alertas do sistema
 *                             emailReports:
 *                               type: boolean
 *                               example: false
 *                               description: Relatórios por email
 *                         appearance:
 *                           type: object
 *                           properties:
 *                             theme:
 *                               type: string
 *                               enum: [light, dark, auto]
 *                               example: dark
 *                               description: Tema da interface
 *                             accentColor:
 *                               type: string
 *                               example: "#3b82f6"
 *                               description: Cor de destaque
 *                         advanced:
 *                           type: object
 *                           properties:
 *                             debugMode:
 *                               type: boolean
 *                               example: false
 *                               description: Modo de depuração
 *                             detailedLogs:
 *                               type: boolean
 *                               example: false
 *                               description: Logs detalhados
 *       401:
 *         description: Token de acesso inválido ou em falta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/preferences', authMiddleware, profileController.getPreferences);

/**
 * @swagger
 * /profile/preferences:
 *   put:
 *     summary: Atualizar preferências do utilizador
 *     description: Atualiza preferências específicas de notificações, aparência ou configurações avançadas
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notifications:
 *                 type: object
 *                 properties:
 *                   testCompletion:
 *                     type: boolean
 *                     description: Ativar notificações de conclusão de testes
 *                   systemAlerts:
 *                     type: boolean
 *                     description: Ativar alertas do sistema
 *                   emailReports:
 *                     type: boolean
 *                     description: Ativar relatórios por email
 *               appearance:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     enum: [light, dark, auto]
 *                     description: Tema da interface
 *                   accentColor:
 *                     type: string
 *                     pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
 *                     description: Cor de destaque em hexadecimal
 *               advanced:
 *                 type: object
 *                 properties:
 *                   debugMode:
 *                     type: boolean
 *                     description: Ativar modo de depuração
 *                   detailedLogs:
 *                     type: boolean
 *                     description: Ativar logs detalhados
 *           examples:
 *             update_notifications:
 *               summary: Atualizar apenas notificações
 *               value:
 *                 notifications:
 *                   testCompletion: false
 *                   systemAlerts: true
 *                   emailReports: true
 *             update_theme:
 *               summary: Atualizar tema
 *               value:
 *                 appearance:
 *                   theme: light
 *                   accentColor: "#10b981"
 *             update_advanced:
 *               summary: Ativar modo debug
 *               value:
 *                 advanced:
 *                   debugMode: true
 *                   detailedLogs: true
 *             update_all_preferences:
 *               summary: Atualizar todas as preferências
 *               value:
 *                 notifications:
 *                   testCompletion: true
 *                   systemAlerts: false
 *                   emailReports: true
 *                 appearance:
 *                   theme: auto
 *                   accentColor: "#8b5cf6"
 *                 advanced:
 *                   debugMode: false
 *                   detailedLogs: false
 *     responses:
 *       200:
 *         description: Preferências atualizadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Preferências atualizadas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     preferences:
 *                       type: object
 *                       properties:
 *                         notifications:
 *                           type: object
 *                         appearance:
 *                           type: object
 *                         advanced:
 *                           type: object
 *       400:
 *         description: Dados de preferências inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Dados de entrada inválidos
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *                       value:
 *                         type: string
 *       401:
 *         description: Token de acesso inválido ou em falta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/preferences', authMiddleware, validateUpdatePreferences, handleValidationErrors, profileController.updatePreferences);

module.exports = router; 