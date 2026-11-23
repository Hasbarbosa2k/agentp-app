const Joi = require('joi');

// Schema para validação de um passo do template
const templateStepSchema = Joi.object({
  name: Joi.string().min(1).max(100).required()
    .messages({
      'string.empty': 'Nome do passo é obrigatório',
      'string.min': 'Nome do passo deve ter pelo menos 1 caractere',
      'string.max': 'Nome do passo deve ter no máximo 100 caracteres'
    }),
  description: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Descrição do passo deve ter no máximo 500 caracteres'
    }),
  command: Joi.string().min(1).max(2000).required()
    .messages({
      'string.empty': 'Comando é obrigatório',
      'string.min': 'Comando deve ter pelo menos 1 caractere',
      'string.max': 'Comando deve ter no máximo 2000 caracteres'
    }),
  validations: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(
        'string_contains',
        'string_not_contains', 
        'regex_match',
        'numeric_range',
        'exists',
        'not_exists',
        'output_contains'
      ).required()
        .messages({
          'any.only': 'Tipo de validação deve ser um dos valores permitidos'
        }),
      value: Joi.string().max(500).required()
        .messages({
          'string.empty': 'Valor da validação é obrigatório',
          'string.max': 'Valor da validação deve ter no máximo 500 caracteres'
        }),
      description: Joi.string().max(200).optional()
        .messages({
          'string.max': 'Descrição da validação deve ter no máximo 200 caracteres'
        }),
      required: Joi.boolean().default(true),
      minValue: Joi.number().when('type', {
        is: 'numeric_range',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      maxValue: Joi.number().when('type', {
        is: 'numeric_range',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      flags: Joi.string().when('type', {
        is: 'regex_match',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      })
    })
  ).default([]),
  timeout: Joi.number().integer().min(1000).max(300000).default(30000)
    .messages({
      'number.min': 'Timeout deve ser pelo menos 1000ms',
      'number.max': 'Timeout deve ser no máximo 300000ms'
    }),
  retryable: Joi.boolean().default(true),
  required: Joi.boolean().default(true),
  order: Joi.number().integer().min(1).optional(),
  category: Joi.string().valid(
    'system',
    'security', 
    'network',
    'services',
    'custom'
  ).default('custom')
    .messages({
      'any.only': 'Categoria deve ser uma das opções permitidas'
    })
});

// Schema para configuração do template
const templateConfigSchema = Joi.object({
  stopOnFirstError: Joi.boolean().default(true),
  allowParallelExecution: Joi.boolean().default(false),
  globalTimeout: Joi.number().integer().min(30).max(3600).default(300)
    .messages({
      'number.min': 'Timeout global deve ser pelo menos 30 segundos',
      'number.max': 'Timeout global deve ser no máximo 3600 segundos'
    }),
  maxRetries: Joi.number().integer().min(0).max(10).default(3)
    .messages({
      'number.min': 'Máximo de tentativas deve ser pelo menos 0',
      'number.max': 'Máximo de tentativas deve ser no máximo 10'
    })
});

// Schema para criação de template
const createTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required()
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .messages({
      'string.empty': 'Nome do template é obrigatório',
      'string.min': 'Nome do template deve ter pelo menos 1 caractere',
      'string.max': 'Nome do template deve ter no máximo 100 caracteres',
      'string.pattern.base': 'Nome do template deve conter apenas letras, números, espaços, hífens e underscores'
    }),
  description: Joi.string().max(1000).optional()
    .messages({
      'string.max': 'Descrição deve ter no máximo 1000 caracteres'
    }),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).default('1.0.0')
    .messages({
      'string.pattern.base': 'Versão deve estar no formato X.Y.Z'
    }),
  category: Joi.string().valid(
    'system_discovery',
    'security_audit',
    'performance_check',
    'service_discovery',
    'custom'
  ).default('custom')
    .messages({
      'any.only': 'Categoria deve ser uma das opções permitidas'
    }),
  status: Joi.string().valid('draft', 'active', 'deprecated', 'archived').default('draft')
    .messages({
      'any.only': 'Status deve ser um dos valores permitidos'
    }),
  supportedOS: Joi.array().items(Joi.string()).default([]),
  tags: Joi.array().items(Joi.string().max(50)).default([])
    .messages({
      'array.max': 'Máximo de 20 tags permitidas'
    }),
  steps: Joi.array().items(templateStepSchema).min(1).required()
    .messages({
      'array.min': 'Template deve ter pelo menos um passo',
      'array.base': 'Steps deve ser um array'
    }),
  config: templateConfigSchema.default({}),
  baseTemplate: Joi.string().optional(),
  changeDescription: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Descrição da mudança deve ter no máximo 500 caracteres'
    })
});

