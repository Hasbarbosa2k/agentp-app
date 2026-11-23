const { body, validationResult } = require('express-validator');

/**
 * Validações para credenciais SSH
 */
const validateSSHCredentials = [
  body('systemId')
    .notEmpty()
    .withMessage('ID do sistema é obrigatório')
    .isMongoId()
    .withMessage('ID do sistema deve ser um MongoID válido'),

  body('credentials')
    .isObject()
    .withMessage('Credenciais SSH são obrigatórias'),

  body('credentials.username')
    .notEmpty()
    .withMessage('Nome de usuário SSH é obrigatório')
    .isLength({ min: 1, max: 50 })
    .withMessage('Nome de usuário deve ter entre 1 e 50 caracteres'),

  body('credentials.password')
    .optional()
    .isString()
    .withMessage('Senha deve ser uma string')
    .isLength({ min: 1, max: 200 })
    .withMessage('Senha deve ter entre 1 e 200 caracteres'),

  body('credentials.privateKey')
    .optional()
    .isString()
    .withMessage('Chave privada deve ser uma string')
    .isLength({ min: 100, max: 10000 })
    .withMessage('Chave privada deve ter entre 100 e 10000 caracteres'),

  body('credentials.privateKeyPath')
    .optional()
    .isString()
    .withMessage('Caminho da chave privada deve ser uma string')
    .isLength({ min: 1, max: 500 })
    .withMessage('Caminho deve ter entre 1 e 500 caracteres'),

  // Validar se pelo menos uma forma de autenticação foi fornecida
  body('credentials')
    .custom((credentials) => {
      if (!credentials.password && !credentials.privateKey && !credentials.privateKeyPath) {
        throw new Error('Senha ou chave privada SSH é obrigatória');
      }
      return true;
    }),

  body('options')
    .optional()
    .isObject()
    .withMessage('Opções devem ser um objeto'),

  body('options.autoRetry')
    .optional()
    .isBoolean()
    .withMessage('autoRetry deve ser um booleano'),

  body('options.maxRetries')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('maxRetries deve ser um número entre 1 e 10'),

  body('options.timeout')
    .optional()
    .isInt({ min: 5, max: 300 })
    .withMessage('timeout deve ser um número entre 5 e 300 segundos'),

  body('options.continueOnFailure')
    .optional()
    .isBoolean()
    .withMessage('continueOnFailure deve ser um booleano'),

  body('options.connectionTimeout')
    .optional()
    .isInt({ min: 5000, max: 120000 })
    .withMessage('connectionTimeout deve ser um número entre 5000 e 120000ms'),

  body('options.retryDelay')
    .optional()
    .isInt({ min: 500, max: 30000 })
    .withMessage('retryDelay deve ser um número entre 500 e 30000ms'),

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
 * Validações para execução de passo individual
 */
const validateStepExecution = [
  body('onboardingId')
    .notEmpty()
    .withMessage('ID do processo de onboarding é obrigatório')
    .isMongoId()
    .withMessage('ID do processo deve ser um MongoID válido'),

  body('stepIndex')
    .isInt({ min: 0, max: 100 })
    .withMessage('Índice do passo deve ser um número entre 0 e 100'),

  body('credentials')
    .isObject()
    .withMessage('Credenciais SSH são obrigatórias'),

  body('credentials.username')
    .notEmpty()
    .withMessage('Nome de usuário SSH é obrigatório')
    .isLength({ min: 1, max: 50 })
    .withMessage('Nome de usuário deve ter entre 1 e 50 caracteres'),

  body('credentials.password')
    .optional()
    .isString()
    .withMessage('Senha deve ser uma string')
    .isLength({ min: 1, max: 200 })
    .withMessage('Senha deve ter entre 1 e 200 caracteres'),

  body('credentials.privateKey')
    .optional()
    .isString()
    .withMessage('Chave privada deve ser uma string')
    .isLength({ min: 100, max: 10000 })
    .withMessage('Chave privada deve ter entre 100 e 10000 caracteres'),

  body('credentials.privateKeyPath')
    .optional()
    .isString()
    .withMessage('Caminho da chave privada deve ser uma string')
    .isLength({ min: 1, max: 500 })
    .withMessage('Caminho deve ter entre 1 e 500 caracteres'),

  // Validar se pelo menos uma forma de autenticação foi fornecida
  body('credentials')
    .custom((credentials) => {
      if (!credentials.password && !credentials.privateKey && !credentials.privateKeyPath) {
        throw new Error('Senha ou chave privada SSH é obrigatória');
      }
      return true;
    }),

  body('options')
    .optional()
    .isObject()
    .withMessage('Opções devem ser um objeto'),

  body('options.timeout')
    .optional()
    .isInt({ min: 5, max: 300 })
    .withMessage('timeout deve ser um número entre 5 e 300 segundos'),

  body('options.retryDelay')
    .optional()
    .isInt({ min: 500, max: 10000 })
    .withMessage('retryDelay deve ser um número entre 500 e 10000ms'),

  // Middleware para processar resultados da validação
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos para execução de passo',
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
 * Validações para teste de conectividade SSH
 */
const validateSSHConnectionTest = [
  body('host')
    .notEmpty()
    .withMessage('Host é obrigatório')
    .isLength({ min: 1, max: 253 })
    .withMessage('Host deve ter entre 1 e 253 caracteres')
    .matches(/^[a-zA-Z0-9.-]+$/)
    .withMessage('Host deve conter apenas letras, números, pontos e hífens'),

  body('port')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Porta deve ser um número entre 1 e 65535'),

  body('credentials')
    .isObject()
    .withMessage('Credenciais SSH são obrigatórias'),

  body('credentials.username')
    .notEmpty()
    .withMessage('Nome de usuário SSH é obrigatório')
    .isLength({ min: 1, max: 50 })
    .withMessage('Nome de usuário deve ter entre 1 e 50 caracteres'),

  body('credentials.password')
    .optional()
    .isString()
    .withMessage('Senha deve ser uma string')
    .isLength({ min: 1, max: 200 })
    .withMessage('Senha deve ter entre 1 e 200 caracteres'),

  body('credentials.privateKey')
    .optional()
    .isString()
    .withMessage('Chave privada deve ser uma string')
    .isLength({ min: 100, max: 10000 })
    .withMessage('Chave privada deve ter entre 100 e 10000 caracteres'),

  body('credentials.privateKeyPath')
    .optional()
    .isString()
    .withMessage('Caminho da chave privada deve ser uma string')
    .isLength({ min: 1, max: 500 })
    .withMessage('Caminho deve ter entre 1 e 500 caracteres'),

  // Validar se pelo menos uma forma de autenticação foi fornecida
  body('credentials')
    .custom((credentials) => {
      if (!credentials.password && !credentials.privateKey && !credentials.privateKeyPath) {
        throw new Error('Senha ou chave privada SSH é obrigatória');
      }
      return true;
    }),

  // Middleware para processar resultados da validação
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos para teste de conectividade',
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
 * Validações para cancelamento de processo
 */
const validateProcessCancellation = [
  body('systemId')
    .notEmpty()
    .withMessage('ID do sistema é obrigatório')
    .isMongoId()
    .withMessage('ID do sistema deve ser um MongoID válido'),

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
        message: 'Dados de entrada inválidos para cancelamento',
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
 * Validação customizada para verificar se IP é válido
 * @param {string} value - Valor a validar
 * @returns {boolean} Se é um IP válido
 */
function isValidIP(value) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(value) || ipv6Regex.test(value);
}

/**
 * Validação customizada para chave privada SSH
 * @param {string} privateKey - Chave privada
 * @returns {boolean} Se é uma chave válida
 */
function isValidPrivateKey(privateKey) {
  if (!privateKey || typeof privateKey !== 'string') {
    return false;
  }
  
  // Verificar se contém headers típicos de chaves SSH
  const sshKeyHeaders = [
    '-----BEGIN RSA PRIVATE KEY-----',
    '-----BEGIN DSA PRIVATE KEY-----',
    '-----BEGIN EC PRIVATE KEY-----',
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    '-----BEGIN PRIVATE KEY-----'
  ];
  
  return sshKeyHeaders.some(header => privateKey.includes(header));
}

/**
 * Middleware para sanitizar credenciais SSH (remover campos sensíveis dos logs)
 */
const sanitizeSSHCredentials = (req, res, next) => {
  if (req.body && req.body.credentials) {
    // Criar cópia para logs sem dados sensíveis
    req.sanitizedBody = {
      ...req.body,
      credentials: {
        username: req.body.credentials.username,
        hasPassword: !!req.body.credentials.password,
        hasPrivateKey: !!req.body.credentials.privateKey,
        hasPrivateKeyPath: !!req.body.credentials.privateKeyPath
      }
    };
  }
  next();
};

module.exports = {
  validateSSHCredentials,
  validateStepExecution,
  validateSSHConnectionTest,
  validateProcessCancellation,
  sanitizeSSHCredentials,
  isValidIP,
  isValidPrivateKey
}; 