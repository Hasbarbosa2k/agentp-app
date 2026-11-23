const mongoose = require('mongoose');

const UiTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: null,
      trim: true
    },
    objective: {
      type: String,
      default: null,
      trim: true
    },
    testType: {
      type: String,
      enum: ['ui', 'api', 'database', 'performance', 'os', 'network'],
      default: 'ui',
      index: true
    },
    systemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'System',
      default: null
    },
    systemSlug: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    url: {
      type: String,
      default: '',
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    extraDescription: {
      type: String,
      default: '',
      trim: true
    },
    steps: {
      type: [String],
      default: []
    },
    acceptanceCriteria: {
      type: [String],
      default: []
    },
    finalized: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'answered', 'failed'],
      default: 'pending',
      index: true
    },
    aiRequest: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    aiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    error: {
      type: String,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    respondedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

UiTestSchema.index({ systemSlug: 1, createdAt: -1 });

module.exports = mongoose.model('UiTest', UiTestSchema);