// Schema para atualização de template
const updateTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional()
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .messages({
      'string.min': 'Nome do template deve ter pelo menos 1 caractere',
      'string.max': 'Nome do template deve ter no máximo 100 caracteres',
      'string.pattern.base': 'Nome do template deve conter apenas letras, números, espaços, hífens e underscores'
    }),
  description: Joi.string().max(1000).optional()
    .messages({
      'string.max': 'Descrição deve ter no máximo 1000 caracteres'
    }),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).optional()
    .messages({
      'string.pattern.base': 'Versão deve estar no formato X.Y.Z'
    }),
  category: Joi.string().valid(
    'system_discovery',
    'security_audit',
    'performance_check',
    'service_discovery',
    'custom'
  ).optional()
    .messages({
      'any.only': 'Categoria deve ser uma das opções permitidas'
    }),
  status: Joi.string().valid('draft', 'active', 'deprecated', 'archived').optional()
    .messages({
      'any.only': 'Status deve ser um dos valores permitidos'
    }),
  supportedOS: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional()
    .messages({
      'array.max': 'Máximo de 20 tags permitidas'
    }),
  steps: Joi.array().items(templateStepSchema).min(1).optional()
    .messages({
      'array.min': 'Template deve ter pelo menos um passo',
      'array.base': 'Steps deve ser um array'
    }),
  config: templateConfigSchema.optional(),
  changeDescription: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Descrição da mudança deve ter no máximo 500 caracteres'
    })
});

// Schema para clonagem de template
const cloneTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required()
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .messages({
      'string.empty': 'Nome do novo template é obrigatório',
      'string.min': 'Nome do template deve ter pelo menos 1 caractere',
      'string.max': 'Nome do template deve ter no máximo 100 caracteres',
      'string.pattern.base': 'Nome do template deve conter apenas letras, números, espaços, hífens e underscores'
    }),
  description: Joi.string().max(1000).optional()
    .messages({
      'string.max': 'Descrição deve ter no máximo 1000 caracteres'
    }),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).default('1.0.0')
    .messages({
      'string.pattern.base': 'Versão deve estar no formato X.Y.Z'
    })
});

// Schema para teste de validações
const testValidationsSchema = Joi.object({
  testOutputs: Joi.array().items(
    Joi.object({
      stepIndex: Joi.number().integer().min(0).required()
        .messages({
          'number.base': 'Índice do passo deve ser um número',
          'number.min': 'Índice do passo deve ser pelo menos 0'
        }),
      output: Joi.string().max(10000).required()
        .messages({
          'string.empty': 'Output é obrigatório',
          'string.max': 'Output deve ter no máximo 10000 caracteres'
        })
    })
  ).min(1).required()
    .messages({
      'array.min': 'Pelo menos um output de teste é obrigatório',
      'array.base': 'Test outputs deve ser um array'
    })
});

// Middleware de validação para criação
const validateCreateTemplate = (req, res, next) => {
  const { error, value } = createTemplateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors
    });
  }

  req.body = value;
  next();
};

// Middleware de validação para atualização
const validateUpdateTemplate = (req, res, next) => {
  const { error, value } = updateTemplateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors
    });
  }

  req.body = value;
  next();
};

// Middleware de validação para clonagem
const validateCloneTemplate = (req, res, next) => {
  const { error, value } = cloneTemplateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors
    });
  }

  req.body = value;
  next();
};

// Middleware de validação para teste de validações
const validateTestValidations = (req, res, next) => {
  const { error, value } = testValidationsSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors
    });
  }

  req.body = value;
  next();
};

// Middleware de validação de ID
const validateTemplateId = (req, res, next) => {
  const { templateId } = req.params;
  
  if (!templateId || templateId.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'ID do template é obrigatório'
    });
  }

  // Verificar se é um ObjectId válido
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  if (!objectIdPattern.test(templateId)) {
    return res.status(400).json({
      success: false,
      message: 'ID do template deve ser um ObjectId válido'
    });
  }

  next();
};

module.exports = {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateCloneTemplate,
  validateTestValidations,
  validateTemplateId,
  createTemplateSchema,
  updateTemplateSchema,
  cloneTemplateSchema,
  testValidationsSchema
}; 