const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate: authMiddleware } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  validateDatabaseSettings,
  validateAppearanceSettings,
  validateAdvancedSettings,
  validateSecuritySettings,
  validateImportSettings,
  handleValidationErrors
} = require('../validators/settings');

/**
 * @swagger
 * tags:
 *   - name: Settings
 *     description: Gestão de configurações do sistema
 */

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Obter todas as configurações
 *     description: Retorna todas as configurações do sistema (apenas admin)
 *     tags: [Settings]
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Configurações obtidas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: object
 *                           properties:
 *                             backupFrequency:
 *                               type: string
 *                               enum: [hourly, daily, weekly, monthly]
 *                               example: daily
 *                             autoCleanupOldTests:
 *                               type: boolean
 *                               example: true
 *                             retentionPeriodDays:
 *                               type: integer
 *                               example: 90
 *                         security:
 *                           type: object
 *                           properties:
 *                             sessionTimeoutMinutes:
 *                               type: integer
 *                               example: 1440
 *                             maxLoginAttempts:
 *                               type: integer
 *                               example: 5
 *                             lockoutDurationMinutes:
 *                               type: integer
 *                               example: 15
 *                         system:
 *                           type: object
 *                           properties:
 *                             maintenanceMode:
 *                               type: boolean
 *                               example: false
 *                             maxUsersAllowed:
 *                               type: integer
 *                               example: 1000
 *                             allowUserRegistration:
 *                               type: boolean
 *                               example: true
 *                         monitoring:
 *                           type: object
 *                           properties:
 *                             enabled:
 *                               type: boolean
 *                               example: true
 *                             logLevel:
 *                               type: string
 *                               enum: [error, warn, info, debug]
 *                               example: info
 *                             checkIntervalMinutes:
 *                               type: integer
 *                               example: 5
 *                         version:
 *                           type: string
 *                           example: "1.0.0"
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *       403:
 *         description: Acesso negado - apenas admins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authMiddleware, adminMiddleware, settingsController.getSettings);

/**
 * @swagger
 * /settings/summary:
 *   get:
 *     summary: Resumo das configurações
 *     description: Obtém um resumo das principais configurações do sistema
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumo obtido com sucesso
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
 *                   example: Resumo das configurações obtido com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: object
 *                           properties:
 *                             backupFrequency:
 *                               type: string
 *                               example: daily
 *                             autoCleanup:
 *                               type: boolean
 *                               example: true
 *                             retentionDays:
 *                               type: integer
 *                               example: 90
 *                         security:
 *                           type: object
 *                           properties:
 *                             sessionTimeout:
 *                               type: integer
 *                               example: 1440
 *                             maxLoginAttempts:
 *                               type: integer
 *                               example: 5
 *                         system:
 *                           type: object
 *                           properties:
 *                             maintenanceMode:
 *                               type: boolean
 *                               example: false
 *                             maxUsers:
 *                               type: integer
 *                               example: 1000
 *                         version:
 *                           type: string
 *                           example: "1.0.0"
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 */
router.get('/summary', authMiddleware, settingsController.getSettingsSummary);

