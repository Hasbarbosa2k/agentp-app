const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now }
  }],
  passwordResetToken: String,
  passwordResetExpires: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedAt: Date,
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blockReason: String,
  // Profile fields
  displayName: {
    type: String,
    trim: true,
    maxlength: 100,
    default: function() {
      return this.username;
    }
  },
  team: {
    type: String,
    trim: true,
    maxlength: 50,
    default: 'default-team'
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  lastLoginAt: {
    type: Date
  },
  // User preferences
  preferences: {
    notifications: {
      testCompletion: {
        type: Boolean,
        default: true
      },
      systemAlerts: {
        type: Boolean,
        default: true
      },
      emailReports: {
        type: Boolean,
        default: false
      }
    },
    appearance: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'dark'
      },
      accentColor: {
        type: String,
        default: '#3b82f6'
      }
    },
    advanced: {
      debugMode: {
        type: Boolean,
        default: false
      },
      detailedLogs: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove expired refresh tokens
userSchema.methods.removeExpiredTokens = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  this.refreshTokens = this.refreshTokens.filter(
    tokenObj => tokenObj.createdAt > thirtyDaysAgo
  );
};

module.exports = mongoose.model('User', userSchema); 