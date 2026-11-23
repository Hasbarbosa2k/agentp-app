const { body, validationResult } = require('express-validator');

// Validate profile update data
const validateUpdateProfile = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome de exibição deve ter entre 1 e 100 caracteres')
    .matches(/^[a-zA-Z0-9\s\u00C0-\u017F\-_.]+$/)
    .withMessage('Nome de exibição contém caracteres inválidos'),
    
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email não pode ter mais de 255 caracteres'),
    
  body('team')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Team deve ter entre 1 e 50 caracteres')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Team contém caracteres inválidos')
];

// Validate preferences update data
const validateUpdatePreferences = [
  // Notifications preferences
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Notifications deve ser um objeto'),
    
  body('notifications.testCompletion')
    .optional()
    .isBoolean()
    .withMessage('testCompletion deve ser verdadeiro ou falso'),
    
  body('notifications.systemAlerts')
    .optional()
    .isBoolean()
    .withMessage('systemAlerts deve ser verdadeiro ou falso'),
    
  body('notifications.emailReports')
    .optional()
    .isBoolean()
    .withMessage('emailReports deve ser verdadeiro ou falso'),
    
  // Appearance preferences
  body('appearance')
    .optional()
    .isObject()
    .withMessage('Appearance deve ser um objeto'),
    
  body('appearance.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme deve ser light, dark ou auto'),
    
  body('appearance.accentColor')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Accent color deve ser uma cor hexadecimal válida (ex: #3b82f6)'),
    
  // Advanced preferences
  body('advanced')
    .optional()
    .isObject()
    .withMessage('Advanced deve ser um objeto'),
    
  body('advanced.debugMode')
    .optional()
    .isBoolean()
    .withMessage('debugMode deve ser verdadeiro ou falso'),
    
  body('advanced.detailedLogs')
    .optional()
    .isBoolean()
    .withMessage('detailedLogs deve ser verdadeiro ou falso')
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
      message: 'Dados de entrada inválidos',
      errors: extractedErrors
    });
  }
  
  next();
};

// Validate team name format
const validateTeamName = [
  body('team')
    .notEmpty()
    .withMessage('Nome do team é obrigatório')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome do team deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Nome do team só pode conter letras, números, espaços, hífens e underscores')
    .custom((value) => {
      // Forbidden team names
      const forbidden = ['admin', 'root', 'system', 'null', 'undefined', 'test'];
      if (forbidden.includes(value.toLowerCase())) {
        throw new Error('Nome de team não permitido');
      }
      return true;
    })
];

// Validate display name format
const validateDisplayName = [
  body('displayName')
    .notEmpty()
    .withMessage('Nome de exibição é obrigatório')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome de exibição deve ter entre 1 e 100 caracteres')
    .matches(/^[a-zA-Z0-9\s\u00C0-\u017F\-_.]+$/)
    .withMessage('Nome de exibição contém caracteres inválidos')
    .custom((value) => {
      // Check for inappropriate content (basic filter)
      const inappropriate = ['admin', 'root', 'system'];
      if (inappropriate.some(word => value.toLowerCase().includes(word))) {
        throw new Error('Nome de exibição contém conteúdo não permitido');
      }
      return true;
    })
];

// Validate preference section
const validatePreferenceSection = [
  body('section')
    .notEmpty()
    .withMessage('Secção é obrigatória')
    .isIn(['notifications', 'appearance', 'advanced'])
    .withMessage('Secção deve ser notifications, appearance ou advanced'),
    
  body('preferences')
    .notEmpty()
    .withMessage('Preferências são obrigatórias')
    .isObject()
    .withMessage('Preferências devem ser um objeto')
];

module.exports = {
  validateUpdateProfile,
  validateUpdatePreferences,
  validateTeamName,
  validateDisplayName,
  validatePreferenceSection,
  handleValidationErrors
}; 