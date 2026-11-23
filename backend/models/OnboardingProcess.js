const mongoose = require('mongoose');

const OnboardingStepSchema = new mongoose.Schema({
  step: {
    type: String,
    required: true,
    trim: true
  },
  command: {
    type: String,
    required: true,
    trim: true
  },
  output: {
    type: String,
    default: ''
  },
  // Output estruturado para facilitar parsing no frontend
  parsedOutput: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed', 'skipped'],
    default: 'pending'
  },
  error: {
    type: String,
    default: ''
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  duration: {
    type: Number, // em milissegundos
    default: 0
  },
  retryCount: {
    type: Number,
    default: 0
  },
  // Detalhes de execução
  executionDetails: {
    exitCode: {
      type: Number,
      default: null
    },
    signal: {
      type: String,
      default: null
    },
    timeout: {
      type: Boolean,
      default: false
    },
    commandSize: {
      type: Number, // tamanho do comando em caracteres
      default: 0
    },
    outputSize: {
      type: Number, // tamanho do output em caracteres
      default: 0
    }
  },
  // Logs específicos do passo
  stepLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'debug'],
      default: 'info'
    },
    message: {
      type: String,
      required: true
    }
  }]
}, {
  _id: false // Não criar _id para sub-documentos
});

const OSInfoSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  version: {
    type: String,
    trim: true
  },
  like: {
    type: String,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  prettyName: {
    type: String,
    trim: true
  },
  versionCodename: {
    type: String,
    trim: true
  },
  architecture: {
    type: String,
    trim: true
  },
  kernel: {
    type: String,
    trim: true
  }
}, {
  _id: false
});

