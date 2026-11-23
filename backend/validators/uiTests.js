const { body, param, validationResult } = require('express-validator');

const validateCreateUiTest = [
  body('systemSlug')
    .notEmpty().withMessage('Slug do sistema é obrigatório')
    .isString().withMessage('Slug deve ser uma string')
    .isLength({ min: 2, max: 200 }).withMessage('Slug deve ter entre 2 e 200 caracteres')
    .trim(),

  body('testType')
    .optional()
    .isIn(['ui', 'api', 'database', 'performance', 'os', 'network']).withMessage('testType inválido'),

  body('url')
    .optional()
    .custom((value, { req }) => {
      // URL é obrigatória apenas para testes UI
      if (req.body.testType === 'ui' || !req.body.testType) {
        if (!value || value.trim() === '') {
          throw new Error('URL é obrigatória para testes UI');
        }
      }
      return true;
    })
    .trim(),

  body('description')
    .notEmpty().withMessage('Descrição é obrigatória')
    .isLength({ min: 3, max: 1000 }).withMessage('Descrição deve ter entre 3 e 1000 caracteres')
    .trim(),

  body('extraDescription')
    .optional()
    .isLength({ max: 2000 }).withMessage('Extra descrição deve ter no máximo 2000 caracteres')
    .trim()
  ,

  body('returnPlan')
    .optional()
    .isBoolean().withMessage('returnPlan deve ser boolean'),

  body('skipAiPlan')
    .optional()
    .isBoolean().withMessage('skipAiPlan deve ser boolean')
];

const validateUiTestId = [
  param('uiTestId').isMongoId().withMessage('ID de teste UI inválido')
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

const validateFinalizeAndRun = [
  body('title').notEmpty().withMessage('title é obrigatório').isString().isLength({ min: 3, max: 200 }).trim(),
  body('objective').notEmpty().withMessage('objective é obrigatório').isString().isLength({ min: 3, max: 2000 }).trim(),
  body('testType')
    .optional()
    .isIn(['ui', 'api', 'database', 'performance', 'os', 'network']).withMessage('testType inválido'),
  body('url')
    .optional()
    .custom((value, { req }) => {
      if (req.body.testType === 'ui' || !req.body.testType) {
        if (!value || value.trim() === '') {
          throw new Error('URL é obrigatória para testes UI');
        }
      }
      return true;
    })
    .trim(),
  body('systemSlug').notEmpty().withMessage('systemSlug é obrigatório').isString().isLength({ min: 2, max: 200 }).trim(),
  body('steps').isArray({ min: 1 }).withMessage('steps deve ser um array com pelo menos 1 item'),
  body('steps.*').isString().isLength({ min: 1, max: 1000 }).trim(),
  body('acceptanceCriteria').optional().isArray(),
  body('acceptanceCriteria.*').optional().isString().isLength({ min: 1, max: 1000 }).trim()
];

module.exports = { validateCreateUiTest, validateUiTestId, validateFinalizeAndRun, handleValidationErrors };

