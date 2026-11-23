const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  color: {
    type: String,
    default: '#3b82f6',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para melhor performance
groupSchema.index({ name: 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ members: 1 });

module.exports = mongoose.model('Group', groupSchema);
