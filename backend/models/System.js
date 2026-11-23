const mongoose = require('mongoose');

const systemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  ip: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Validação básica de IP (IPv4)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(v);
      },
      message: 'IP deve estar no formato IPv4 válido (ex: 192.168.1.100)'
    }
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'unknown'],
    default: 'unknown'
  },
  os: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  owner: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  environment: {
    type: String,
    enum: ['production', 'staging', 'development', 'testing'],
    default: 'development'
  },
  uptime: {
    type: String,
    trim: true,
    maxlength: 50,
    default: 'Unknown'
  },
  lastTest: {
    type: Date,
    default: Date.now
  },
  lastTestStatus: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  // Estado do script/processos automatizados relacionados ao sistema
  scriptStatus: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed'],
    default: 'pending'
  },
  port: {
    type: Number,
    min: 1,
    max: 65535
  },
  protocol: {
    type: String,
    enum: ['http', 'https', 'ssh', 'ftp', 'other'],
    default: 'http'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  monitoringEnabled: {
    type: Boolean,
    default: true
  },
  alertsEnabled: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Slug único para identificação e criação de diretórios
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 1,
    maxlength: 50,
    validate: {
      validator: function(v) {
        // Slug deve conter apenas letras minúsculas, números e hífens
        // Não deve começar ou terminar com hífen
        const slugRegex = /^[a-z0-9]+([a-z0-9-]*[a-z0-9]+)*$/;
        return slugRegex.test(v);
      },
      message: 'Slug deve conter apenas letras minúsculas, números e hífens, sem começar ou terminar com hífen'
    }
  },
  
  // Campos relacionados ao onboarding
  onboardingStatus: {
    type: String,
    enum: ['not_started', 'pending', 'in_progress', 'completed', 'failed', 'cancelled'],
    default: 'not_started'
  },
  onboardingRequired: {
    type: Boolean,
    default: true
  },
  lastOnboardingAt: {
    type: Date,
    default: null
  },
  
  // Perfil analisado pela AI após onboarding completo
  aiAnalyzedProfile: {
    topProcesses: [{
      name: String,
      cpuUsage: String
    }],
    activeServices: [{
      name: String,
      status: String
    }],
    openPorts: [{
      port: String,
      protocol: String
    }],
    systemInfo: {
      kernel: String,
      architecture: String,
      loadAverage: String,
      loggedUsers: String
    },
    lastAnalyzedAt: {
      type: Date,
      default: null
    },
    aiMetadata: {
      model: String,
      tokensUsed: Number,
      onboardingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OnboardingProcess'
      }
    }
  },

  // Último snapshot de diagnósticos executados via SSH
  lastDiagnostics: {
    executedAt: { type: Date, default: null },
    results: [
      {
        command: { type: String },
        success: { type: Boolean },
        stdout: { type: String },
        stderr: { type: String },
        exitCode: { type: Number },
        durationMs: { type: Number }
      }
    ]
  },

  // Prometheus Node Exporter
  nodeExporter: {
    installed: {
      type: Boolean,
      default: false
    },
    port: {
      type: Number,
      default: 9100,
      min: 1,
      max: 65535
    },
    version: {
      type: String,
      default: null
    },
    installedAt: {
      type: Date,
      default: null
    },
    lastCheckedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['unknown', 'running', 'stopped', 'not_installed', 'error'],
      default: 'unknown'
    }
  },
  
  // Process Exporter - monitorização de processos específicos
  processExporter: {
    installed: {
      type: Boolean,
      default: false
    },
    port: {
      type: Number,
      default: 9256,
      min: 1,
      max: 65535
    },
    installedAt: {
      type: Date,
      default: null
    },
    lastCheckedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['unknown', 'running', 'stopped', 'not_installed', 'error'],
      default: 'unknown'
    },
    // Lista de processos monitorizados
    monitoredProcesses: [{
      type: String,
      trim: true
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para melhor performance
systemSchema.index({ name: 1 });
// Índice único apenas para sistemas activos (permite reutilizar IP/slug após soft delete)
systemSchema.index({ ip: 1 }, { 
  unique: true, 
  partialFilterExpression: { isActive: true } 
});
systemSchema.index({ slug: 1 }, { 
  unique: true, 
  partialFilterExpression: { isActive: true } 
});
systemSchema.index({ status: 1 });
systemSchema.index({ environment: 1 });
systemSchema.index({ owner: 1 });
systemSchema.index({ createdBy: 1 });
systemSchema.index({ isActive: 1 });

// Método para atualizar último teste
systemSchema.methods.updateLastTest = function(status = 'success') {
  this.lastTest = new Date();
  this.lastTestStatus = status;
  return this.save();
};

// Método virtual para status legível
systemSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    online: 'Online',
    offline: 'Offline',
    maintenance: 'Maintenance',
    unknown: 'Unknown'
  };
  return statusMap[this.status] || this.status;
});

// Método virtual para ambiente legível
systemSchema.virtual('environmentDisplay').get(function() {
  const envMap = {
    production: 'Production',
    staging: 'Staging',
    development: 'Development',
    testing: 'Testing'
  };
  return envMap[this.environment] || this.environment;
});

// Virtual para buscar processo de onboarding
systemSchema.virtual('onboardingProcess', {
  ref: 'OnboardingProcess',
  localField: '_id',
  foreignField: 'systemId',
  justOne: true
});

// Método para atualizar status do onboarding
systemSchema.methods.updateOnboardingStatus = function(status, completedAt = null) {
  this.onboardingStatus = status;
  if (completedAt || status === 'completed') {
    this.lastOnboardingAt = completedAt || new Date();
  }
  return this.save();
};

// Método para verificar se necessita onboarding
systemSchema.methods.needsOnboarding = function() {
  return this.onboardingRequired && ['not_started', 'failed'].includes(this.onboardingStatus);
};

// Método para atualizar perfil analisado pela AI
systemSchema.methods.updateAIAnalyzedProfile = function(analysisResult, metadata) {
  this.aiAnalyzedProfile = {
    ...analysisResult.profile,
    lastAnalyzedAt: new Date(),
    aiMetadata: {
      model: metadata.aiModel,
      tokensUsed: metadata.tokensUsed,
      onboardingId: metadata.onboardingId
    }
  };
  return this.save();
};

// Virtual para status de onboarding legível
systemSchema.virtual('onboardingStatusDisplay').get(function() {
  const statusMap = {
    'not_started': 'Not Started',
    'pending': 'Pending',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'failed': 'Failed',
    'cancelled': 'Cancelled'
  };
  return statusMap[this.onboardingStatus] || this.onboardingStatus;
});

module.exports = mongoose.model('System', systemSchema); 