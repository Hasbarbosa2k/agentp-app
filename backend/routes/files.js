const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authenticate: authMiddleware } = require('../middleware/auth');
const { 
  uploadSingle, 
  uploadMultiple, 
  handleUploadErrors, 
  validateSystemExists 
} = require('../middleware/fileUpload');
const {
  handleValidationErrors,
  validateSystemSlug,
  validateFileName,
  validateFileListParams,
  validateSingleUpload,
  validateMultipleUpload,
  validateBatchOperation
} = require('../validators/files');

/**
 * @swagger
 * tags:
 *   - name: Ficheiros
 *     description: Gestão de ficheiros dos sistemas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FileInfo:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Nome do ficheiro
 *         size:
 *           type: number
 *           description: Tamanho em bytes
 *         mimeType:
 *           type: string
 *           description: Tipo MIME do ficheiro
 *         extension:
 *           type: string
 *           description: Extensão do ficheiro
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         modifiedAt:
 *           type: string
 *           format: date-time
 *           description: Data de modificação
 *         relativePath:
 *           type: string
 *           description: Caminho relativo no sistema
 *     
 *     DirectoryStats:
 *       type: object
 *       properties:
 *         totalFiles:
 *           type: number
 *           description: Total de ficheiros
 *         totalSize:
 *           type: number
 *           description: Tamanho total em bytes
 *         fileTypes:
 *           type: object
 *           description: Contagem por tipo de ficheiro
 *         oldestFile:
 *           $ref: '#/components/schemas/FileInfo'
 *         newestFile:
 *           $ref: '#/components/schemas/FileInfo'
 */

/**
 * @swagger
 * /files/{systemSlug}/upload:
 *   post:
 *     summary: Upload de ficheiro único
 *     description: Carrega um ficheiro para o diretório do sistema especificado
 *     tags: [Ficheiros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Ficheiro a carregar
 *               fileName:
 *                 type: string
 *                 description: Nome personalizado (opcional)
 *               description:
 *                 type: string
 *                 description: Descrição do ficheiro
 *               overwrite:
 *                 type: boolean
 *                 description: Sobrescrever se existir
 *               addTimestamp:
 *                 type: boolean
 *                 description: Adicionar timestamp ao nome
 *             required:
 *               - file
 *     responses:
 *       201:
 *         description: Ficheiro carregado com sucesso
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
 *                     file:
 *                       $ref: '#/components/schemas/FileInfo'
 *       400:
 *         description: Erro na validação ou upload
 *       404:
 *         description: Sistema não encontrado
 */
router.post('/:systemSlug/upload',
  authMiddleware,
  validateSystemSlug,
  handleValidationErrors,
  validateSystemExists,
  validateSingleUpload,
  handleValidationErrors,
  uploadSingle,
  handleUploadErrors,
  fileController.uploadSingleFile
);

/**
 * @swagger
 * /files/{systemSlug}/upload-multiple:
 *   post:
 *     summary: Upload de múltiplos ficheiros
 *     description: Carrega múltiplos ficheiros para o diretório do sistema
 *     tags: [Ficheiros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Ficheiros a carregar
 *               description:
 *                 type: string
 *                 description: Descrição dos ficheiros
 *               allowedTypes:
 *                 type: string
 *                 description: Tipos MIME permitidos (separados por vírgula)
 *               overwrite:
 *                 type: boolean
 *                 description: Sobrescrever se existir
 *             required:
 *               - files
 *     responses:
 *       201:
 *         description: Ficheiros carregados com sucesso
 *       400:
 *         description: Erro na validação ou upload
 */
router.post('/:systemSlug/upload-multiple',
  authMiddleware,
  validateSystemSlug,
  handleValidationErrors,
  validateSystemExists,
  validateMultipleUpload,
  handleValidationErrors,
  uploadMultiple,
  handleUploadErrors,
  fileController.uploadMultipleFiles
);

