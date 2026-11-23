const { body, validationResult } = require('express-validator');

// Validator for user registration
const validateRegister = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username deve ter entre 3 e 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username só pode conter letras, números e underscore'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password deve conter pelo menos uma letra minúscula, uma maiúscula e um número')
];

// Validator for user login
const validateLogin = [
  body()
    .custom((value, { req }) => {
      const { identifier, email } = req.body;
      
      // Aceitar tanto 'identifier' quanto 'email'
      if (!identifier && !email) {
        throw new Error('Email ou username é obrigatório');
      }
      
      return true;
    }),
    
  body('password')
    .notEmpty()
    .withMessage('Password é obrigatória')
];

// Validator for password change
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Password atual é obrigatória'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nova password deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nova password deve conter pelo menos uma letra minúscula, uma maiúscula e um número')
];

// Validator for password reset request
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido')
];

// Validator for password reset
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Token é obrigatório'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nova password deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nova password deve conter pelo menos uma letra minúscula, uma maiúscula e um número')
];

// Validator for refresh token
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token é obrigatório')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateRefreshToken,
  handleValidationErrors
}; 