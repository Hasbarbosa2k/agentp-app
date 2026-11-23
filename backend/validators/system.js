const { body, param, query, validationResult } = require('express-validator');

// Validador para criar sistema
const validateCreateSystem = [
  body('name')
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres')
    .trim(),

  body('ip')
    .notEmpty()
    .withMessage('IP é obrigatório')
    .matches(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
    .withMessage('IP deve estar no formato IPv4 válido (ex: 192.168.1.100)')
    .trim(),

  body('status')
    .optional()
    .isIn(['online', 'offline', 'maintenance', 'unknown'])
    .withMessage('Status deve ser: online, offline, maintenance ou unknown'),

  body('os')
    .notEmpty()
    .withMessage('Sistema operativo é obrigatório')
    .isLength({ max: 100 })
    .withMessage('Sistema operativo deve ter no máximo 100 caracteres')
    .trim(),

  body('owner')
    .notEmpty()
    .withMessage('Proprietário é obrigatório')
    .isLength({ max: 100 })
    .withMessage('Proprietário deve ter no máximo 100 caracteres')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres')
    .trim(),

  body('environment')
    .optional()
    .isIn(['production', 'staging', 'development', 'testing'])
    .withMessage('Ambiente deve ser: production, staging, development ou testing'),

  body('uptime')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Uptime deve ter no máximo 50 caracteres')
    .trim(),

  body('port')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Porta deve ser um número entre 1 e 65535'),

  body('protocol')
    .optional()
    .isIn(['http', 'https', 'ssh', 'ftp', 'other'])
    .withMessage('Protocolo deve ser: http, https, ssh, ftp ou other'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags deve ser um array'),

  body('tags.*')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Cada tag deve ter no máximo 50 caracteres')
    .trim(),

  body('monitoringEnabled')
    .optional()
    .isBoolean()
    .withMessage('Monitorização deve ser true ou false'),

  body('alertsEnabled')
    .optional()
    .isBoolean()
    .withMessage('Alertas deve ser true ou false')
];

// Validador para atualizar sistema
const validateUpdateSystem = [
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres')
    .trim(),

  body('ip')
    .optional()
    .matches(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
    .withMessage('IP deve estar no formato IPv4 válido (ex: 192.168.1.100)')
    .trim(),

  body('status')
    .optional()
    .isIn(['online', 'offline', 'maintenance', 'unknown'])
    .withMessage('Status deve ser: online, offline, maintenance ou unknown'),

  body('os')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Sistema operativo deve ter entre 1 e 100 caracteres')
    .trim(),

  body('owner')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Proprietário deve ter entre 1 e 100 caracteres')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres')
    .trim(),

  body('environment')
    .optional()
    .isIn(['production', 'staging', 'development', 'testing'])
    .withMessage('Ambiente deve ser: production, staging, development ou testing'),

  body('uptime')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Uptime deve ter no máximo 50 caracteres')
    .trim(),

  body('port')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Porta deve ser um número entre 1 e 65535'),

  body('protocol')
    .optional()
    .isIn(['http', 'https', 'ssh', 'ftp', 'other'])
    .withMessage('Protocolo deve ser: http, https, ssh, ftp ou other'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags deve ser um array'),

  body('tags.*')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Cada tag deve ter no máximo 50 caracteres')
    .trim(),

  body('monitoringEnabled')
    .optional()
    .isBoolean()
    .withMessage('Monitorização deve ser true ou false'),

  body('alertsEnabled')
    .optional()
    .isBoolean()
    .withMessage('Alertas deve ser true ou false')
];

// Validador para parâmetros de sistema
const validateSystemId = [
  param('systemId')
    .isMongoId()
    .withMessage('ID de sistema inválido')
];

// Validador para filtros de listagem de sistemas
const validateSystemFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100'),

  query('status')
    .optional()
    .isIn(['online', 'offline', 'maintenance', 'unknown'])
    .withMessage('Status deve ser: online, offline, maintenance ou unknown'),

  query('environment')
    .optional()
    .isIn(['production', 'staging', 'development', 'testing'])
    .withMessage('Ambiente deve ser: production, staging, development ou testing'),

  query('owner')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Proprietário deve ter entre 1 e 100 caracteres')
    .trim(),

  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Pesquisa deve ter entre 1 e 100 caracteres')
    .trim(),

  query('sortBy')
    .optional()
    .isIn(['name', 'ip', 'status', 'environment', 'owner', 'createdAt', 'updatedAt', 'lastTest'])
    .withMessage('Ordenação deve ser por: name, ip, status, environment, owner, createdAt, updatedAt ou lastTest'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ordem deve ser: asc ou desc')
];

// Handler para erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

module.exports = {
  validateCreateSystem,
  validateUpdateSystem,
  validateSystemId,
  validateSystemFilters,
  handleValidationErrors
}; 