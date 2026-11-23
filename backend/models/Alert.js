const mongoose = require('mongoose');

/**
 * Modelo para alarmes Prometheus
 * Representa uma regra de alerta que será sincronizada com o Prometheus
 */
const alertSchema = new mongoose.Schema({
  // Sistema associado
  systemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'System',
    required: true
  },

  // Identificador único do alerta (usado no Prometheus)
  alertName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    validate: {
      validator: function(v) {
        // Nome válido para Prometheus (alphanumeric + underscore)
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v);
      },
      message: 'Nome do alerta deve começar com letra ou underscore e conter apenas letras, números e underscores'
    }
  },

  // Descrição legível do alerta
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },

  // Expressão PromQL
  expr: {
    type: String,
    required: true,
    trim: true
  },

  // Duração antes de disparar (ex: "2m", "5m", "1h")
  forDuration: {
    type: String,
    default: '5m',
    validate: {
      validator: function(v) {
        return /^\d+[smh]$/.test(v);
      },
      message: 'Duração deve estar no formato: número + s/m/h (ex: 5m, 30s, 1h)'
    }
  },

  // Severidade
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },

  // Labels adicionais para o alerta
  labels: {
    type: Map,
    of: String,
    default: new Map()
  },

  // Annotations (summary, description, runbook_url, etc.)
  annotations: {
    summary: { type: String, trim: true },
    description: { type: String, trim: true },
    runbook_url: { type: String, trim: true }
  },

  // Estado do alerta
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'active', 'disabled', 'error'],
    default: 'draft'
  },

  // Se está habilitado (sincronizado com Prometheus)
  enabled: {
    type: Boolean,
    default: false
  },

  // Prompt original do utilizador (se gerado por AI)
  originalPrompt: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // YAML gerado (preview)
  generatedYaml: {
    type: String,
    trim: true
  },

  // Metadados da geração AI
  aiMetadata: {
    model: { type: String },
    generatedAt: { type: Date },
    tokensUsed: { type: Number },
    confidence: { type: Number, min: 0, max: 1 }
  },

  // Histórico de alterações
  history: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'enabled', 'disabled', 'approved', 'rejected', 'synced', 'error']
    },
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    details: { type: String }
  }],

  // Última sincronização com Prometheus
  lastSyncAt: {
    type: Date,
    default: null
  },

  lastSyncStatus: {
    type: String,
    enum: ['success', 'failed', 'pending', null],
    default: null
  },

  lastSyncError: {
    type: String,
    default: null
  },

  // Criado por
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Atualizado por
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
alertSchema.index({ systemId: 1 });
alertSchema.index({ alertName: 1, systemId: 1 }, { unique: true });
alertSchema.index({ status: 1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ enabled: 1 });
alertSchema.index({ createdBy: 1 });

// Virtual para nome completo do alerta (incluindo sistema)
alertSchema.virtual('fullAlertName').get(function() {
  return `${this.alertName}`;
});

// Método para gerar YAML do alerta
alertSchema.methods.toPrometheusRule = function() {
  const labels = { severity: this.severity };
  
  // Adicionar labels customizados
  if (this.labels) {
    for (const [key, value] of this.labels) {
      labels[key] = value;
    }
  }

  const rule = {
    alert: this.alertName,
    expr: this.expr,
    for: this.forDuration,
    labels,
    annotations: {
      summary: this.annotations?.summary || this.description,
      description: this.annotations?.description || this.description
    }
  };

  if (this.annotations?.runbook_url) {
    rule.annotations.runbook_url = this.annotations.runbook_url;
  }

  return rule;
};

// Método para adicionar entrada ao histórico
alertSchema.methods.addHistory = function(action, userId, details = null) {
  this.history.push({
    action,
    timestamp: new Date(),
    userId,
    details
  });
};

// Método para aprovar alerta
alertSchema.methods.approve = async function(userId) {
  this.status = 'active';
  this.enabled = true;
  this.addHistory('approved', userId, 'Alerta aprovado e activado');
  return this.save();
};

// Método para rejeitar alerta
alertSchema.methods.reject = async function(userId, reason = null) {
  this.status = 'draft';
  this.addHistory('rejected', userId, reason || 'Alerta rejeitado');
  return this.save();
};

// Método para desabilitar alerta
alertSchema.methods.disable = async function(userId) {
  this.enabled = false;
  this.status = 'disabled';
  this.addHistory('disabled', userId, 'Alerta desabilitado');
  return this.save();
};

// Método para marcar sincronização
alertSchema.methods.markSynced = async function(success, error = null) {
  this.lastSyncAt = new Date();
  this.lastSyncStatus = success ? 'success' : 'failed';
  this.lastSyncError = error;
  
  if (success) {
    this.addHistory('synced', null, 'Sincronizado com Prometheus');
  } else {
    this.addHistory('error', null, `Erro na sincronização: ${error}`);
    this.status = 'error';
  }
  
  return this.save();
};

// Virtual para severidade legível
alertSchema.virtual('severityDisplay').get(function() {
  const severityMap = {
    info: 'Info',
    warning: 'Warning',
    critical: 'Critical'
  };
  return severityMap[this.severity] || this.severity;
});

// Virtual para status legível
alertSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    draft: '📝 Rascunho',
    pending_approval: '⏳ Aguarda Aprovação',
    active: '✅ Activo',
    disabled: '⏸️ Desabilitado',
    error: '❌ Erro'
  };
  return statusMap[this.status] || this.status;
});

module.exports = mongoose.model('Alert', alertSchema);

