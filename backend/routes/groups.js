const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticate: authMiddleware } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  validateCreateGroup,
  validateUpdateGroup,
  validateGroupId,
  validateGroupMembers,
  validateGroupFilters,
  handleValidationErrors
} = require('../validators/group');

/**
 * @swagger
 * tags:
 *   - name: Grupos
 *     description: Endpoints para gestão de grupos de utilizadores
 */

/**
 * @swagger
 * /groups:
 *   get:
 *     summary: Listar todos os grupos
 *     description: Obtém lista paginada de grupos (apenas admin)
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de grupos obtida com sucesso
 *       403:
 *         description: Acesso negado - apenas admins
 */
// GET /groups - Permitir que todos os utilizadores autenticados vejam a lista (apenas visualização)
router.get('/', authMiddleware, validateGroupFilters, handleValidationErrors, groupController.getAllGroups);

/**
 * @swagger
 * /groups/{groupId}:
 *   get:
 *     summary: Obter detalhes de grupo
 *     description: Obtém informações detalhadas de um grupo específico (apenas admin)
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes do grupo obtidos com sucesso
 *       404:
 *         description: Grupo não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
// GET /groups/:groupId - Permitir que todos os utilizadores autenticados vejam os detalhes
router.get('/:groupId', authMiddleware, validateGroupId, handleValidationErrors, groupController.getGroupById);

/**
 * @swagger
 * /groups:
 *   post:
 *     summary: Criar novo grupo
 *     description: Cria um novo grupo (apenas admin)
 *     tags: [Grupos]
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *     responses:
 *       201:
 *         description: Grupo criado com sucesso
 *       400:
 *         description: Dados inválidos ou grupo já existe
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.post('/', authMiddleware, adminMiddleware, validateCreateGroup, handleValidationErrors, groupController.createGroup);

/**
 * @swagger
 * /groups/{groupId}:
 *   put:
 *     summary: Atualizar grupo
 *     description: Atualiza informações de um grupo (apenas admin)
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Grupo atualizado com sucesso
 *       404:
 *         description: Grupo não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.put('/:groupId', authMiddleware, adminMiddleware, validateUpdateGroup, handleValidationErrors, groupController.updateGroup);

/**
 * @swagger
 * /groups/{groupId}:
 *   delete:
 *     summary: Eliminar grupo
 *     description: Elimina permanentemente um grupo (apenas admin)
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grupo eliminado com sucesso
 *       404:
 *         description: Grupo não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.delete('/:groupId', authMiddleware, adminMiddleware, validateGroupId, handleValidationErrors, groupController.deleteGroup);

/**
 * @swagger
 * /groups/{groupId}/members:
 *   post:
 *     summary: Adicionar membros ao grupo
 *     description: Adiciona utilizadores a um grupo (apenas admin)
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Membros adicionados com sucesso
 *       404:
 *         description: Grupo não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.post('/:groupId/members', authMiddleware, adminMiddleware, validateGroupMembers, handleValidationErrors, groupController.addMembersToGroup);

/**
 * @swagger
 * /groups/{groupId}/members:
 *   delete:
 *     summary: Remover membros do grupo
 *     description: Remove utilizadores de um grupo (apenas admin)
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Membros removidos com sucesso
 *       404:
 *         description: Grupo não encontrado
 *       403:
 *         description: Acesso negado - apenas admins
 */
router.delete('/:groupId/members', authMiddleware, adminMiddleware, validateGroupMembers, handleValidationErrors, groupController.removeMembersFromGroup);

module.exports = router;
