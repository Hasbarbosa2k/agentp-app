const mongoose = require('mongoose');

const UiTestRunSchema = new mongoose.Schema(
  {
    testId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    displayName: {
      type: String,
      required: false,
      trim: true,
      default: null
    },
    description: {
      type: String,
      required: false,
      trim: true,
      default: null
    },
    relatedUiTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UiTest',
      default: null
    },
    systemSlug: {
      type: String,
      required: false,
      index: true,
      trim: true,
      default: null
    },
    testType: {
      type: String,
      enum: ['ui', 'os', 'performance', 'network', 'database', 'api'],
      default: 'ui'
    },
    steps: {
      type: [String],
      required: true,
      validate: v => Array.isArray(v) && v.length > 0
    },
    // Resultados de cada step (para testes SSH)
    stepResults: [{
      stepIndex: { type: Number, required: true },
      command: { type: String, required: true },
      status: { type: String, enum: ['pending', 'running', 'success', 'failed', 'skipped'], default: 'pending' },
      stdout: { type: String, default: '' },
      stderr: { type: String, default: '' },
      exitCode: { type: Number, default: null },
      durationMs: { type: Number, default: null },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null }
    }],
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      index: true
    },
    currentStep: { type: Number, default: 0 },
    recordVideo: { type: Boolean, default: true },
    videoSpeed: { type: Number, default: 2 },
    videoCrf: { type: Number, default: 28 },
    agentServiceUrl: { type: String, default: null },
    agentRequest: { type: mongoose.Schema.Types.Mixed, default: null },
    agentResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    artifacts: {
      videoUrl: { type: String, default: null },
      reportUrl: { type: String, default: null }
    }
  },
  { timestamps: true }
);

UiTestRunSchema.index({ createdAt: -1 });

module.exports = mongoose.model('UiTestRun', UiTestRunSchema);

