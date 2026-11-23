const Group = require('../models/Group');
const User = require('../models/User');

// Listar todos os grupos
const getAllGroups = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    
    const filters = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const groups = await Group.find(filters)
      .populate('members', 'username email displayName role')
      .populate('createdBy', 'username email displayName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalGroups = await Group.countDocuments(filters);

    res.json({
      success: true,
      message: 'Groups list retrieved successfully',
      data: {
        groups,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalGroups / limit),
          totalGroups,
          hasNext: page < Math.ceil(totalGroups / limit),
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

// Obter detalhes de um grupo específico
const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate('members', 'username email displayName role isActive isBlocked')
      .populate('createdBy', 'username email displayName');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      message: 'Group details retrieved successfully',
      data: { group }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Criar novo grupo
const createGroup = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const createdBy = req.user._id;

    // Verificar se já existe grupo com este nome
    const existingGroup = await Group.findOne({ name: name.trim() });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um grupo com este nome'
      });
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#3b82f6',
      createdBy,
      members: []
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'username email displayName role')
      .populate('createdBy', 'username email displayName');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: { group: populatedGroup }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Atualizar grupo
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, color, isActive } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Verificar se o novo nome já existe (se mudou)
    if (name && name.trim() !== group.name) {
      const existingGroup = await Group.findOne({ name: name.trim() });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um grupo com este nome'
        });
      }
      group.name = name.trim();
    }

    if (description !== undefined) group.description = description.trim();
    if (color !== undefined) group.color = color;
    if (isActive !== undefined) group.isActive = isActive;

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'username email displayName role isActive isBlocked')
      .populate('createdBy', 'username email displayName');

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: { group: populatedGroup }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Eliminar grupo
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Remover referências do grupo nos utilizadores
    await User.updateMany(
      { groups: groupId },
      { $pull: { groups: groupId } }
    );

    await Group.findByIdAndDelete(groupId);

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Adicionar utilizadores ao grupo
const addMembersToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de IDs de utilizadores é obrigatória'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Verificar se os utilizadores existem
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Um ou mais utilizadores não foram encontrados'
      });
    }

    // Adicionar utilizadores ao grupo (evitar duplicados)
    const newMembers = userIds.filter(id => !group.members.includes(id));
    group.members.push(...newMembers);
    await group.save();

    // Adicionar grupo aos utilizadores
    await User.updateMany(
      { _id: { $in: newMembers } },
      { $addToSet: { groups: groupId } }
    );

    const populatedGroup = await Group.findById(groupId)
      .populate('members', 'username email displayName role isActive isBlocked')
      .populate('createdBy', 'username email displayName');

    res.json({
      success: true,
      message: `${newMembers.length} utilizador(es) adicionado(s) ao grupo`,
      data: { group: populatedGroup }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Remover utilizadores do grupo
const removeMembersFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de IDs de utilizadores é obrigatória'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Remover utilizadores do grupo
    group.members = group.members.filter(id => !userIds.includes(id.toString()));
    await group.save();

    // Remover grupo dos utilizadores
    await User.updateMany(
      { _id: { $in: userIds } },
      { $pull: { groups: groupId } }
    );

    const populatedGroup = await Group.findById(groupId)
      .populate('members', 'username email displayName role isActive isBlocked')
      .populate('createdBy', 'username email displayName');

    res.json({
      success: true,
      message: `${userIds.length} utilizador(es) removido(s) do grupo`,
      data: { group: populatedGroup }
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
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addMembersToGroup,
  removeMembersFromGroup
};
