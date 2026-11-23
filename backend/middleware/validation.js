const { validationResult } = require('express-validator');

/**
 * Middleware para tratar erros de validação do express-validator
 * Deve ser usado após os validadores do express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    console.log(`❌ Erros de validação na rota ${req.method} ${req.originalUrl}:`, formattedErrors);

    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: formattedErrors,
      details: formattedErrors.map(err => `${err.field}: ${err.message}`).join(', ')
    });
  }

  next();
};

module.exports = {
  handleValidationErrors
}; 