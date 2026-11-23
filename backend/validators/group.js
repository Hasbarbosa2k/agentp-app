const { body, param, query, validationResult } = require('express-validator');

// Validador para criar grupo
const validateCreateGroup = [
  body('name')
    .notEmpty()
    .withMessage('Nome do grupo é obrigatório')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome do grupo deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Nome do grupo só pode conter letras, números, espaços, hífens e underscores'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
    
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Cor deve estar no formato hexadecimal (#RRGGBB)')
];

// Validador para atualizar grupo
const validateUpdateGroup = [
  param('groupId')
    .isMongoId()
    .withMessage('ID de grupo inválido'),
    
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome do grupo deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Nome do grupo só pode conter letras, números, espaços, hífens e underscores'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
    
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Cor deve estar no formato hexadecimal (#RRGGBB)'),
    
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser true ou false')
];

// Validador para parâmetros de grupo
const validateGroupId = [
  param('groupId')
    .isMongoId()
    .withMessage('ID de grupo inválido')
];

// Validador para adicionar/remover membros
const validateGroupMembers = [
  param('groupId')
    .isMongoId()
    .withMessage('ID de grupo inválido'),
    
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('Lista de IDs de utilizadores é obrigatória e deve ter pelo menos um elemento')
    .custom((value) => {
      if (!value.every(id => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/))) {
        throw new Error('Todos os IDs devem ser ObjectIds válidos');
      }
      return true;
    })
];

// Validador para filtros de listagem
const validateGroupFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100'),
    
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser true ou false')
];

// Handler para erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

module.exports = {
  validateCreateGroup,
  validateUpdateGroup,
  validateGroupId,
  validateGroupMembers,
  validateGroupFilters,
  handleValidationErrors
};
