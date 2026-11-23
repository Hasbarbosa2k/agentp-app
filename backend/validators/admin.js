const { body, param, query, validationResult } = require('express-validator');

// Validador para bloquear utilizador
const validateBlockUser = [
  param('userId')
    .isMongoId()
    .withMessage('ID de utilizador inválido'),
  
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Motivo deve ter entre 3 e 500 caracteres')
];

// Validador para parâmetros de utilizador
const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('ID de utilizador inválido')
];

// Validador para alteração de role
const validateChangeRole = [
  param('userId')
    .isMongoId()
    .withMessage('ID de utilizador inválido'),
  
  body('role')
    .isIn(['user', 'admin'])
    .withMessage('Role deve ser "user" ou "admin"'),
    
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Motivo deve ter entre 3 e 500 caracteres')
];

// Validador para filtros de listagem de utilizadores
const validateUserFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100'),
    
  query('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role deve ser "user" ou "admin"'),
    
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser true ou false'),
    
  query('isBlocked')
    .optional()
    .isBoolean()
    .withMessage('isBlocked deve ser true ou false')
];

// Validador para criar utilizador
const validateCreateUser = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password deve ter pelo menos 6 caracteres'),
    
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome de exibição deve ter entre 1 e 100 caracteres'),
    
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username deve ter entre 3 e 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username só pode conter letras, números e underscore'),
    
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role deve ser "user" ou "admin"'),
    
  body('team')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Team deve ter entre 1 e 50 caracteres')
];

// Validador para atualizar utilizador
const validateUpdateUser = [
  param('userId')
    .isMongoId()
    .withMessage('ID de utilizador inválido'),
    
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
    
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome de exibição deve ter entre 1 e 100 caracteres'),
    
  body('team')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Team deve ter entre 1 e 50 caracteres'),
    
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role deve ser "user" ou "admin"'),
    
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser true ou false')
];

// Validador para alterar password de utilizador
const validateChangeUserPassword = [
  param('userId')
    .isMongoId()
    .withMessage('ID de utilizador inválido'),
    
  body('newPassword')
    .notEmpty()
    .withMessage('Nova password é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Password deve ter pelo menos 6 caracteres')
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
  validateBlockUser,
  validateUserId,
  validateChangeRole,
  validateUserFilters,
  validateCreateUser,
  validateUpdateUser,
  validateChangeUserPassword,
  handleValidationErrors
}; 