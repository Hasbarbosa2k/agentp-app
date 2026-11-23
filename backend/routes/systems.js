const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticate: authMiddleware } = require('../middleware/auth');
// const adminMiddleware = require('../middleware/admin'); // Removido - todos os usuários podem gerir sistemas
const {
  validateCreateSystem,
  validateUpdateSystem,
  validateSystemId,
  validateSystemFilters,
  handleValidationErrors
} = require('../validators/system');

/**
 * @swagger
 * tags:
 *   - name: Sistemas
 *     description: Gestão de sistemas/servidores da infraestrutura
 */

/**
 * @swagger
 * /systems:
 *   post:
 *     summary: Criar novo sistema
 *     description: Adiciona um novo sistema/servidor à infraestrutura
 *     tags: [Sistemas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ip
 *               - os
 *               - owner
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Nome do sistema
 *                 example: Production Web Server
 *               ip:
 *                 type: string
 *                 pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
 *                 description: Endereço IP do sistema
 *                 example: 192.168.1.100
 *               status:
 *                 type: string
 *                 enum: [online, offline, maintenance, unknown]
 *                 description: Status atual do sistema
 *                 example: online
 *               os:
 *                 type: string
 *                 maxLength: 100
 *                 description: Sistema operativo
 *                 example: Ubuntu 22.04
 *               owner:
 *                 type: string
 *                 maxLength: 100
 *                 description: Responsável pelo sistema
 *                 example: DevOps Team
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Descrição do sistema
 *                 example: Servidor web principal de produção
 *               environment:
 *                 type: string
 *                 enum: [production, staging, development, testing]
 *                 description: Ambiente do sistema
 *                 example: production
 *               uptime:
 *                 type: string
 *                 maxLength: 50
 *                 description: Tempo de atividade
 *                 example: 45 days
 *               port:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 65535
 *                 description: Porta principal
 *                 example: 80
 *               protocol:
 *                 type: string
 *                 enum: [http, https, ssh, ftp, other]
 *                 description: Protocolo principal
 *                 example: https
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 description: Tags para categorização
 *                 example: [web, production, critical]
 *               monitoringEnabled:
 *                 type: boolean
 *                 description: Se monitorização está ativa
 *                 example: true
 *               alertsEnabled:
 *                 type: boolean
 *                 description: Se alertas estão ativos
 *                 example: true
 *     responses:
 *       201:
 *         description: Sistema criado com sucesso
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
 *                   example: Sistema "Production Web Server" criado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     system:
 *                       $ref: '#/components/schemas/System'
 *       400:
 *         description: Dados inválidos ou IP já em uso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authMiddleware, validateCreateSystem, handleValidationErrors, systemController.createSystem);

/**
 * @swagger
 * /systems:
 *   get:
 *     summary: Listar sistemas
 *     description: Obtém lista paginada de sistemas com filtros
 *     tags: [Sistemas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Sistemas por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [online, offline, maintenance, unknown]
 *         description: Filtrar por status
 *       - in: query
 *         name: environment
 *         schema:
 *           type: string
 *           enum: [production, staging, development, testing]
 *         description: Filtrar por ambiente
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         description: Filtrar por responsável
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Pesquisar em nome, IP, descrição ou OS
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, ip, status, environment, owner, createdAt, updatedAt, lastTest]
 *           default: createdAt
 *         description: Campo para ordenação
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordem da ordenação
 *     responses:
 *       200:
 *         description: Lista de sistemas obtida com sucesso
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
 *                   example: Lista de sistemas obtida com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     systems:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/System'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     filters:
 *                       type: object
 *                       description: Filtros aplicados
 */
router.get('/', authMiddleware, validateSystemFilters, handleValidationErrors, systemController.getAllSystems);

