const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate: authMiddleware } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  validateBlockUser,
  validateUserId,
  validateChangeRole,
  validateUserFilters,
  validateCreateUser,
  validateUpdateUser,
  validateChangeUserPassword,
  handleValidationErrors
} = require('../validators/admin');

/**
 * @swagger
 * tags:
 *   - name: Administração
 *     description: Endpoints exclusivos para administradores
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Listar todos os utilizadores
 *     description: Obtém lista paginada de utilizadores com filtros (apenas admin)
 *     tags: [Administração]
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
 *         description: Utilizadores por página
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filtrar por role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrar utilizadores ativos
 *       - in: query
 *         name: isBlocked
 *         schema:
 *           type: boolean
 *         description: Filtrar utilizadores bloqueados
 *     responses:
 *       200:
 *         description: Lista de utilizadores obtida com sucesso
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
 *                   example: Lista de utilizadores obtida com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                             enum: [user, admin]
 *                           isActive:
 *                             type: boolean
 *                           isBlocked:
 *                             type: boolean
 *                           blockedAt:
 *                             type: string
 *                             format: date-time
 *                           blockReason:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalUsers:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       403:
 *         description: Acesso negado - apenas admins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /users - Permitir que todos os utilizadores autenticados vejam a lista (apenas visualização)
router.get('/users', authMiddleware, validateUserFilters, handleValidationErrors, adminController.getAllUsers);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Obter detalhes de utilizador
 *     description: Obtém informações detalhadas de um utilizador específico (apenas admin)
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do utilizador
 *     responses:
 *       200:
 *         description: Detalhes do utilizador obtidos com sucesso
 *       404:
 *         description: Utilizador não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.get('/users/:userId', authMiddleware, adminMiddleware, validateUserId, handleValidationErrors, adminController.getUserById);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Criar novo utilizador
 *     description: Cria um novo utilizador no sistema (apenas admin)
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: novo@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               displayName:
 *                 type: string
 *                 maxLength: 100
 *                 example: Novo Utilizador
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: novo_user
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *               team:
 *                 type: string
 *                 maxLength: 50
 *                 example: dev-team
 *     responses:
 *       201:
 *         description: Utilizador criado com sucesso
 *       400:
 *         description: Dados inválidos ou utilizador já existe
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.post('/users', authMiddleware, adminMiddleware, validateCreateUser, handleValidationErrors, adminController.createUser);

/**
 * @swagger
 * /admin/users/{userId}:
 *   put:
 *     summary: Atualizar utilizador
 *     description: Atualiza informações de um utilizador (apenas admin)
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do utilizador
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               displayName:
 *                 type: string
 *                 maxLength: 100
 *               team:
 *                 type: string
 *                 maxLength: 50
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Utilizador atualizado com sucesso
 *       400:
 *         description: Dados inválidos ou não pode alterar próprio role
 *       404:
 *         description: Utilizador não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.put('/users/:userId', authMiddleware, adminMiddleware, validateUpdateUser, handleValidationErrors, adminController.updateUser);

/**
 * @swagger
 * /admin/users/{userId}:
 *   delete:
 *     summary: Eliminar utilizador
 *     description: Elimina permanentemente um utilizador do sistema (apenas admin)
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do utilizador a eliminar
 *     responses:
 *       200:
 *         description: Utilizador eliminado com sucesso
 *       400:
 *         description: Não pode eliminar a si próprio ou outro admin
 *       404:
 *         description: Utilizador não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.delete('/users/:userId', authMiddleware, adminMiddleware, validateUserId, handleValidationErrors, adminController.deleteUser);

/**
 * @swagger
 * /admin/users/{userId}/password:
 *   put:
 *     summary: Alterar password de utilizador
 *     description: Altera a password de um utilizador (apenas admin)
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do utilizador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password alterada com sucesso
 *       400:
 *         description: Password inválida ou utilizador não encontrado
 *       404:
 *         description: Utilizador não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.put('/users/:userId/password', authMiddleware, adminMiddleware, validateChangeUserPassword, handleValidationErrors, adminController.changeUserPassword);

/**
 * @swagger
 * /admin/users/{userId}/block:
 *   post:
 *     summary: Bloquear utilizador
 *     description: Bloqueia um utilizador e invalida todos os seus tokens (apenas admin)
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do utilizador a bloquear
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: Motivo do bloqueio (opcional)
 *                 example: Violação dos termos de serviço
 *     responses:
 *       200:
 *         description: Utilizador bloqueado com sucesso
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
 *                   example: Utilizador joao123 bloqueado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         isBlocked:
 *                           type: boolean
 *                           example: true
 *                         blockedAt:
 *                           type: string
 *                           format: date-time
 *                         blockReason:
 *                           type: string
 *       400:
 *         description: Utilizador já bloqueado ou não pode bloquear a si próprio
 *       403:
 *         description: Não pode bloquear outro admin
 *       404:
 *         description: Utilizador não encontrado
 */
