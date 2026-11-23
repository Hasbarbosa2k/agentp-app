const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware para tratar erros de validação
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Validação para slug do sistema
 */
const validateSystemSlug = [
  param('systemSlug')
    .isLength({ min: 1, max: 50 })
    .withMessage('Slug deve ter entre 1 e 50 caracteres')
    .matches(/^[a-z0-9]+([a-z0-9-]*[a-z0-9]+)*$/)
    .withMessage('Slug deve conter apenas letras minúsculas, números e hífens')
];

/**
 * Validação para nome de ficheiro
 */
const validateFileName = [
  param('fileName')
    .isLength({ min: 1, max: 255 })
    .withMessage('Nome do ficheiro deve ter entre 1 e 255 caracteres')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Nome do ficheiro contém caracteres não permitidos')
    .custom((value) => {
      // Não pode começar com ponto (ficheiros ocultos)
      if (value.startsWith('.')) {
        throw new Error('Nome do ficheiro não pode começar com ponto');
      }
      
      // Deve ter pelo menos uma extensão
      if (!value.includes('.')) {
        throw new Error('Ficheiro deve ter uma extensão');
      }
      
      return true;
    })
];

/**
 * Validação para parâmetros de listagem de ficheiros
 */
const validateFileListParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'size', 'createdAt', 'modifiedAt', 'extension'])
    .withMessage('Campo de ordenação inválido'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ordem deve ser "asc" ou "desc"'),
  
  query('fileType')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tipo de ficheiro inválido'),
  
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Termo de pesquisa deve ter entre 1 e 100 caracteres')
];

/**
 * Validação para upload de ficheiro único
 */
const validateSingleUpload = [
  body('fileName')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Nome personalizado deve ter entre 1 e 255 caracteres')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Nome personalizado contém caracteres não permitidos'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  
  body('overwrite')
    .optional()
    .isBoolean()
    .withMessage('Overwrite deve ser um valor booleano'),
  
  body('addTimestamp')
    .optional()
    .isBoolean()
    .withMessage('AddTimestamp deve ser um valor booleano')
];

/**
 * Validação para upload múltiplo
 */
const validateMultipleUpload = [
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  
  body('overwrite')
    .optional()
    .isBoolean()
    .withMessage('Overwrite deve ser um valor booleano'),
  
  body('allowedTypes')
    .optional()
    .custom((value) => {
      if (value) {
        const types = value.split(',');
        const validTypes = [
          'text/plain',
          'text/csv',
          'application/json',
          'application/xml',
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/zip',
          'application/x-rar-compressed',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        for (const type of types) {
          if (!validTypes.includes(type.trim())) {
            throw new Error(`Tipo MIME não suportado: ${type}`);
          }
        }
      }
      return true;
    })
    .withMessage('Tipos de ficheiro inválidos')
];

/**
 * Validação para atualização de metadados de ficheiro
 */
const validateFileMetadataUpdate = [
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags devem ser um array'),
  
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Cada tag deve ter entre 1 e 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Tags podem conter apenas letras, números, underscore e hífen')
];

/**
 * Validação para operações em lote
 */
const validateBatchOperation = [
  body('files')
    .isArray({ min: 1, max: 50 })
    .withMessage('Deve especificar entre 1 e 50 ficheiros'),
  
  body('files.*')
    .isLength({ min: 1, max: 255 })
    .withMessage('Nome do ficheiro deve ter entre 1 e 255 caracteres')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Nome do ficheiro contém caracteres não permitidos'),
  
  body('operation')
    .isIn(['delete', 'move', 'copy'])
    .withMessage('Operação deve ser: delete, move ou copy'),
  
  body('destination')
    .if(body('operation').isIn(['move', 'copy']))
    .notEmpty()
    .withMessage('Destino é obrigatório para operações move/copy')
    .matches(/^[a-z0-9]+([a-z0-9-]*[a-z0-9]+)*$/)
    .withMessage('Destino deve ser um slug válido')
];

/**
 * Validação para pesquisa de ficheiros
 */
const validateFileSearch = [
  query('q')
    .isLength({ min: 1, max: 100 })
    .withMessage('Termo de pesquisa deve ter entre 1 e 100 caracteres'),
  
  query('type')
    .optional()
    .isIn(['document', 'image', 'archive', 'text', 'spreadsheet', 'other'])
    .withMessage('Tipo de ficheiro inválido'),
  
  query('sizeMin')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Tamanho mínimo deve ser um número positivo'),
  
  query('sizeMax')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Tamanho máximo deve ser um número positivo'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Data inicial deve estar no formato ISO8601'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Data final deve estar no formato ISO8601')
];

module.exports = {
  handleValidationErrors,
  validateSystemSlug,
  validateFileName,
  validateFileListParams,
  validateSingleUpload,
  validateMultipleUpload,
  validateFileMetadataUpdate,
  validateBatchOperation,
  validateFileSearch
};