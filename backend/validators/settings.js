const { body, validationResult } = require('express-validator');

// Validate database settings
const validateDatabaseSettings = [
  body('backupFrequency')
    .optional()
    .isIn(['hourly', 'daily', 'weekly', 'monthly'])
    .withMessage('Frequência de backup deve ser hourly, daily, weekly ou monthly'),
    
  body('autoCleanupOldTests')
    .optional()
    .isBoolean()
    .withMessage('Auto cleanup deve ser verdadeiro ou falso'),
    
  body('retentionPeriodDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Período de retenção deve ser entre 1 e 365 dias')
];

// Validate appearance settings
const validateAppearanceSettings = [
  body('defaultTheme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Tema padrão deve ser light, dark ou auto'),
    
  body('defaultAccentColor')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Cor de destaque deve ser uma cor hexadecimal válida (ex: #3b82f6)'),
    
  body('allowUserCustomization')
    .optional()
    .isBoolean()
    .withMessage('Permitir personalização deve ser verdadeiro ou falso')
];

// Validate advanced settings
const validateAdvancedSettings = [
  body('logLevel')
    .optional()
    .isIn(['error', 'warn', 'info', 'debug'])
    .withMessage('Nível de log deve ser error, warn, info ou debug'),
    
  body('retainLogsDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Dias de retenção de logs deve ser entre 1 e 365'),
    
  body('debugModeGlobal')
    .optional()
    .isBoolean()
    .withMessage('Modo debug global deve ser verdadeiro ou falso'),
    
  body('maintenanceMode')
    .optional()
    .isBoolean()
    .withMessage('Modo de manutenção deve ser verdadeiro ou falso'),
    
  body('maintenanceMessage')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Mensagem de manutenção deve ter entre 1 e 500 caracteres')
];

// Validate security settings
const validateSecuritySettings = [
  body('sessionTimeoutMinutes')
    .optional()
    .isInt({ min: 5, max: 10080 }) // 5 minutes to 1 week
    .withMessage('Timeout de sessão deve ser entre 5 e 10080 minutos'),
    
  body('maxLoginAttempts')
    .optional()
    .isInt({ min: 3, max: 10 })
    .withMessage('Máximo de tentativas de login deve ser entre 3 e 10'),
    
  body('lockoutDurationMinutes')
    .optional()
    .isInt({ min: 5, max: 1440 }) // 5 minutes to 24 hours
    .withMessage('Duração do bloqueio deve ser entre 5 e 1440 minutos'),
    
  body('requirePasswordChange')
    .optional()
    .isBoolean()
    .withMessage('Exigir alteração de password deve ser verdadeiro ou falso'),
    
  body('passwordChangeDays')
    .optional()
    .isInt({ min: 30, max: 365 })
    .withMessage('Dias para alteração de password deve ser entre 30 e 365')
];

// Validate import settings data
const validateImportSettings = [
  body('settingsData')
    .notEmpty()
    .withMessage('Dados de configuração são obrigatórios')
    .isObject()
    .withMessage('Dados de configuração devem ser um objeto'),
    
  body('overwriteExisting')
    .optional()
    .isBoolean()
    .withMessage('Sobrescrever existentes deve ser verdadeiro ou falso'),
    
  // Validate specific sections if they exist
  body('settingsData.database')
    .optional()
    .isObject()
    .withMessage('Secção database deve ser um objeto'),
    
  body('settingsData.security')
    .optional()
    .isObject()
    .withMessage('Secção security deve ser um objeto'),
    
  body('settingsData.system')
    .optional()
    .isObject()
    .withMessage('Secção system deve ser um objeto'),
    
  body('settingsData.notifications')
    .optional()
    .isObject()
    .withMessage('Secção notifications deve ser um objeto'),
    
  body('settingsData.monitoring')
    .optional()
    .isObject()
    .withMessage('Secção monitoring deve ser um objeto')
];

// Validate notification settings
const validateNotificationSettings = [
  body('emailEnabled')
    .optional()
    .isBoolean()
    .withMessage('Email ativado deve ser verdadeiro ou falso'),
    
  body('smtpHost')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Host SMTP deve ter entre 1 e 255 caracteres')
    .matches(/^[a-zA-Z0-9.-]+$/)
    .withMessage('Host SMTP deve ser um domínio válido'),
    
  body('smtpPort')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Porta SMTP deve ser entre 1 e 65535'),
    
  body('emailFrom')
    .optional()
    .isEmail()
    .withMessage('Email remetente deve ter um formato válido')
    .normalizeEmail(),
    
  body('alertThresholds')
    .optional()
    .isObject()
    .withMessage('Limiares de alerta devem ser um objeto'),
    
  body('alertThresholds.systemOfflineMinutes')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Minutos offline deve ser entre 1 e 1440'),
    
  body('alertThresholds.diskUsagePercentage')
    .optional()
    .isInt({ min: 50, max: 99 })
    .withMessage('Percentagem de uso do disco deve ser entre 50 e 99'),
    
  body('alertThresholds.memoryUsagePercentage')
    .optional()
    .isInt({ min: 50, max: 99 })
    .withMessage('Percentagem de uso da memória deve ser entre 50 e 99')
];

// Validate monitoring settings
const validateMonitoringSettings = [
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Monitorização ativada deve ser verdadeiro ou falso'),
    
  body('checkIntervalMinutes')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Intervalo de verificação deve ser entre 1 e 60 minutos'),
    
  body('logLevel')
    .optional()
    .isIn(['error', 'warn', 'info', 'debug'])
    .withMessage('Nível de log deve ser error, warn, info ou debug'),
    
  body('retainLogsDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Dias de retenção deve ser entre 1 e 365')
];

// Validate system settings
const validateSystemSettings = [
  body('maintenanceMode')
    .optional()
    .isBoolean()
    .withMessage('Modo de manutenção deve ser verdadeiro ou falso'),
    
  body('maintenanceMessage')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Mensagem de manutenção deve ter entre 1 e 500 caracteres'),
    
  body('maxUsersAllowed')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Máximo de utilizadores deve ser maior que 0'),
    
  body('allowUserRegistration')
    .optional()
    .isBoolean()
    .withMessage('Permitir registo deve ser verdadeiro ou falso')
];

// Custom middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = [];
    errors.array().map(error => {
      extractedErrors.push({
        field: error.param,
        message: error.msg,
        value: error.value
      });
    });
    
    return res.status(400).json({
      success: false,
      message: 'Dados de configuração inválidos',
      errors: extractedErrors
    });
  }
  
  next();
};

