const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Database settings
  database: {
    backupFrequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    autoCleanupOldTests: {
      type: Boolean,
      default: true
    },
    retentionPeriodDays: {
      type: Number,
      default: 90,
      min: 1,
      max: 365
    }
  },
  
  // Security settings
  security: {
    sessionTimeoutMinutes: {
      type: Number,
      default: 1440, // 24 hours
      min: 5,
      max: 10080 // 1 week
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      min: 3,
      max: 10
    },
    lockoutDurationMinutes: {
      type: Number,
      default: 15,
      min: 5,
      max: 1440
    },
    requirePasswordChange: {
      type: Boolean,
      default: false
    },
    passwordChangeDays: {
      type: Number,
      default: 90,
      min: 30,
      max: 365
    }
  },
  
  // System settings
  system: {
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    maintenanceMessage: {
      type: String,
      maxlength: 500,
      default: 'Sistema em manutenção. Tente novamente mais tarde.'
    },
    maxUsersAllowed: {
      type: Number,
      default: 1000,
      min: 1
    },
    allowUserRegistration: {
      type: Boolean,
      default: true
    }
  },
  
  // Notification settings
  notifications: {
    emailEnabled: {
      type: Boolean,
      default: true
    },
    smtpHost: {
      type: String,
      default: 'smtp.gmail.com'
    },
    smtpPort: {
      type: Number,
      default: 587
    },
    emailFrom: {
      type: String,
      default: 'noreply@agentp.com'
    },
    alertThresholds: {
      systemOfflineMinutes: {
        type: Number,
        default: 5
      },
      diskUsagePercentage: {
        type: Number,
        default: 85
      },
      memoryUsagePercentage: {
        type: Number,
        default: 90
      }
    }
  },
  
  // Monitoring settings
  monitoring: {
    enabled: {
      type: Boolean,
      default: true
    },
    checkIntervalMinutes: {
      type: Number,
      default: 5,
      min: 1,
      max: 60
    },
    logLevel: {
      type: String,
      enum: ['error', 'warn', 'info', 'debug'],
      default: 'info'
    },
    retainLogsDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365
    }
  },
  
  // Version and metadata
  version: {
    type: String,
    default: '1.0.0'
  },
  lastBackup: {
    type: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.index({}, { unique: true });

// Pre-save middleware to update lastUpdated
settingsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Static method to get or create settings
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this();
    await settings.save();
  }
  return settings;
};

// Method to export settings as JSON
settingsSchema.methods.exportSettings = function() {
  const settingsObj = this.toObject();
  delete settingsObj._id;
  delete settingsObj.__v;
  delete settingsObj.createdAt;
  delete settingsObj.updatedAt;
  delete settingsObj.lastUpdated;
  delete settingsObj.updatedBy;
  return settingsObj;
};

module.exports = mongoose.model('Settings', settingsSchema); 