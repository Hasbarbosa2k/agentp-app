const mongoose = require('mongoose');

// Schema para validações de output
const ValidationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['string_contains', 'string_not_contains', 'regex_match', 'numeric_range', 'exists', 'not_exists', 'output_contains'],
    default: 'string_contains'
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  // Para validações numéricas
  minValue: {
    type: Number,
    default: null
  },
  maxValue: {
    type: Number,
    default: null
  },
  // Para regex
  flags: {
    type: String,
    default: 'i' // case insensitive por padrão
  },
  // Descrição da validação
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  // Se a validação é obrigatória para sucesso do passo
  required: {
    type: Boolean,
    default: true
  }
}, {
  _id: false
});

// Schema para passos do template
const TemplateStepSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300
  },
  command: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  // Validações que devem ser aplicadas ao output
  validations: [ValidationSchema],
  
  // Configurações do passo
  timeout: {
    type: Number,
    default: 30000, // 30 segundos
    min: 1000,
    max: 300000 // máx 5 minutos
  },
  retryable: {
    type: Boolean,
    default: true
  },
  required: {
    type: Boolean,
    default: true
  },
  continueOnFailure: {
    type: Boolean,
    default: false
  },
  
  // Ordem de execução
  order: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Categoria para organização
  category: {
    type: String,
    enum: ['system', 'security', 'network', 'services', 'custom'],
    default: 'custom'
  },
  
  // Comandos específicos por OS (opcional)
  osSpecificCommands: {
    ubuntu: String,
    debian: String,
    centos: String,
    rhel: String,
    fedora: String,
    windows: String
  }
}, {
  _id: false
});

