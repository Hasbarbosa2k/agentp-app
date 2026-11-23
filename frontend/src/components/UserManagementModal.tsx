import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Save, Plus } from 'lucide-react';

interface UserData {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'editor' | 'viewer' | 'user';
  status: 'active' | 'inactive';
  team?: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: UserData) => void;
  user?: UserData | null;
  mode: 'add' | 'edit';
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
  mode
}) => {
  const [formData, setFormData] = useState<UserData>({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'viewer',
    status: user?.status || 'active',
    team: user?.team || '',
    ...(user?.id && { id: user.id })
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Atualizar formData quando user muda
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: user?.name || user?.displayName || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'user',
        status: user?.status || (user?.isActive && !user?.isBlocked ? 'active' : 'inactive'),
        team: user?.team || '',
        ...(user?.id && { id: user.id })
      });
      setErrors({});
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password required only when adding new user
    if (mode === 'add' && !formData.password?.trim()) {
      newErrors.password = 'Password is required';
    } else if (mode === 'add' && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleChange = (field: keyof UserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const roleColors = {
    admin: 'text-red-400 bg-red-400/10',
    editor: 'text-blue-400 bg-blue-400/10',
    viewer: 'text-green-400 bg-green-400/10'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-cyan-400/20 rounded-lg flex items-center justify-center">
              {mode === 'add' ? <Plus className="text-cyan-400" size={20} /> : <User className="text-cyan-400" size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {mode === 'add' ? 'Add New User' : 'Edit User'}
              </h3>
              <p className="text-sm text-gray-400">
                {mode === 'add' ? 'Create a new team member' : 'Update user information'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                errors.name ? 'border-red-400 focus:border-red-400' : 'border-gray-600 focus:border-cyan-400'
              }`}
              placeholder="Enter full name"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                errors.email ? 'border-red-400 focus:border-red-400' : 'border-gray-600 focus:border-cyan-400'
              }`}
              placeholder="user@company.com"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password Field - Only for add mode */}
          {mode === 'add' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                  errors.password ? 'border-red-400 focus:border-red-400' : 'border-gray-600 focus:border-cyan-400'
                }`}
                placeholder="Minimum 6 characters"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>
          )}

          {/* Role Field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors"
            >
              <option value="user">User - Standard access</option>
              <option value="viewer">Viewer - Read only access</option>
              <option value="editor">Editor - Can edit tests and reports</option>
              <option value="admin">Admin - Full system access</option>
            </select>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleColors[formData.role]}`}>
                <Shield size={12} className="mr-1" />
                {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
              </span>
            </div>
          </div>

          {/* Team Field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Team (Optional)
            </label>
            <select
              value={formData.team}
              onChange={(e) => handleChange('team', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors"
            >
              <option value="">No team assigned</option>
              <option value="qa-team">QA Team</option>
              <option value="dev-team">Development Team</option>
              <option value="ops-team">Operations Team</option>
              <option value="security-team">Security Team</option>
            </select>
          </div>

          {/* Status Field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-black rounded-lg transition-colors font-medium"
            >
              <Save size={16} />
              <span>{mode === 'add' ? 'Add User' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 