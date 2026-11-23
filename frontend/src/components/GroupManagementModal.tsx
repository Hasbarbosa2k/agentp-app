import React, { useState, useEffect } from 'react';
import { X, Users, Save, Plus, UserMinus, UserPlus } from 'lucide-react';
import { groupService, adminService, type Group, type UserListItem } from '../services';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  group?: Group | null;
  mode: 'add' | 'edit' | 'manage';
}

export const GroupManagementModal: React.FC<GroupManagementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  group,
  mode
}) => {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    color: group?.color || '#3b82f6'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableUsers, setAvailableUsers] = useState<UserListItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen && (mode === 'manage' || mode === 'edit')) {
      loadUsers();
      if (group) {
        setSelectedUsers(group.members.map(m => m._id || m.id || ''));
      }
    }
    if (isOpen && group && mode !== 'add') {
      setFormData({
        name: group.name,
        description: group.description || '',
        color: group.color || '#3b82f6'
      });
    } else if (isOpen && mode === 'add') {
      setFormData({
        name: '',
        description: '',
        color: '#3b82f6'
      });
      setSelectedUsers([]);
    }
  }, [isOpen, group, mode]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await adminService.getUsers({ limit: 100 });
      setAvailableUsers(response.users);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode !== 'manage' && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (mode !== 'manage' && formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'manage') {
      // Gerir membros
      if (group) {
        try {
          const currentMemberIds = group.members.map(m => m._id || m.id || '');
          const toAdd = selectedUsers.filter(id => !currentMemberIds.includes(id));
          const toRemove = currentMemberIds.filter(id => !selectedUsers.includes(id));

          if (toAdd.length > 0) {
            await groupService.addMembersToGroup(group._id || group.id || '', toAdd);
          }
          if (toRemove.length > 0) {
            await groupService.removeMembersFromGroup(group._id || group.id || '', toRemove);
          }
          onSave();
          onClose();
        } catch (error) {
          console.error('Error managing group members:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          // O erro será tratado pelo componente pai através do onSave
          throw error;
        }
      }
      return;
    }

    if (!validateForm()) return;

    try {
      if (mode === 'add') {
        await groupService.createGroup(formData);
      } else if (group) {
        await groupService.updateGroup(group._id || group.id || '', formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      // O erro será tratado pelo componente pai através do onSave
      throw error;
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (mode === 'manage') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl bg-gray-800 rounded-lg border border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-400/20 rounded-lg flex items-center justify-center">
                <Users className="text-purple-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Manage Group Members</h3>
                <p className="text-sm text-gray-400">{group?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 flex-1 overflow-y-auto">
              {isLoadingUsers ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
                  <p className="text-gray-400 text-sm mt-2">Loading users...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableUsers.map((user) => {
                    const isSelected = selectedUsers.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-purple-400/10 border-purple-400/50'
                            : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {isSelected ? (
                              <UserMinus className="text-purple-400" size={18} />
                            ) : (
                              <UserPlus className="text-gray-400" size={18} />
                            )}
                            <div>
                              <p className="text-white font-medium">{user.displayName || user.email}</p>
                              <p className="text-gray-400 text-sm">{user.email}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-purple-400 text-sm font-medium">Selected</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center space-x-2 px-4 py-2 bg-purple-400 hover:bg-purple-500 text-black rounded-lg transition-colors font-medium"
              >
                <Save size={16} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-400/20 rounded-lg flex items-center justify-center">
              {mode === 'add' ? <Plus className="text-purple-400" size={20} /> : <Users className="text-purple-400" size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {mode === 'add' ? 'Create New Group' : 'Edit Group'}
              </h3>
              <p className="text-sm text-gray-400">
                {mode === 'add' ? 'Create a new user group' : 'Update group information'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                errors.name ? 'border-red-400 focus:border-red-400' : 'border-gray-600 focus:border-purple-400'
              }`}
              placeholder="Group name"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-400 transition-colors"
              placeholder="Group description (optional)"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-16 h-10 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-400 transition-colors"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 bg-purple-400 hover:bg-purple-500 text-black rounded-lg transition-colors font-medium"
            >
              <Save size={16} />
              <span>{mode === 'add' ? 'Create Group' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
