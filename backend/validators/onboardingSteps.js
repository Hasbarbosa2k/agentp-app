const { body, validationResult } = require('express-validator');

// Middleware para processar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: errors.array().reduce((acc, error) => {
        acc[error.path] = error.msg;
        return acc;
      }, {})
    });
  }
  next();
};

// Validação para teste de conectividade
const validateConnectivityTest = [
  body('host')
    .notEmpty()
    .withMessage('Host é obrigatório')
    .isString()
    .withMessage('Host deve ser uma string')
    .matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/)
    .withMessage('Host deve ser um IP válido ou hostname'),
  
  body('port')
    .notEmpty()
    .withMessage('Porta é obrigatória')
    .isInt({ min: 1, max: 65535 })
    .withMessage('Porta deve ser um número entre 1 e 65535'),
  
  // Opções (opcionais)
  body('options.pingCount')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Número de pings deve ser entre 1 e 10'),
  
  body('options.pingTimeout')
    .optional()
    .isInt({ min: 1000, max: 30000 })
    .withMessage('Timeout do ping deve ser entre 1000ms e 30000ms'),
  
  body('options.portTimeout')
    .optional()
    .isInt({ min: 1000, max: 30000 })
    .withMessage('Timeout da porta deve ser entre 1000ms e 30000ms'),
  
  body('options.includeTraceroute')
    .optional()
    .isBoolean()
    .withMessage('includeTraceroute deve ser um boolean'),
  
  handleValidationErrors
];

// Validação para detecção de OS
const validateOSDetection = [
  body('systemId')
    .notEmpty()
    .withMessage('SystemId é obrigatório')
    .isMongoId()
    .withMessage('SystemId deve ser um ObjectId válido'),
  
  body('credentials')
    .notEmpty()
    .withMessage('Credenciais são obrigatórias')
    .isObject()
    .withMessage('Credenciais devem ser um objeto'),
  
  body('credentials.username')
    .notEmpty()
    .withMessage('Username é obrigatório')
    .isString()
    .withMessage('Username deve ser uma string')
    .isLength({ min: 1, max: 50 })
    .withMessage('Username deve ter entre 1 e 50 caracteres'),
  
  // Validação condicional: deve ter password OU privateKey
  body('credentials')
    .custom((credentials) => {
      if (!credentials.password && !credentials.privateKey) {
        throw new Error('Deve fornecer password ou privateKey');
      }
      return true;
    }),
  
  body('credentials.password')
    .optional()
    .isString()
    .withMessage('Password deve ser uma string')
    .isLength({ min: 1 })
    .withMessage('Password não pode estar vazio'),
  
  body('credentials.privateKey')
    .optional()
    .isString()
    .withMessage('PrivateKey deve ser uma string')
    .isLength({ min: 1 })
    .withMessage('PrivateKey não pode estar vazio'),
  
  handleValidationErrors
];

// Validação para informações do sistema
const validateSystemInfo = [
  body('systemId')
    .notEmpty()
    .withMessage('SystemId é obrigatório')
    .isMongoId()
    .withMessage('SystemId deve ser um ObjectId válido'),
  
  body('credentials')
    .notEmpty()
    .withMessage('Credenciais são obrigatórias')
    .isObject()
    .withMessage('Credenciais devem ser um objeto'),
  
  body('credentials.username')
    .notEmpty()
    .withMessage('Username é obrigatório')
    .isString()
    .withMessage('Username deve ser uma string'),
  
  body('credentials')
    .custom((credentials) => {
      if (!credentials.password && !credentials.privateKey) {
        throw new Error('Deve fornecer password ou privateKey');
      }
      return true;
    }),
  
  body('commands')
    .optional()
    .isArray()
    .withMessage('Commands deve ser um array'),
  
  body('commands.*')
    .optional()
    .isString()
    .withMessage('Cada comando deve ser uma string')
    .isLength({ min: 1, max: 500 })
    .withMessage('Comandos devem ter entre 1 e 500 caracteres'),
  
  handleValidationErrors
];

// Validação para verificação de recursos
const validateResourceCheck = [
  body('systemId')
    .notEmpty()
    .withMessage('SystemId é obrigatório')
    .isMongoId()
    .withMessage('SystemId deve ser um ObjectId válido'),
  
  body('credentials')
    .notEmpty()
    .withMessage('Credenciais são obrigatórias')
    .isObject()
    .withMessage('Credenciais devem ser um objeto'),
  
  body('credentials.username')
    .notEmpty()
    .withMessage('Username é obrigatório')
    .isString()
    .withMessage('Username deve ser uma string'),
  
  body('credentials')
    .custom((credentials) => {
      if (!credentials.password && !credentials.privateKey) {
        throw new Error('Deve fornecer password ou privateKey');
      }
      return true;
    }),
  
  // Thresholds opcionais
  body('thresholds.minMemoryMB')
    .optional()
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Memória mínima deve ser entre 1MB e 1000000MB'),
  
  body('thresholds.maxCpuLoad')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Carga máxima de CPU deve ser entre 0% e 100%'),
  
  body('thresholds.minDiskSpaceGB')
    .optional()
    .isFloat({ min: 0.1, max: 10000 })
    .withMessage('Espaço mínimo em disco deve ser entre 0.1GB e 10000GB'),
  
  body('thresholds.maxDiskUsage')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('Uso máximo de disco deve ser entre 1% e 100%'),
  
  handleValidationErrors
];