const OnboardingProcessSchema = new mongoose.Schema({
  systemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'System',
    required: true,
    unique: true // Cada sistema só pode ter um processo de onboarding
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  osInfo: {
    type: OSInfoSchema,
    default: {}
  },
  steps: [OnboardingStepSchema],
  
  // Estatísticas do processo
  totalSteps: {
    type: Number,
    default: 0
  },
  completedSteps: {
    type: Number,
    default: 0
  },
  failedSteps: {
    type: Number,
    default: 0
  },
  skippedSteps: {
    type: Number,
    default: 0
  },
  
  // Passo atual em execução
  currentStep: {
    index: {
      type: Number,
      default: -1
    },
    name: {
      type: String,
      default: ''
    },
    startedAt: {
      type: Date,
      default: null
    }
  },
  
  // Metadados
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Template usado (se aplicável)
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingTemplate',
    default: null
  },
  templateName: {
    type: String,
    trim: true,
    default: null
  },
  templateVersion: {
    type: String,
    trim: true,
    default: null
  },
  
  // Configurações do onboarding
  config: {
    autoRetry: {
      type: Boolean,
      default: true
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    timeoutSeconds: {
      type: Number,
      default: 300 // 5 minutos
    }
  },
  
  // Logs e notas
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'debug'],
      default: 'info'
    },
    message: {
      type: String,
      required: true
    },
    source: {
      type: String,
      default: 'system'
    },
    stepIndex: {
      type: Number,
      default: -1 // -1 significa log geral, >= 0 é específico do passo
    }
  }],
  
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Dados de rede/conectividade
  networkInfo: {
    connectivity: {
      type: Boolean,
      default: false
    },
    responseTime: {
      type: Number, // em ms
      default: null
    },
    lastPingAt: {
      type: Date,
      default: null
    }
  },
  
  // Estatísticas de execução
  executionStats: {
    totalDuration: {
      type: Number, // em milissegundos
      default: 0
    },
    averageStepDuration: {
      type: Number, // em milissegundos
      default: 0
    },
    totalOutputSize: {
      type: Number, // em bytes
      default: 0
    },
    totalRetries: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para calcular progresso
OnboardingProcessSchema.virtual('progress').get(function() {
  if (this.totalSteps === 0) return 0;
  return Math.round((this.completedSteps / this.totalSteps) * 100);
});

// Virtual para calcular duração total
OnboardingProcessSchema.virtual('totalDuration').get(function() {
  if (!this.startedAt) return 0;
  const endTime = this.completedAt || new Date();
  return endTime.getTime() - this.startedAt.getTime();
});

// Virtual para status detalhado
OnboardingProcessSchema.virtual('detailedStatus').get(function() {
  const status = {
    overall: this.status,
    progress: this.progress,
    steps: {
      total: this.totalSteps,
      completed: this.completedSteps,
      failed: this.failedSteps,
      pending: this.totalSteps - this.completedSteps - this.failedSteps
    },
    duration: this.totalDuration,
    lastActivity: this.updatedAt
  };
  
  return status;
});

// Middleware para atualizar estatísticas antes de salvar
OnboardingProcessSchema.pre('save', function(next) {
  // Calcular estatísticas dos passos
  this.totalSteps = this.steps.length;
  this.completedSteps = this.steps.filter(step => step.status === 'success').length;
  this.failedSteps = this.steps.filter(step => step.status === 'failed').length;
  this.skippedSteps = this.steps.filter(step => step.status === 'skipped').length;
  
  // Calcular estatísticas de execução
  if (this.steps.length > 0) {
    const completedSteps = this.steps.filter(step => step.duration > 0);
    const totalDuration = completedSteps.reduce((sum, step) => sum + step.duration, 0);
    this.executionStats.totalDuration = totalDuration;
    this.executionStats.averageStepDuration = completedSteps.length > 0 ? totalDuration / completedSteps.length : 0;
    this.executionStats.totalOutputSize = this.steps.reduce((sum, step) => sum + (step.executionDetails.outputSize || 0), 0);
    this.executionStats.totalRetries = this.steps.reduce((sum, step) => sum + step.retryCount, 0);
  }
  
  // Atualizar status geral baseado nos passos
  // NOTA: Não alterar automaticamente para 'completed' - isso deve ser feito explicitamente
  if (this.totalSteps === 0 && this.status !== 'in_progress') {
    this.status = 'pending';
  } else if (this.failedSteps > 0 && this.status !== 'cancelled' && this.status !== 'completed') {
    // Só marcar como failed se não foi explicitamente completado
    this.status = 'failed';
  } else if (this.completedSteps > 0 && this.status === 'pending') {
    // Apenas mudar de pending para in_progress automaticamente
    this.status = 'in_progress';
  }
  // Manter status 'in_progress', 'completed', ou outros que foram definidos explicitamente
  
  next();
});

// Método para adicionar log
OnboardingProcessSchema.methods.addLog = function(level, message, source = 'system', stepIndex = -1) {
  this.logs.push({
    level,
    message,
    source,
    stepIndex,
    timestamp: new Date()
  });
  
  const stepInfo = stepIndex >= 0 ? ` [Step ${stepIndex + 1}]` : '';
  console.log(`[ONBOARDING ${this.systemId}]${stepInfo} [${level.toUpperCase()}] ${message}`);
};

// Método para adicionar log específico do passo
OnboardingProcessSchema.methods.addStepLog = function(stepIndex, level, message) {
  if (stepIndex < 0 || stepIndex >= this.steps.length) {
    throw new Error('Índice de passo inválido');
  }
  
  const step = this.steps[stepIndex];
  step.stepLogs.push({
    level,
    message,
    timestamp: new Date()
  });
  
  // Também adicionar no log geral
  this.addLog(level, message, 'step', stepIndex);
};

// Método para adicionar passo
OnboardingProcessSchema.methods.addStep = function(stepData) {
  const step = {
    step: stepData.step,
    command: stepData.command,
    status: 'pending',
    executionDetails: {
      exitCode: null,
      signal: null,
      timeout: false,
      commandSize: stepData.command.length,
      outputSize: 0
    },
    stepLogs: [],
    ...stepData
  };
  
  this.steps.push(step);
  this.addLog('info', `Passo adicionado: ${step.step}`, 'system', this.steps.length - 1);
  
  return this.steps[this.steps.length - 1];
};

// Método para atualizar passo
OnboardingProcessSchema.methods.updateStep = function(stepIndex, updateData) {
  if (stepIndex < 0 || stepIndex >= this.steps.length) {
    throw new Error('Índice de passo inválido');
  }
  
  const step = this.steps[stepIndex];
  Object.assign(step, updateData);
  
  // Calcular duração se ambas as datas existirem
  if (step.startedAt && step.endedAt) {
    step.duration = step.endedAt.getTime() - step.startedAt.getTime();
  }
  
  this.addLog('info', `Passo atualizado: ${step.step} - Status: ${step.status}`, 'system', stepIndex);
  
  return step;
};

// Método para marcar passo como iniciado
OnboardingProcessSchema.methods.startStep = function(stepIndex) {
  if (stepIndex < 0 || stepIndex >= this.steps.length) {
    throw new Error('Índice de passo inválido');
  }
  
  const startedAt = new Date();
  
  // Atualizar passo atual
  this.currentStep = {
    index: stepIndex,
    name: this.steps[stepIndex].step,
    startedAt: startedAt
  };
  
  const step = this.updateStep(stepIndex, {
    status: 'running',
    startedAt: startedAt
  });
  
  // Calcular tamanho do comando
  step.executionDetails.commandSize = step.command.length;
  
  this.addStepLog(stepIndex, 'info', `Iniciando execução do passo: ${step.step}`);
  
  return step;
};

// Método para marcar passo como concluído
OnboardingProcessSchema.methods.completeStep = function(stepIndex, output, error = null, executionDetails = {}) {
  if (stepIndex < 0 || stepIndex >= this.steps.length) {
    throw new Error('Índice de passo inválido');
  }
  
  const endedAt = new Date();
  const status = error ? 'failed' : 'success';
  const outputStr = output || '';
  
  const step = this.updateStep(stepIndex, {
    status,
    output: outputStr,
    error: error || '',
    endedAt
  });
  
  // Atualizar detalhes de execução
  step.executionDetails = {
    ...step.executionDetails,
    outputSize: outputStr.length,
    exitCode: executionDetails.exitCode || (error ? 1 : 0),
    signal: executionDetails.signal || null,
    timeout: executionDetails.timeout || false
  };
  
  // Tentar parsear output para formato estruturado
  try {
    if (outputStr.trim().startsWith('{') || outputStr.trim().startsWith('[')) {
      step.parsedOutput = JSON.parse(outputStr);
    } else {
      // Para outputs de comandos do sistema, criar estrutura básica
      step.parsedOutput = {
        rawOutput: outputStr,
        lines: outputStr.split('\n').filter(line => line.trim()),
        lineCount: outputStr.split('\n').length,
        isEmpty: !outputStr.trim()
      };
    }
  } catch (parseError) {
    // Se não conseguir parsear, manter output como texto
    step.parsedOutput = {
      rawOutput: outputStr,
      parseError: parseError.message
    };
  }
  
  // Limpar passo atual se foi este que terminou
  if (this.currentStep.index === stepIndex) {
    this.currentStep = {
      index: -1,
      name: '',
      startedAt: null
    };
  }
  
  if (error) {
    this.addStepLog(stepIndex, 'error', `Passo falhou: ${error}`);
  } else {
    this.addStepLog(stepIndex, 'info', `Passo concluído com sucesso`);
  }
  
  return step;
};

// Índices para melhor performance
OnboardingProcessSchema.index({ systemId: 1 }, { unique: true });
OnboardingProcessSchema.index({ status: 1 });
OnboardingProcessSchema.index({ startedAt: -1 });
OnboardingProcessSchema.index({ initiatedBy: 1 });

module.exports = mongoose.model('OnboardingProcess', OnboardingProcessSchema); 