/**
 * @swagger
 * /files/{systemSlug}:
 *   get:
 *     summary: Listar ficheiros do sistema
 *     description: Obtém lista paginada de ficheiros do sistema com filtros
 *     tags: [Ficheiros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Ficheiros por página
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, size, createdAt, modifiedAt, extension]
 *           default: modifiedAt
 *         description: Campo para ordenação
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordem da ordenação
 *       - in: query
 *         name: fileType
 *         schema:
 *           type: string
 *           enum: [image, document, spreadsheet, archive, text]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Pesquisar por nome
 *     responses:
 *       200:
 *         description: Lista de ficheiros obtida com sucesso
 */
router.get('/:systemSlug',
  authMiddleware,
  validateSystemSlug,
  validateFileListParams,
  handleValidationErrors,
  validateSystemExists,
  fileController.listFiles
);

/**
 * @swagger
 * /files/{systemSlug}/stats:
 *   get:
 *     summary: Estatísticas do diretório
 *     description: Obtém estatísticas dos ficheiros do sistema
 *     tags: [Ficheiros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     systemSlug:
 *                       type: string
 *                     stats:
 *                       $ref: '#/components/schemas/DirectoryStats'
 */
router.get('/:systemSlug/stats',
  authMiddleware,
  validateSystemSlug,
  handleValidationErrors,
  validateSystemExists,
  fileController.getStats
);

/**
 * @swagger
 * /files/{systemSlug}/{fileName}:
 *   get:
 *     summary: Obter informações do ficheiro
 *     description: Obtém detalhes de um ficheiro específico
 *     tags: [Ficheiros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do ficheiro
 *     responses:
 *       200:
 *         description: Informações do ficheiro obtidas
 *       404:
 *         description: Ficheiro não encontrado
 */
router.get('/:systemSlug/:fileName',
  authMiddleware,
  validateSystemSlug,
  validateFileName,
  handleValidationErrors,
  validateSystemExists,
  fileController.getFileDetails
);

/**
 * @swagger
 * /files/{systemSlug}/{fileName}/download:
 *   get:
 *     summary: Download do ficheiro
 *     description: Faz download de um ficheiro específico
 *     tags: [Ficheiros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do ficheiro
 *     responses:
 *       200:
 *         description: Ficheiro enviado
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Ficheiro não encontrado
 */
router.get('/:systemSlug/:fileName/download',
  authMiddleware,
  validateSystemSlug,
  validateFileName,
  handleValidationErrors,
  validateSystemExists,
  fileController.downloadFile
);

/**
 * @swagger
 * /files/{systemSlug}/{fileName}/view:
 *   get:
 *     summary: Visualizar ficheiro
 *     description: Visualiza conteúdo de ficheiros de texto ou imagem
 *     tags: [Ficheiros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do ficheiro
 *     responses:
 *       200:
 *         description: Conteúdo do ficheiro
 *       400:
 *         description: Tipo de ficheiro não suportado
 *       404:
 *         description: Ficheiro não encontrado
 */
router.get('/:systemSlug/:fileName/view',
  authMiddleware,
  validateSystemSlug,
  validateFileName,
  handleValidationErrors,
  validateSystemExists,
  fileController.viewFile
);

/**
 * @swagger
 * /files/{systemSlug}/{fileName}:
 *   delete:
 *     summary: Remover ficheiro
 *     description: Remove um ficheiro específico do sistema
 *     tags: [Ficheiros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do ficheiro
 *     responses:
 *       200:
 *         description: Ficheiro removido com sucesso
 *       404:
 *         description: Ficheiro não encontrado
 */
router.delete('/:systemSlug/:fileName',
  authMiddleware,
  validateSystemSlug,
  validateFileName,
  handleValidationErrors,
  validateSystemExists,
  fileController.deleteFile
);

/**
 * @swagger
 * /files/{systemSlug}/batch-delete:
 *   post:
 *     summary: Remover múltiplos ficheiros
 *     description: Remove múltiplos ficheiros do sistema
 *     tags: [Ficheiros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug do sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de nomes de ficheiros
 *             required:
 *               - files
 *     responses:
 *       200:
 *         description: Operação de remoção concluída
 *       400:
 *         description: Lista de ficheiros inválida
 */
router.post('/:systemSlug/batch-delete',
  authMiddleware,
  validateSystemSlug,
  validateBatchOperation,
  handleValidationErrors,
  validateSystemExists,
  fileController.deleteMultipleFiles
);

module.exports = router;