// Validate settings section parameter
const validateSettingsSection = [
  body('section')
    .notEmpty()
    .withMessage('Secção é obrigatória')
    .isIn(['database', 'security', 'system', 'notifications', 'monitoring', 'appearance'])
    .withMessage('Secção deve ser uma das seguintes: database, security, system, notifications, monitoring, appearance')
];

// Validate backup settings
const validateBackupSettings = [
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Backup ativado deve ser verdadeiro ou falso'),
    
  body('frequency')
    .optional()
    .isIn(['hourly', 'daily', 'weekly', 'monthly'])
    .withMessage('Frequência deve ser hourly, daily, weekly ou monthly'),
    
  body('retentionDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Dias de retenção deve ser entre 1 e 365'),
    
  body('compressionEnabled')
    .optional()
    .isBoolean()
    .withMessage('Compressão ativada deve ser verdadeiro ou falso'),
    
  body('encryptionEnabled')
    .optional()
    .isBoolean()
    .withMessage('Encriptação ativada deve ser verdadeiro ou falso')
];

module.exports = {
  validateDatabaseSettings,
  validateAppearanceSettings,
  validateAdvancedSettings,
  validateSecuritySettings,
  validateImportSettings,
  validateNotificationSettings,
  validateMonitoringSettings,
  validateSystemSettings,
  validateSettingsSection,
  validateBackupSettings,
  handleValidationErrors
}; 