// Validação para comando customizado
const validateCustomCommand = [
  body('systemId')
    .notEmpty()
    .withMessage('SystemId é obrigatório')
    .isMongoId()
    .withMessage('SystemId deve ser um ObjectId válido'),
  
  body('credentials')
    .notEmpty()
    .withMessage('Credenciais são obrigatórias')
    .isObject()
    .withMessage('Credenciais devem ser um objeto'),
  
  body('credentials.username')
    .notEmpty()
    .withMessage('Username é obrigatório')
    .isString()
    .withMessage('Username deve ser uma string'),
  
  body('credentials')
    .custom((credentials) => {
      if (!credentials.password && !credentials.privateKey) {
        throw new Error('Deve fornecer password ou privateKey');
      }
      return true;
    }),
  
  body('command')
    .notEmpty()
    .withMessage('Comando é obrigatório')
    .isString()
    .withMessage('Comando deve ser uma string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comando deve ter entre 1 e 1000 caracteres')
    // Verificações de segurança básicas
    .custom((command) => {
      const dangerousCommands = [
        'rm -rf /',
        'format',
        'del /f /s /q',
        'shutdown',
        'reboot',
        'halt',
        'init 0',
        'init 6',
        '> /dev/sda',
        'dd if=/dev/zero'
      ];
      
      const lowerCommand = command.toLowerCase();
      for (const dangerous of dangerousCommands) {
        if (lowerCommand.includes(dangerous.toLowerCase())) {
          throw new Error(`Comando perigoso detectado: ${dangerous}`);
        }
      }
      
      return true;
    }),
  
  body('options.timeout')
    .optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage('Timeout deve ser entre 1000ms (1s) e 300000ms (5min)'),
  
  handleValidationErrors
];

// Validação para atualizar passo no processo
const validateUpdateProcessStep = [
  body('onboardingId')
    .notEmpty()
    .withMessage('OnboardingId é obrigatório')
    .isMongoId()
    .withMessage('OnboardingId deve ser um ObjectId válido'),
  
  body('stepData')
    .notEmpty()
    .withMessage('Dados do passo são obrigatórios')
    .isObject()
    .withMessage('Dados do passo devem ser um objeto'),
  
  body('stepData.name')
    .notEmpty()
    .withMessage('Nome do passo é obrigatório')
    .isString()
    .withMessage('Nome do passo deve ser uma string'),
  
  body('stepData.status')
    .notEmpty()
    .withMessage('Status do passo é obrigatório')
    .isIn(['pending', 'in_progress', 'success', 'failed', 'skipped'])
    .withMessage('Status deve ser: pending, in_progress, success, failed ou skipped'),
  
  body('stepData.command')
    .optional()
    .isString()
    .withMessage('Comando deve ser uma string'),
  
  body('stepData.output')
    .optional()
    .isString()
    .withMessage('Output deve ser uma string'),
  
  body('stepData.error')
    .optional()
    .isString()
    .withMessage('Error deve ser uma string'),
  
  body('stepData.duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duração deve ser um número positivo'),
  
  handleValidationErrors
];

// Validação para múltiplas portas (extensão do teste de conectividade)
const validateMultiPortTest = [
  body('host')
    .notEmpty()
    .withMessage('Host é obrigatório')
    .isString()
    .withMessage('Host deve ser uma string')
    .matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/)
    .withMessage('Host deve ser um IP válido ou hostname'),
  
  body('ports')
    .notEmpty()
    .withMessage('Lista de portas é obrigatória')
    .isArray({ min: 1, max: 20 })
    .withMessage('Deve fornecer entre 1 e 20 portas'),
  
  body('ports.*')
    .isInt({ min: 1, max: 65535 })
    .withMessage('Cada porta deve ser um número entre 1 e 65535'),
  
  body('timeout')
    .optional()
    .isInt({ min: 1000, max: 30000 })
    .withMessage('Timeout deve ser entre 1000ms e 30000ms'),
  
  handleValidationErrors
];

module.exports = {
  validateConnectivityTest,
  validateOSDetection,
  validateSystemInfo,
  validateResourceCheck,
  validateCustomCommand,
  validateUpdateProcessStep,
  validateMultiPortTest,
  handleValidationErrors
}; 