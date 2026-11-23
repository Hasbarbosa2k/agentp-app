const mongoose = require('mongoose');

const IssueMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    systemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'System',
      required: true
    },
    subject: {
      type: String,
      trim: true,
      default: null
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'answered', 'failed'],
      default: 'pending',
      index: true
    },
    aiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    aiMeta: {
      provider: { type: String, default: null },
      model: { type: String, default: null },
      tokensInput: { type: Number, default: 0 },
      tokensOutput: { type: Number, default: 0 },
      cost: { type: Number, default: 0 }
    },
    respondedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

IssueMessageSchema.index({ userId: 1, createdAt: -1 });
IssueMessageSchema.index({ systemId: 1, createdAt: -1 });

module.exports = mongoose.model('IssueMessage', IssueMessageSchema);