/**
 * @swagger
 * /systems/stats:
 *   get:
 *     summary: Estatísticas dos sistemas
 *     description: Obtém estatísticas gerais dos sistemas
 *     tags: [Sistemas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
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
 *                   example: Estatísticas dos sistemas obtidas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalSystems:
 *                           type: integer
 *                           description: Total de sistemas
 *                         onlineSystems:
 *                           type: integer
 *                           description: Sistemas online
 *                         offlineSystems:
 *                           type: integer
 *                           description: Sistemas offline
 *                         maintenanceSystems:
 *                           type: integer
 *                           description: Sistemas em manutenção
 *                         unknownSystems:
 *                           type: integer
 *                           description: Sistemas com status desconhecido
 *                         uptimePercentage:
 *                           type: string
 *                           description: Percentagem de uptime
 *                           example: 85.5%
 *                     environmentDistribution:
 *                       type: array
 *                       description: Distribuição por ambiente
 *                     topOwners:
 *                       type: array
 *                       description: Top responsáveis
 *                     recentSystems:
 *                       type: array
 *                       description: Sistemas criados recentemente
 */
router.get('/stats', authMiddleware, systemController.getSystemStats);

/**
 * @swagger
 * /systems/{systemId}/ai-profile:
 *   get:
 *     summary: Obter perfil analisado pela AI
 *     description: Obtém o perfil do sistema analisado pela AI após onboarding completo
 *     tags: [Sistemas]
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
 *         description: Perfil AI obtido com sucesso
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
 *                     systemId:
 *                       type: string
 *                     systemName:
 *                       type: string
 *                     profile:
 *                       type: object
 *                       properties:
 *                         topProcesses:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               cpuUsage:
 *                                 type: string
 *                         activeServices:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                         openPorts:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               port:
 *                                 type: string
 *                               protocol:
 *                                 type: string
 *                         systemInfo:
 *                           type: object
 *                           properties:
 *                             kernel:
 *                               type: string
 *                             architecture:
 *                               type: string
 *                             loadAverage:
 *                               type: string
 *                             loggedUsers:
 *                               type: string
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         lastAnalyzedAt:
 *                           type: string
 *                           format: date-time
 *                         aiModel:
 *                           type: string
 *                         tokensUsed:
 *                           type: number
 *       400:
 *         description: Perfil AI não disponível
 *       404:
 *         description: Sistema não encontrado
 */
router.get('/:systemId/ai-profile', authMiddleware, systemController.getSystemAIProfile);

