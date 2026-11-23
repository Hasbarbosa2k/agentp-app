const { body, param, validationResult } = require('express-validator');

const validateCreateUiTestRun = [
  body('testId')
    .notEmpty().withMessage('testId é obrigatório')
    .isString().withMessage('testId deve ser string')
    .isLength({ min: 3, max: 100 }).withMessage('testId deve ter entre 3 e 100 caracteres')
    .trim(),

  body('steps')
    .isArray({ min: 1 }).withMessage('steps deve ser um array com pelo menos 1 item'),

  body('steps.*')
    .isString().withMessage('cada passo deve ser string')
    .isLength({ min: 1, max: 1000 }).withMessage('passo deve ter 1..1000 chars')
    .trim(),

  body('relatedUiTestId')
    .optional()
    .isMongoId().withMessage('relatedUiTestId deve ser ObjectId válido'),

  body('systemSlug')
    .optional()
    .isString().withMessage('systemSlug deve ser string')
    .isLength({ min: 2, max: 200 }).withMessage('systemSlug deve ter 2..200 chars')
    .trim(),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: errors.array().map(e => ({ field: e.path || e.param, message: e.msg, value: e.value }))
    });
  }
  next();
};

module.exports = { validateCreateUiTestRun, handleValidationErrors };
const validateRunId = [ param('runId').isMongoId().withMessage('runId inválido') ];
module.exports.validateRunId = validateRunId;

