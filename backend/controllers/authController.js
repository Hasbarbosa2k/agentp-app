const User = require('../models/User');
const { generateTokens, verifyRefreshToken, generatePasswordResetToken } = require('../utils/jwt');
const { handleControllerError } = require('../utils/errorHandler');
const crypto = require('crypto');

// Register new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Utilizador já existe com este email ou username'
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Utilizador criado com sucesso',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        tokens
      }
    });
  } catch (error) {
    return handleControllerError(res, error, 'Erro no registo');
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    
    // Usar 'email' se disponível, senão usar 'identifier'
    const loginField = email || identifier;

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: loginField },
        { username: loginField }
      ],
      isActive: true
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Clean expired tokens
    user.removeExpiredTokens();

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        tokens
      }
    });
  } catch (error) {
    return handleControllerError(res, error, 'Erro no login');
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    // Remove the specific refresh token
    if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(
        tokenObj => tokenObj.token !== refreshToken
      );
      await User.findByIdAndUpdate(user._id, { refreshTokens: user.refreshTokens });
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    return handleControllerError(res, error, 'Erro no logout');
  }
};

// Refresh token
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Utilizador não encontrado ou inativo'
      });
    }

    // Check if refresh token exists in database
    const tokenExists = user.refreshTokens.some(
      tokenObj => tokenObj.token === refreshToken
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(
      tokenObj => tokenObj.token !== refreshToken
    );
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    res.json({
      success: true,
      message: 'Tokens renovados com sucesso',
      data: { tokens }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido ou expirado'
      });
    }

    return handleControllerError(res, error, 'Erro ao renovar tokens');
  }
};

// Get current user data
const me = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      message: 'Dados do utilizador obtidos com sucesso',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    return handleControllerError(res, error, 'Erro ao obter dados do utilizador');
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, isActive: true });

    if (!user) {
      // For security, don't reveal if user exists
      return res.json({
        success: true,
        message: 'Se o email existir, receberá instruções para reset da password'
      });
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const resetTokenHashed = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save reset token to user (expires in 10 minutes)
    user.passwordResetToken = resetTokenHashed;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // TODO: Implementar envio de email com reset token
    // Em produção, enviar email aqui usando serviço como SendGrid, SES, etc.
    // Por agora, apenas log sem expor o token
    console.log(`📧 Password reset solicitado para: ${email}`);

    res.json({
      success: true,
      message: 'Se o email existir, receberá instruções para reset da password'
    });
  } catch (error) {
    return handleControllerError(res, error, 'Erro ao solicitar reset de password');
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isActive: true
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    res.json({
      success: true,
      message: 'Password alterada com sucesso'
    });
  } catch (error) {
    return handleControllerError(res, error, 'Erro ao redefinir password');
  }
};

// Change password (authenticated)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Password atual incorreta'
      });
    }

    // Update password
    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    res.json({
      success: true,
      message: 'Password alterada com sucesso'
    });
  } catch (error) {
    return handleControllerError(res, error, 'Erro ao alterar password');
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  me,
  requestPasswordReset,
  resetPassword,
  changePassword
}; 