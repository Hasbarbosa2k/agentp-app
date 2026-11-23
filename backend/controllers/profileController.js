const User = require('../models/User');

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Profile obtido com sucesso',
      data: {
        profile: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          team: user.team,
          role: user.role,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
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

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { displayName, email, team } = req.body;
    const userId = req.user._id;

    // Check if email is being changed and if it's already in use
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Este email já está a ser utilizado por outro utilizador'
        });
      }
    }

    // Build update object
    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (team !== undefined) updateData.team = team;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Profile atualizado com sucesso',
      data: {
        profile: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          team: updatedUser.team,
          role: updatedUser.role,
          lastLoginAt: updatedUser.lastLoginAt,
          updatedAt: updatedUser.updatedAt
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

// Get user preferences
const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Preferências obtidas com sucesso',
      data: {
        preferences: user.preferences || {
          notifications: {
            testCompletion: true,
            systemAlerts: true,
            emailReports: false
          },
          appearance: {
            theme: 'dark',
            accentColor: '#3b82f6'
          },
          advanced: {
            debugMode: false,
            detailedLogs: false
          }
        }
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

// Update user preferences
const updatePreferences = async (req, res) => {
  try {
    const { notifications, appearance, advanced } = req.body;
    const userId = req.user._id;

    // Build preferences update object
    const updateData = {};
    
    if (notifications) {
      if (notifications.testCompletion !== undefined) {
        updateData['preferences.notifications.testCompletion'] = notifications.testCompletion;
      }
      if (notifications.systemAlerts !== undefined) {
        updateData['preferences.notifications.systemAlerts'] = notifications.systemAlerts;
      }
      if (notifications.emailReports !== undefined) {
        updateData['preferences.notifications.emailReports'] = notifications.emailReports;
      }
    }
    
    if (appearance) {
      if (appearance.theme !== undefined) {
        updateData['preferences.appearance.theme'] = appearance.theme;
      }
      if (appearance.accentColor !== undefined) {
        updateData['preferences.appearance.accentColor'] = appearance.accentColor;
      }
    }
    
    if (advanced) {
      if (advanced.debugMode !== undefined) {
        updateData['preferences.advanced.debugMode'] = advanced.debugMode;
      }
      if (advanced.detailedLogs !== undefined) {
        updateData['preferences.advanced.detailedLogs'] = advanced.detailedLogs;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('preferences');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Preferências atualizadas com sucesso',
      data: {
        preferences: updatedUser.preferences
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

module.exports = {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences
}; 