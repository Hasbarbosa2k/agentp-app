const mongoose = require('mongoose');

const documentReportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  systemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'System',
    required: true
  },
  systemName: {
    type: String,
    required: true,
    trim: true
  },
  testRunIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UiTestRun'
  }],
  testDescription: {
    type: String,
    required: true
  },
  additionalContext: {
    type: String,
    default: ''
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pdfPath: {
    type: String,
    default: ''
  },
  pdfSize: {
    type: Number, // in bytes
    default: 0
  },
  htmlContent: {
    type: String,
    default: ''
  },
  metadata: {
    generatedAt: {
      type: Date,
      default: Date.now
    },
    testType: {
      type: String,
      default: 'Mixed'
    },
    author: {
      type: String,
      default: 'AgentP AI System'
    }
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  error: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
documentReportSchema.index({ systemId: 1, createdAt: -1 });
documentReportSchema.index({ generatedBy: 1, createdAt: -1 });
documentReportSchema.index({ status: 1 });

// Method to get summary information
documentReportSchema.methods.toSummary = function() {
  return {
    id: this._id,
    title: this.title,
    systemName: this.systemName,
    systemId: this.systemId,
    testRunCount: this.testRunIds?.length || 0,
    pdfSize: this.pdfSize,
    status: this.status,
    generatedAt: this.metadata.generatedAt,
    createdAt: this.createdAt,
    generatedBy: this.generatedBy
  };
};

const DocumentReport = mongoose.model('DocumentReport', documentReportSchema);

module.exports = DocumentReport;
