const Settings = require('../models/Settings');

// Get all settings
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      message: 'Configurações obtidas com sucesso',
      data: {
        settings: settings.toObject()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Update database settings
const updateDatabaseSettings = async (req, res) => {
  try {
    const { backupFrequency, autoCleanupOldTests, retentionPeriodDays } = req.body;
    
    const settings = await Settings.getSettings();
    
    // Build update object
    if (backupFrequency !== undefined) {
      settings.database.backupFrequency = backupFrequency;
    }
    if (autoCleanupOldTests !== undefined) {
      settings.database.autoCleanupOldTests = autoCleanupOldTests;
    }
    if (retentionPeriodDays !== undefined) {
      settings.database.retentionPeriodDays = retentionPeriodDays;
    }
    
    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({
      success: true,
      message: 'Configurações de base de dados atualizadas com sucesso',
      data: {
        database: settings.database
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Update appearance settings (global theme defaults)
const updateAppearanceSettings = async (req, res) => {
  try {
    const { defaultTheme, defaultAccentColor, allowUserCustomization } = req.body;
    
    const settings = await Settings.getSettings();
    
    // Add appearance settings to system settings if not exists
    if (!settings.system.appearance) {
      settings.system.appearance = {};
    }
    
    if (defaultTheme !== undefined) {
      settings.system.appearance.defaultTheme = defaultTheme;
    }
    if (defaultAccentColor !== undefined) {
      settings.system.appearance.defaultAccentColor = defaultAccentColor;
    }
    if (allowUserCustomization !== undefined) {
      settings.system.appearance.allowUserCustomization = allowUserCustomization;
    }
    
    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({
      success: true,
      message: 'Configurações de aparência atualizadas com sucesso',
      data: {
        appearance: settings.system.appearance
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Update advanced settings
const updateAdvancedSettings = async (req, res) => {
  try {
    const { 
      logLevel, 
      retainLogsDays, 
      debugModeGlobal, 
      maintenanceMode, 
      maintenanceMessage 
    } = req.body;
    
    const settings = await Settings.getSettings();
    
    // Update monitoring settings
    if (logLevel !== undefined) {
      settings.monitoring.logLevel = logLevel;
    }
    if (retainLogsDays !== undefined) {
      settings.monitoring.retainLogsDays = retainLogsDays;
    }
    
    // Update system settings
    if (debugModeGlobal !== undefined) {
      if (!settings.system.advanced) {
        settings.system.advanced = {};
      }
      settings.system.advanced.debugModeGlobal = debugModeGlobal;
    }
    if (maintenanceMode !== undefined) {
      settings.system.maintenanceMode = maintenanceMode;
    }
    if (maintenanceMessage !== undefined) {
      settings.system.maintenanceMessage = maintenanceMessage;
    }
    
    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({
      success: true,
      message: 'Configurações avançadas atualizadas com sucesso',
      data: {
        monitoring: {
          logLevel: settings.monitoring.logLevel,
          retainLogsDays: settings.monitoring.retainLogsDays
        },
        system: {
          advanced: settings.system.advanced,
          maintenanceMode: settings.system.maintenanceMode,
          maintenanceMessage: settings.system.maintenanceMessage
        }
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Export settings
const exportSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const exportData = settings.exportSettings();
    
    // Add metadata
    exportData.exportedAt = new Date().toISOString();
    exportData.exportedBy = req.user.username;
    exportData.version = settings.version;

    res.json({
      success: true,
      message: 'Configurações exportadas com sucesso',
      data: {
        settings: exportData,
        filename: `agentp-settings-${new Date().toISOString().split('T')[0]}.json`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Import settings
const importSettings = async (req, res) => {
  try {
    const { settingsData, overwriteExisting = false } = req.body;
    
    if (!settingsData) {
      return res.status(400).json({
        success: false,
        message: 'Dados de configuração são obrigatórios'
      });
    }
    
    const currentSettings = await Settings.getSettings();
    
    // Validate imported data structure
    const allowedSections = ['database', 'security', 'system', 'notifications', 'monitoring'];
    const sectionsToUpdate = {};
    
    for (const section of allowedSections) {
      if (settingsData[section]) {
        sectionsToUpdate[section] = settingsData[section];
      }
    }
    
    if (Object.keys(sectionsToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma secção válida encontrada nos dados de importação'
      });
    }
    
    // Update settings
    if (overwriteExisting) {
      // Replace entire sections
      Object.assign(currentSettings, sectionsToUpdate);
    } else {
      // Merge with existing settings
      for (const [section, data] of Object.entries(sectionsToUpdate)) {
        if (currentSettings[section]) {
          Object.assign(currentSettings[section], data);
        } else {
          currentSettings[section] = data;
        }
      }
    }
    
    currentSettings.updatedBy = req.user._id;
    await currentSettings.save();

    res.json({
      success: true,
      message: `Configurações importadas com sucesso. ${Object.keys(sectionsToUpdate).length} secções atualizadas.`,
      data: {
        importedSections: Object.keys(sectionsToUpdate),
        settings: currentSettings.toObject()
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados de configuração inválidos',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Update security settings
const updateSecuritySettings = async (req, res) => {
  try {
    const {
      sessionTimeoutMinutes,
      maxLoginAttempts,
      lockoutDurationMinutes,
      requirePasswordChange,
      passwordChangeDays
    } = req.body;
    
    const settings = await Settings.getSettings();
    
    if (sessionTimeoutMinutes !== undefined) {
      settings.security.sessionTimeoutMinutes = sessionTimeoutMinutes;
    }
    if (maxLoginAttempts !== undefined) {
      settings.security.maxLoginAttempts = maxLoginAttempts;
    }
    if (lockoutDurationMinutes !== undefined) {
      settings.security.lockoutDurationMinutes = lockoutDurationMinutes;
    }
    if (requirePasswordChange !== undefined) {
      settings.security.requirePasswordChange = requirePasswordChange;
    }
    if (passwordChangeDays !== undefined) {
      settings.security.passwordChangeDays = passwordChangeDays;
    }
    
    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({
      success: true,
      message: 'Configurações de segurança atualizadas com sucesso',
      data: {
        security: settings.security
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Get settings summary/overview
const getSettingsSummary = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    const summary = {
      database: {
        backupFrequency: settings.database.backupFrequency,
        autoCleanup: settings.database.autoCleanupOldTests,
        retentionDays: settings.database.retentionPeriodDays
      },
      security: {
        sessionTimeout: settings.security.sessionTimeoutMinutes,
        maxLoginAttempts: settings.security.maxLoginAttempts,
        passwordChangeRequired: settings.security.requirePasswordChange
      },
      system: {
        maintenanceMode: settings.system.maintenanceMode,
        userRegistrationAllowed: settings.system.allowUserRegistration,
        maxUsers: settings.system.maxUsersAllowed
      },
      monitoring: {
        enabled: settings.monitoring.enabled,
        logLevel: settings.monitoring.logLevel,
        checkInterval: settings.monitoring.checkIntervalMinutes
      },
      lastUpdated: settings.lastUpdated,
      version: settings.version
    };

    res.json({
      success: true,
      message: 'Resumo das configurações obtido com sucesso',
      data: {
        summary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  updateDatabaseSettings,
  updateAppearanceSettings,
  updateAdvancedSettings,
  updateSecuritySettings,
  exportSettings,
  importSettings,
  getSettingsSummary
}; 