/**
 * @swagger
 * /systems/{systemId}:
 *   get:
 *     summary: Obter sistema específico
 *     description: Obtém detalhes completos de um sistema
 *     tags: [Sistemas]
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
 *         description: Detalhes do sistema obtidos com sucesso
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
 *                   example: Detalhes do sistema obtidos com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     system:
 *                       $ref: '#/components/schemas/System'
 *       404:
 *         description: Sistema não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:systemId', authMiddleware, validateSystemId, handleValidationErrors, systemController.getSystemById);

/**
 * @swagger
 * /systems/{systemId}:
 *   put:
 *     summary: Atualizar sistema
 *     description: Atualiza dados de um sistema existente
 *     tags: [Sistemas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: Production Web Server Updated
 *               ip:
 *                 type: string
 *                 pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
 *                 example: 192.168.1.101
 *               status:
 *                 type: string
 *                 enum: [online, offline, maintenance, unknown]
 *                 example: maintenance
 *               os:
 *                 type: string
 *                 maxLength: 100
 *                 example: Ubuntu 22.04 LTS
 *               owner:
 *                 type: string
 *                 maxLength: 100
 *                 example: Infrastructure Team
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Servidor web principal atualizado
 *               environment:
 *                 type: string
 *                 enum: [production, staging, development, testing]
 *                 example: production
 *               uptime:
 *                 type: string
 *                 maxLength: 50
 *                 example: 50 days
 *               port:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 65535
 *                 example: 443
 *               protocol:
 *                 type: string
 *                 enum: [http, https, ssh, ftp, other]
 *                 example: https
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [web, production, updated]
 *               monitoringEnabled:
 *                 type: boolean
 *                 example: true
 *               alertsEnabled:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Sistema atualizado com sucesso
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
 *                   example: Sistema "Production Web Server" atualizado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     system:
 *                       $ref: '#/components/schemas/System'
 *       400:
 *         description: Dados inválidos ou IP já em uso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Sistema não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:systemId', authMiddleware, validateSystemId, validateUpdateSystem, handleValidationErrors, systemController.updateSystem);

/**
 * @swagger
 * /systems/{systemId}/test:
 *   post:
 *     summary: Testar conectividade do sistema
 *     description: Executa teste de conectividade no sistema
 *     tags: [Sistemas]
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
 *         description: Teste concluído
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
 *                   example: Teste do sistema "Production Web Server" concluído
 *                 data:
 *                   type: object
 *                   properties:
 *                     system:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         ip:
 *                           type: string
 *                         status:
 *                           type: string
 *                     testResult:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         responseTime:
 *                           type: string
 *                           example: 150ms
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         message:
 *                           type: string
 *                           example: Sistema respondeu com sucesso
 *       404:
 *         description: Sistema não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:systemId/test', authMiddleware, validateSystemId, handleValidationErrors, systemController.testSystem);

/**
 * @swagger
 * /systems/{systemId}:
 *   delete:
 *     summary: Remover sistema
 *     description: Remove um sistema da infraestrutura (soft delete)
 *     tags: [Sistemas]
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
 *         description: Sistema removido com sucesso
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
 *                   example: Sistema "Production Web Server" removido com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     systemId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     ip:
 *                       type: string
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *                     deletedBy:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *       404:
 *         description: Sistema não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:systemId', authMiddleware, validateSystemId, handleValidationErrors, systemController.deleteSystem);

/**
 * @swagger
 * /systems/{id}/basic:
 *   get:
 *     summary: Obter informações básicas do sistema
 *     description: Retorna apenas campos essenciais incluindo o slug
 *     tags: [Sistemas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do sistema
 *     responses:
 *       200:
 *         description: Informações básicas obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     system:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         slug:
 *                           type: string
 *                         ip:
 *                           type: string
 *                         status:
 *                           type: string
 *                         environment:
 *                           type: string
 *                         owner:
 *                           type: string
 *                         description:
 *                           type: string
 *       404:
 *         description: Sistema não encontrado
 */
router.get('/:id/basic', authMiddleware, validateSystemId, handleValidationErrors, systemController.getSystemBasicInfo);

/**
 * @swagger
 * /systems/{id}/slug:
 *   get:
 *     summary: Obter slug do sistema
 *     description: Converte ID do sistema em slug para uso na API de ficheiros
 *     tags: [Sistemas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do sistema
 *     responses:
 *       200:
 *         description: Slug obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     systemId:
 *                       type: string
 *                     slug:
 *                       type: string
 *                       example: servidor-web-principal
 *                     name:
 *                       type: string
 *                     fileApiBasePath:
 *                       type: string
 *                       example: /api/files/servidor-web-principal
 *       404:
 *         description: Sistema não encontrado
 */
router.get('/:id/slug', authMiddleware, validateSystemId, handleValidationErrors, systemController.getSystemSlug);

/**
 * @swagger
 * /systems/by-slug/{slug}:
 *   get:
 *     summary: Buscar sistema por slug
 *     description: Obtém sistema usando o slug como identificador
 *     tags: [Sistemas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
 *     responses:
 *       200:
 *         description: Sistema encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     system:
 *                       $ref: '#/components/schemas/System'
 *       404:
 *         description: Sistema não encontrado
 */
router.get('/by-slug/:slug', authMiddleware, systemController.getSystemBySlug);

/**
 * @swagger
 * /api/systems/{id}/reparse-profile:
 *   post:
 *     summary: Re-parsear perfil do sistema
 *     description: Re-extrai dados estruturados do último onboarding e atualiza o perfil do sistema
 *     tags: [Sistemas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do sistema
 *     responses:
 *       200:
 *         description: Perfil reparsado com sucesso
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
 *                     systemId:
 *                       type: string
 *                     systemName:
 *                       type: string
 *                     profile:
 *                       type: object
 *                     stepsUsed:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Nenhum onboarding encontrado
 *       404:
 *         description: Sistema não encontrado
 */
router.post('/:id/reparse-profile', authMiddleware, systemController.reparseSystemProfile);

module.exports = router; 