/**
 * @swagger
 * /settings/database:
 *   put:
 *     summary: Atualizar configurações de base de dados
 *     description: Atualiza configurações relacionadas com backup e limpeza da base de dados (apenas admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               backupFrequency:
 *                 type: string
 *                 enum: [hourly, daily, weekly, monthly]
 *                 description: Frequência dos backups automáticos
 *                 example: daily
 *               autoCleanupOldTests:
 *                 type: boolean
 *                 description: Ativar limpeza automática de testes antigos
 *                 example: true
 *               retentionPeriodDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 description: Período de retenção em dias
 *                 example: 90
 *           examples:
 *             daily_backup:
 *               summary: Backup diário com limpeza ativa
 *               value:
 *                 backupFrequency: daily
 *                 autoCleanupOldTests: true
 *                 retentionPeriodDays: 90
 *             weekly_backup:
 *               summary: Backup semanal
 *               value:
 *                 backupFrequency: weekly
 *                 autoCleanupOldTests: false
 *                 retentionPeriodDays: 180
 *     responses:
 *       200:
 *         description: Configurações de base de dados atualizadas com sucesso
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
 *                   example: Configurações de base de dados atualizadas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         backupFrequency:
 *                           type: string
 *                         autoCleanupOldTests:
 *                           type: boolean
 *                         retentionPeriodDays:
 *                           type: integer
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acesso negado - apenas admins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/database', authMiddleware, adminMiddleware, validateDatabaseSettings, handleValidationErrors, settingsController.updateDatabaseSettings);

/**
 * @swagger
 * /settings/appearance:
 *   put:
 *     summary: Atualizar configurações de aparência
 *     description: Atualiza configurações globais de tema e aparência (apenas admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               defaultTheme:
 *                 type: string
 *                 enum: [light, dark, auto]
 *                 description: Tema padrão para novos utilizadores
 *                 example: dark
 *               defaultAccentColor:
 *                 type: string
 *                 pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
 *                 description: Cor de destaque padrão
 *                 example: "#3b82f6"
 *               allowUserCustomization:
 *                 type: boolean
 *                 description: Permitir utilizadores personalizar aparência
 *                 example: true
 *           examples:
 *             dark_theme:
 *               summary: Tema escuro padrão
 *               value:
 *                 defaultTheme: dark
 *                 defaultAccentColor: "#3b82f6"
 *                 allowUserCustomization: true
 *             corporate_theme:
 *               summary: Tema corporativo sem personalização
 *               value:
 *                 defaultTheme: light
 *                 defaultAccentColor: "#059669"
 *                 allowUserCustomization: false
 *     responses:
 *       200:
 *         description: Configurações de aparência atualizadas com sucesso
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
 *                   example: Configurações de aparência atualizadas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     appearance:
 *                       type: object
 *       403:
 *         description: Acesso negado - apenas admins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/appearance', authMiddleware, adminMiddleware, validateAppearanceSettings, handleValidationErrors, settingsController.updateAppearanceSettings);

/**
 * @swagger
 * /settings/advanced:
 *   put:
 *     summary: Atualizar configurações avançadas
 *     description: Atualiza configurações avançadas do sistema como logs e modo debug (apenas admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logLevel:
 *                 type: string
 *                 enum: [error, warn, info, debug]
 *                 description: Nível de detalhes dos logs
 *                 example: info
 *               retainLogsDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 description: Dias para manter logs
 *                 example: 30
 *               debugModeGlobal:
 *                 type: boolean
 *                 description: Ativar modo debug globalmente
 *                 example: false
 *               maintenanceMode:
 *                 type: boolean
 *                 description: Ativar modo de manutenção
 *                 example: false
 *               maintenanceMessage:
 *                 type: string
 *                 maxLength: 500
 *                 description: Mensagem exibida durante manutenção
 *                 example: Sistema em manutenção. Voltamos em breve.
 *           examples:
 *             production_config:
 *               summary: Configuração de produção
 *               value:
 *                 logLevel: info
 *                 retainLogsDays: 30
 *                 debugModeGlobal: false
 *                 maintenanceMode: false
 *             debug_config:
 *               summary: Configuração de debug
 *               value:
 *                 logLevel: debug
 *                 retainLogsDays: 7
 *                 debugModeGlobal: true
 *                 maintenanceMode: false
 *             maintenance_mode:
 *               summary: Ativar modo de manutenção
 *               value:
 *                 maintenanceMode: true
 *                 maintenanceMessage: Sistema em manutenção programada. Retorno previsto às 18:00.
 *     responses:
 *       200:
 *         description: Configurações avançadas atualizadas com sucesso
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
 *                   example: Configurações avançadas atualizadas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     monitoring:
 *                       type: object
 *                     system:
 *                       type: object
 *       403:
 *         description: Acesso negado - apenas admins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/advanced', authMiddleware, adminMiddleware, validateAdvancedSettings, handleValidationErrors, settingsController.updateAdvancedSettings);

/**
 * @swagger
 * /settings/security:
 *   put:
 *     summary: Atualizar configurações de segurança
 *     description: Atualiza configurações de segurança como timeout de sessão e tentativas de login (apenas admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionTimeoutMinutes:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 10080
 *                 description: Timeout de sessão em minutos
 *                 example: 1440
 *               maxLoginAttempts:
 *                 type: integer
 *                 minimum: 3
 *                 maximum: 10
 *                 description: Máximo de tentativas de login
 *                 example: 5
 *               lockoutDurationMinutes:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 1440
 *                 description: Duração do bloqueio em minutos
 *                 example: 15
 *               requirePasswordChange:
 *                 type: boolean
 *                 description: Exigir alteração periódica de password
 *                 example: false
 *               passwordChangeDays:
 *                 type: integer
 *                 minimum: 30
 *                 maximum: 365
 *                 description: Dias para forçar alteração de password
 *                 example: 90
 *     responses:
 *       200:
 *         description: Configurações de segurança atualizadas com sucesso
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
 *                   example: Configurações de segurança atualizadas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     security:
 *                       type: object
 *       403:
 *         description: Acesso negado - apenas admins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/security', authMiddleware, adminMiddleware, validateSecuritySettings, handleValidationErrors, settingsController.updateSecuritySettings);

/**
 * @swagger
 * /settings/export:
 *   get:
 *     summary: Exportar configurações
 *     description: Exporta todas as configurações do sistema em formato JSON (apenas admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configurações exportadas com sucesso
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
 *                   example: Configurações exportadas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 *                       description: Configurações completas do sistema
 *                     filename:
 *                       type: string
 *                       example: agentp-settings-2024-01-01.json
 *                       description: Nome sugerido para o ficheiro
 *       403:
 *         description: Acesso negado - apenas admins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/export', authMiddleware, adminMiddleware, settingsController.exportSettings);

/**
 * @swagger
 * /settings/import:
 *   post:
 *     summary: Importar configurações
 *     description: Importa configurações do sistema a partir de dados JSON (apenas admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settingsData
 *             properties:
 *               settingsData:
 *                 type: object
 *                 description: Dados de configuração a importar
 *                 properties:
 *                   database:
 *                     type: object
 *                   security:
 *                     type: object
 *                   system:
 *                     type: object
 *                   monitoring:
 *                     type: object
 *               overwriteExisting:
 *                 type: boolean
 *                 default: false
 *                 description: Se deve sobrescrever configurações existentes completamente
 *           examples:
 *             partial_import:
 *               summary: Importação parcial (merge)
 *               value:
 *                 settingsData:
 *                   database:
 *                     backupFrequency: weekly
 *                     retentionPeriodDays: 180
 *                   security:
 *                     maxLoginAttempts: 3
 *                 overwriteExisting: false
 *             full_import:
 *               summary: Importação completa (substituição)
 *               value:
 *                 settingsData:
 *                   database:
 *                     backupFrequency: daily
 *                     autoCleanupOldTests: true
 *                     retentionPeriodDays: 90
 *                   security:
 *                     sessionTimeoutMinutes: 720
 *                     maxLoginAttempts: 5
 *                 overwriteExisting: true
 *     responses:
 *       200:
 *         description: Configurações importadas com sucesso
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
 *                   example: Configurações importadas com sucesso. 3 secções atualizadas.
 *                 data:
 *                   type: object
 *                   properties:
 *                     importedSections:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["database", "security", "monitoring"]
 *                     settings:
 *                       type: object
 *                       description: Configurações atualizadas
 *       400:
 *         description: Dados de importação inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acesso negado - apenas admins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/import', authMiddleware, adminMiddleware, validateImportSettings, handleValidationErrors, settingsController.importSettings);

module.exports = router; 