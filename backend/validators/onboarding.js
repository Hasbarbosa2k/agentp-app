const { body, param, query, validationResult } = require('express-validator');

/**
 * Validações para início de processo de onboarding
 */
const validateOnboardingStart = [
  body('systemId')
    .notEmpty()
    .withMessage('ID do sistema é obrigatório')
    .isMongoId()
    .withMessage('ID do sistema deve ser um MongoID válido'),

  body('customSteps')
    .optional()
    .isArray()
    .withMessage('Passos customizados devem ser um array'),

  body('customSteps.*.step')
    .optional()
    .notEmpty()
    .withMessage('Nome do passo é obrigatório')
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome do passo deve ter entre 3 e 100 caracteres'),

  body('customSteps.*.command')
    .optional()
    .notEmpty()
    .withMessage('Comando é obrigatório')
    .isLength({ min: 1, max: 500 })
    .withMessage('Comando deve ter entre 1 e 500 caracteres'),

  body('customSteps.*.description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Descrição deve ter no máximo 200 caracteres'),

  body('config')
    .optional()
    .isObject()
    .withMessage('Configuração deve ser um objeto'),

  body('config.autoRetry')
    .optional()
    .isBoolean()
    .withMessage('autoRetry deve ser um booleano'),

  body('config.maxRetries')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('maxRetries deve ser um número entre 0 e 10'),

  body('config.timeoutSeconds')
    .optional()
    .isInt({ min: 30, max: 3600 })
    .withMessage('timeoutSeconds deve ser um número entre 30 e 3600'),

  // Middleware para processar resultados da validação
  (req, res, next) => {
    try {
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
      if (typeof next === 'function') {
        next();
      }
    } catch (error) {
      console.error('Erro no middleware de validação:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
];

/**
 * Validações para execução de passo
 */
const validateStepExecution = [
  param('onboardingId')
    .isMongoId()
    .withMessage('ID do processo de onboarding deve ser um MongoID válido'),

  param('stepIndex')
    .isInt({ min: 0 })
    .withMessage('Índice do passo deve ser um número inteiro não negativo'),

  body('output')
    .optional()
    .isString()
    .withMessage('Output deve ser uma string')
    .isLength({ max: 10000 })
    .withMessage('Output deve ter no máximo 10000 caracteres'),

  body('error')
    .optional()
    .isString()
    .withMessage('Erro deve ser uma string')
    .isLength({ max: 1000 })
    .withMessage('Erro deve ter no máximo 1000 caracteres'),

  body('osInfo')
    .optional()
    .isObject()
    .withMessage('osInfo deve ser um objeto'),

  body('osInfo.id')
    .optional()
    .isString()
    .withMessage('osInfo.id deve ser uma string')
    .isLength({ max: 50 })
    .withMessage('osInfo.id deve ter no máximo 50 caracteres'),

  body('osInfo.version')
    .optional()
    .isString()
    .withMessage('osInfo.version deve ser uma string')
    .isLength({ max: 50 })
    .withMessage('osInfo.version deve ter no máximo 50 caracteres'),

  body('osInfo.like')
    .optional()
    .isString()
    .withMessage('osInfo.like deve ser uma string')
    .isLength({ max: 50 })
    .withMessage('osInfo.like deve ter no máximo 50 caracteres'),

  body('osInfo.name')
    .optional()
    .isString()
    .withMessage('osInfo.name deve ser uma string')
    .isLength({ max: 100 })
    .withMessage('osInfo.name deve ter no máximo 100 caracteres'),

  body('osInfo.prettyName')
    .optional()
    .isString()
    .withMessage('osInfo.prettyName deve ser uma string')
    .isLength({ max: 100 })
    .withMessage('osInfo.prettyName deve ter no máximo 100 caracteres'),

  body('osInfo.versionCodename')
    .optional()
    .isString()
    .withMessage('osInfo.versionCodename deve ser uma string')
    .isLength({ max: 50 })
    .withMessage('osInfo.versionCodename deve ter no máximo 50 caracteres'),

  body('osInfo.architecture')
    .optional()
    .isString()
    .withMessage('osInfo.architecture deve ser uma string')
    .isLength({ max: 20 })
    .withMessage('osInfo.architecture deve ter no máximo 20 caracteres'),

  body('osInfo.kernel')
    .optional()
    .isString()
    .withMessage('osInfo.kernel deve ser uma string')
    .isLength({ max: 100 })
    .withMessage('osInfo.kernel deve ter no máximo 100 caracteres'),

  // Middleware para processar resultados da validação
  (req, res, next) => {
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
  }
];

/**
 * Validações para listagem de processos
 */
const validateOnboardingList = [
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'failed', 'cancelled'])
    .withMessage('Status deve ser: pending, in_progress, completed, failed ou cancelled'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),

  // Middleware para processar resultados da validação
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros de consulta inválidos',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    next();
  }
];

/**
 * Validações para cancelamento
 */
const validateOnboardingCancel = [
  param('onboardingId')
    .isMongoId()
    .withMessage('ID do processo de onboarding deve ser um MongoID válido'),

  body('reason')
    .optional()
    .isString()
    .withMessage('Motivo deve ser uma string')
    .isLength({ max: 500 })
    .withMessage('Motivo deve ter no máximo 500 caracteres'),

  // Middleware para processar resultados da validação
  (req, res, next) => {
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
  }
];

/**
 * Validações para obter detalhes
 */
const validateOnboardingDetails = [
  param('onboardingId')
    .isMongoId()
    .withMessage('ID do processo de onboarding deve ser um MongoID válido'),

  // Middleware para processar resultados da validação
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID do processo de onboarding inválido',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    next();
  }
];

/**
 * Validações para obter status por sistema
 */
const validateOnboardingBySystem = [
  param('systemId')
    .isMongoId()
    .withMessage('ID do sistema deve ser um MongoID válido'),

  // Middleware para processar resultados da validação
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID do sistema inválido',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    next();
  }
];

module.exports = {
  validateOnboardingStart,
  validateStepExecution,
  validateOnboardingList,
  validateOnboardingCancel,
  validateOnboardingDetails,
  validateOnboardingBySystem
}; 