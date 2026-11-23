const User = require('../models/User');

// Listar todos os utilizadores
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, isBlocked } = req.query;
    
    // Construir filtros
    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isBlocked !== undefined) filters.isBlocked = isBlocked === 'true';

    const users = await User.find(filters)
      .select('-password -refreshTokens -passwordResetToken')
      .populate('blockedBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalUsers = await User.countDocuments(filters);

    res.json({
      success: true,
      message: 'Users list retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: page < Math.ceil(totalUsers / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Obter detalhes de um utilizador específico
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -refreshTokens -passwordResetToken')
      .populate('blockedBy', 'username email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User details retrieved successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Bloquear utilizador
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    // Não pode bloquear a si próprio
    if (userId === adminId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Não podes bloquear a tua própria conta'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Não pode bloquear outro admin (apenas super admin poderia)
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não podes bloquear outro administrador'
      });
    }

    if (user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: 'Utilizador já está bloqueado'
      });
    }

    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedBy = adminId;
    user.blockReason = reason || 'Bloqueado por administrador';
    user.refreshTokens = []; // Invalida todos os tokens
    await user.save();

    res.json({
      success: true,
      message: `User ${user.username} blocked successfully`,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isBlocked: user.isBlocked,
          blockedAt: user.blockedAt,
          blockReason: user.blockReason
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Desbloquear utilizador
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: 'Utilizador não está bloqueado'
      });
    }

    user.isBlocked = false;
    user.blockedAt = undefined;
    user.blockedBy = undefined;
    user.blockReason = undefined;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.username} unblocked successfully`,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isBlocked: user.isBlocked
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Promover utilizador a admin
const promoteToAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Utilizador já é administrador'
      });
    }

    if (user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: 'Não podes promover um utilizador bloqueado'
      });
    }

    user.role = 'admin';
    await user.save();

    res.json({
      success: true,
      message: `Utilizador ${user.username} promovido a administrador`,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Despromover admin para user
const demoteFromAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentAdminId = req.user._id;

    // Não pode despromover a si próprio
    if (userId === currentAdminId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Não podes remover as tuas próprias permissões de admin'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Utilizador não é administrador'
      });
    }

    user.role = 'user';
    await user.save();

    res.json({
      success: true,
      message: `Utilizador ${user.username} despromovido para utilizador normal`,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Alterar role de utilizador
const changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, reason } = req.body;
    const currentAdminId = req.user._id;

    // Não pode alterar o próprio role
    if (userId === currentAdminId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Não podes alterar o teu próprio role'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verificar se já tem o role solicitado
    if (user.role === role) {
      return res.status(400).json({
        success: false,
        message: `Utilizador já tem role "${role}"`
      });
    }

    // Não pode alterar role de utilizador bloqueado para admin
    if (user.isBlocked && role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Não podes promover um utilizador bloqueado a administrador'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Log da mudança (em produção, guardar em collection de auditoria)
    console.log(`[ROLE CHANGE] Admin ${req.user.username} alterou role de ${user.username} de "${oldRole}" para "${role}"${reason ? ` - Motivo: ${reason}` : ''}`);

    res.json({
      success: true,
      message: `Role do utilizador ${user.username} alterado de "${oldRole}" para "${role}"`,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          oldRole,
          newRole: user.role,
          reason: reason || null,
          changedBy: {
            id: req.user._id,
            username: req.user.username
          },
          changedAt: new Date()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Criar novo utilizador
const createUser = async (req, res) => {
  try {
    const { email, password, displayName, username, role = 'user', team } = req.body;

    // Validações básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e password são obrigatórios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password deve ter pelo menos 6 caracteres'
      });
    }

    // Verificar se já existe utilizador com este email ou username
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username || email.split('@')[0] }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um utilizador com este email ou username'
      });
    }

    // Criar novo utilizador
    const user = new User({
      email: email.toLowerCase(),
      password,
      username: username || email.split('@')[0],
      displayName: displayName || username || email.split('@')[0],
      role: role === 'admin' ? 'admin' : 'user',
      team: team || 'default-team',
      isActive: true,
      isBlocked: false
    });

    await user.save();

    // Retornar utilizador sem password
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;
    delete userResponse.passwordResetToken;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Atualizar utilizador
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, email, team, role, isActive } = req.body;
    const currentAdminId = req.user._id;

    // Não pode atualizar a si próprio através deste endpoint
    if (userId === currentAdminId.toString() && (role || isActive === false)) {
      return res.status(400).json({
        success: false,
        message: 'Não podes alterar o teu próprio role ou desativar a tua conta'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Atualizar campos permitidos
    if (displayName !== undefined) user.displayName = displayName;
    if (email !== undefined) {
      // Verificar se email já existe
      const emailExists = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: userId } 
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um utilizador com este email'
        });
      }
      user.email = email.toLowerCase();
    }
    if (team !== undefined) user.team = team;
    if (role !== undefined && role !== user.role) {
      // Não pode alterar role de utilizador bloqueado para admin
      if (user.isBlocked && role === 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Não podes promover um utilizador bloqueado a administrador'
        });
      }
      user.role = role === 'admin' ? 'admin' : 'user';
    }
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Retornar utilizador atualizado sem password
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;
    delete userResponse.passwordResetToken;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Eliminar utilizador
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentAdminId = req.user._id;

    // Não pode eliminar a si próprio
    if (userId === currentAdminId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Não pode eliminar outro admin
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete another administrator'
      });
    }

    // Remover referências do utilizador nos grupos
    const Group = require('../models/Group');
    await Group.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: `User ${user.username} deleted successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Alterar password de utilizador (admin)
const changeUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova password deve ter pelo menos 6 caracteres'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Atualizar password
    user.password = newPassword;
    user.refreshTokens = []; // Invalida todos os tokens para forçar novo login
    await user.save();

    res.json({
      success: true,
      message: `Password for user ${user.username} changed successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Obter estatísticas da plataforma
const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true, isBlocked: false });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    // Utilizadores criados nos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLastMonth = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        totalUsers,
        activeUsers,
        blockedUsers,
        adminUsers,
        inactiveUsers,
        newUsersLastMonth,
        userGrowthRate: totalUsers > 0 ? ((newUsersLastMonth / totalUsers) * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  blockUser,
  unblockUser,
  promoteToAdmin,
  demoteFromAdmin,
  changeUserRole,
  getStats
}; 