// Schema principal do template
const OnboardingTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  version: {
    type: String,
    default: '1.0.0',
    trim: true
  },
  
  // Metadados
  category: {
    type: String,
    enum: ['system_discovery', 'security_audit', 'performance_check', 'service_discovery', 'custom'],
    default: 'custom'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  
  // Autor e permissões
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Status do template
  status: {
    type: String,
    enum: ['draft', 'active', 'deprecated', 'archived'],
    default: 'draft'
  },
  
  // Sistemas operativos suportados (opcional)
  supportedOS: [{
    type: String,
    enum: ['ubuntu', 'debian', 'centos', 'rhel', 'fedora', 'windows', 'any'],
    default: ['any']
  }],
  
  // Passos do template
  steps: [TemplateStepSchema],
  
  // Configurações globais
  config: {
    // Parar execução no primeiro erro
    stopOnFirstError: {
      type: Boolean,
      default: false
    },
    // Executar passos em paralelo quando possível
    allowParallelExecution: {
      type: Boolean,
      default: false
    },
    // Timeout global (em segundos)
    globalTimeout: {
      type: Number,
      default: 600, // 10 minutos
      min: 60,
      max: 3600 // máx 1 hora
    },
    // Número máximo de retries
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10
    }
  },
  
  // Estatísticas de uso
  usage: {
    timesUsed: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: null
    },
    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageDuration: {
      type: Number, // em milissegundos
      default: 0
    }
  },
  
  // Template original (se for uma cópia/fork)
  baseTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingTemplate',
    default: null
  },
  
  // Changelog
  changelog: [{
    version: String,
    changes: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para calcular número total de passos
OnboardingTemplateSchema.virtual('totalSteps').get(function() {
  return this.steps.length;
});

// Virtual para calcular número de validações
OnboardingTemplateSchema.virtual('totalValidations').get(function() {
  return this.steps.reduce((total, step) => total + step.validations.length, 0);
});

// Virtual para verificar se template está pronto para uso
OnboardingTemplateSchema.virtual('isReady').get(function() {
  return this.status === 'active' && 
         this.steps.length > 0 && 
         this.steps.every(step => step.command && step.command.trim());
});

// Middleware para ordenar passos antes de salvar
OnboardingTemplateSchema.pre('save', function(next) {
  // Ordenar passos por ordem
  this.steps.sort((a, b) => a.order - b.order);
  
  // Validar se ordens são únicas
  const orders = this.steps.map(step => step.order);
  const uniqueOrders = [...new Set(orders)];
  if (orders.length !== uniqueOrders.length) {
    return next(new Error('Ordens dos passos devem ser únicas'));
  }
  
  // Atualizar lastModifiedBy se não foi definido
  if (this.isModified() && !this.lastModifiedBy) {
    this.lastModifiedBy = this.createdBy;
  }
  
  next();
});

// Método para validar output de um passo
OnboardingTemplateSchema.methods.validateStepOutput = function(stepIndex, output) {
  if (stepIndex < 0 || stepIndex >= this.steps.length) {
    throw new Error('Índice de passo inválido');
  }
  
  const step = this.steps[stepIndex];
  const results = {
    stepName: step.name,
    totalValidations: step.validations.length,
    passedValidations: 0,
    failedValidations: 0,
    validationResults: [],
    overallSuccess: true
  };
  
  for (const validation of step.validations) {
    const result = this.executeValidation(validation, output);
    results.validationResults.push(result);
    
    if (result.success) {
      results.passedValidations++;
    } else {
      results.failedValidations++;
      if (validation.required) {
        results.overallSuccess = false;
      }
    }
  }
  
  return results;
};

// Método para executar uma validação específica
OnboardingTemplateSchema.methods.executeValidation = function(validation, output) {
  const result = {
    type: validation.type,
    value: validation.value,
    description: validation.description,
    required: validation.required,
    success: false,
    details: ''
  };
  
  try {
    switch (validation.type) {
      case 'string_contains':
        result.success = output.includes(validation.value);
        result.details = result.success ? 
          `String "${validation.value}" encontrada no output` :
          `String "${validation.value}" não encontrada no output`;
        break;
        
      case 'string_not_contains':
        result.success = !output.includes(validation.value);
        result.details = result.success ? 
          `String "${validation.value}" não está presente (como esperado)` :
          `String "${validation.value}" foi encontrada (não deveria estar)`;
        break;
        
      case 'regex_match':
        const regex = new RegExp(validation.value, validation.flags || 'i');
        result.success = regex.test(output);
        result.details = result.success ? 
          `Regex /${validation.value}/${validation.flags} encontrou match` :
          `Regex /${validation.value}/${validation.flags} não encontrou match`;
        break;
        
      case 'numeric_range':
        const numbers = output.match(/\d+(\.\d+)?/g);
        if (numbers && numbers.length > 0) {
          const value = parseFloat(numbers[0]);
          const min = validation.minValue !== null ? validation.minValue : -Infinity;
          const max = validation.maxValue !== null ? validation.maxValue : Infinity;
          result.success = value >= min && value <= max;
          result.details = result.success ? 
            `Valor ${value} está no range [${min}, ${max}]` :
            `Valor ${value} fora do range [${min}, ${max}]`;
        } else {
          result.success = false;
          result.details = 'Nenhum número encontrado no output';
        }
        break;
        
      case 'exists':
        result.success = output.trim().length > 0;
        result.details = result.success ? 
          'Output contém dados' : 
          'Output está vazio';
        break;
        
      case 'not_exists':
        result.success = output.trim().length === 0;
        result.details = result.success ? 
          'Output está vazio (como esperado)' : 
          'Output contém dados (não deveria)';
        break;
        
      case 'output_contains':
        result.success = output.includes(validation.value);
        result.details = result.success ? 
          `Texto "${validation.value}" encontrado no output - Step SUCCESS` :
          `Texto "${validation.value}" não encontrado no output - Step FAILED`;
        break;
        
      default:
        result.success = false;
        result.details = `Tipo de validação desconhecido: ${validation.type}`;
    }
  } catch (error) {
    result.success = false;
    result.details = `Erro na validação: ${error.message}`;
  }
  
  return result;
};

// Método para clonar template
OnboardingTemplateSchema.methods.clone = function(newName, userId) {
  const clonedTemplate = new this.constructor({
    name: newName,
    description: `Cópia de: ${this.description}`,
    category: this.category,
    tags: [...this.tags],
    createdBy: userId,
    supportedOS: [...this.supportedOS],
    steps: this.steps.map(step => ({
      ...step.toObject(),
      validations: step.validations.map(val => val.toObject())
    })),
    config: { ...this.config.toObject() },
    baseTemplate: this._id
  });
  
  return clonedTemplate;
};

// Método para atualizar estatísticas de uso
OnboardingTemplateSchema.methods.updateUsageStats = function(success, duration) {
  this.usage.timesUsed++;
  this.usage.lastUsed = new Date();
  
  if (this.usage.timesUsed === 1) {
    this.usage.successRate = success ? 100 : 0;
    this.usage.averageDuration = duration;
  } else {
    // Calcular nova taxa de sucesso
    const currentSuccesses = Math.round((this.usage.successRate / 100) * (this.usage.timesUsed - 1));
    const newSuccesses = currentSuccesses + (success ? 1 : 0);
    this.usage.successRate = Math.round((newSuccesses / this.usage.timesUsed) * 100);
    
    // Calcular nova duração média
    this.usage.averageDuration = Math.round(
      ((this.usage.averageDuration * (this.usage.timesUsed - 1)) + duration) / this.usage.timesUsed
    );
  }
};

// Índices para performance
OnboardingTemplateSchema.index({ name: 1 }, { unique: true });
OnboardingTemplateSchema.index({ status: 1 });
OnboardingTemplateSchema.index({ category: 1 });
OnboardingTemplateSchema.index({ createdBy: 1 });
OnboardingTemplateSchema.index({ tags: 1 });
OnboardingTemplateSchema.index({ 'usage.timesUsed': -1 });
OnboardingTemplateSchema.index({ 'usage.successRate': -1 });

module.exports = mongoose.model('OnboardingTemplate', OnboardingTemplateSchema);