router.post('/users/:userId/block', authMiddleware, adminMiddleware, validateBlockUser, handleValidationErrors, adminController.blockUser);

/**
 * @swagger
 * /admin/users/{userId}/unblock:
 *   post:
 *     summary: Desbloquear utilizador
 *     description: Remove bloqueio de um utilizador (apenas admin)
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do utilizador a desbloquear
 *     responses:
 *       200:
 *         description: Utilizador desbloqueado com sucesso
 *       400:
 *         description: Utilizador não está bloqueado
 *       404:
 *         description: Utilizador não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.post('/users/:userId/unblock', authMiddleware, adminMiddleware, validateUserId, handleValidationErrors, adminController.unblockUser);

/**
 * @swagger
 * /admin/users/{userId}/promote:
 *   post:
 *     summary: Promover utilizador a admin
 *     description: Promove um utilizador normal a administrador (apenas admin)
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do utilizador a promover
 *     responses:
 *       200:
 *         description: Utilizador promovido a administrador
 *       400:
 *         description: Utilizador já é admin ou está bloqueado
 *       404:
 *         description: Utilizador não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.post('/users/:userId/promote', authMiddleware, adminMiddleware, validateUserId, handleValidationErrors, adminController.promoteToAdmin);

/**
 * @swagger
 * /admin/users/{userId}/demote:
 *   post:
 *     summary: Despromover admin para utilizador
 *     description: Remove permissões de admin de um utilizador (apenas admin)
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do admin a despromover
 *     responses:
 *       200:
 *         description: Utilizador despromovido para utilizador normal
 *       400:
 *         description: Utilizador não é admin ou não pode despromover a si próprio
 *       404:
 *         description: Utilizador não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.post('/users/:userId/demote', authMiddleware, adminMiddleware, validateUserId, handleValidationErrors, adminController.demoteFromAdmin);

/**
 * @swagger
 * /admin/users/{userId}/role:
 *   patch:
 *     summary: Alterar role de utilizador
 *     description: Altera o role de qualquer utilizador (user ↔ admin) - apenas admins
 *     tags: [Administração]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do utilizador a alterar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: Novo role para o utilizador
 *                 example: admin
 *               reason:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: Motivo da alteração (opcional)
 *                 example: Promoção por bom desempenho
 *     responses:
 *       200:
 *         description: Role alterado com sucesso
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
 *                   example: Role do utilizador joao123 alterado de "user" para "admin"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         oldRole:
 *                           type: string
 *                           enum: [user, admin]
 *                         newRole:
 *                           type: string
 *                           enum: [user, admin]
 *                         reason:
 *                           type: string
 *                           nullable: true
 *                         changedBy:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             username:
 *                               type: string
 *                         changedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Utilizador já tem o role solicitado, bloqueado, ou tentativa de alterar próprio role
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
 *       403:
 *         description: Acesso negado - apenas admins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/users/:userId/role', authMiddleware, adminMiddleware, validateChangeRole, handleValidationErrors, adminController.changeUserRole);

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Estatísticas da plataforma
 *     description: Obtém estatísticas gerais da plataforma (apenas admin)
 *     tags: [Administração]
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
 *                   example: Estatísticas obtidas com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: Total de utilizadores registados
 *                     activeUsers:
 *                       type: integer
 *                       description: Utilizadores ativos e não bloqueados
 *                     blockedUsers:
 *                       type: integer
 *                       description: Utilizadores bloqueados
 *                     adminUsers:
 *                       type: integer
 *                       description: Número de administradores
 *                     inactiveUsers:
 *                       type: integer
 *                       description: Utilizadores inativos
 *                     newUsersLastMonth:
 *                       type: integer
 *                       description: Novos utilizadores nos últimos 30 dias
 *                     userGrowthRate:
 *                       type: string
 *                       description: Taxa de crescimento percentual
 *                       example: 15.5%
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.get('/stats', authMiddleware, adminMiddleware, adminController.getStats);

module.exports = router; 