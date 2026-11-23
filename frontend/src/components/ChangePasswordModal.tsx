import React, { useState } from 'react';
import { X, Lock, Save } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newPassword: string) => Promise<void>;
  userName?: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userName
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Password confirmation is required';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      await onSave(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: 'newPassword' | 'confirmPassword', value: string) => {
    if (field === 'newPassword') {
      setNewPassword(value);
    } else {
      setConfirmPassword(value);
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-400/20 rounded-lg flex items-center justify-center">
              <Lock className="text-green-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Change Password</h3>
              {userName && (
                <p className="text-sm text-gray-400">{userName}</p>
              )}
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
              New Password *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => handleChange('newPassword', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                errors.newPassword ? 'border-red-400 focus:border-red-400' : 'border-gray-600 focus:border-green-400'
              }`}
              placeholder="Minimum 6 characters"
            />
            {errors.newPassword && <p className="text-red-400 text-xs mt-1">{errors.newPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none transition-colors ${
                errors.confirmPassword ? 'border-red-400 focus:border-red-400' : 'border-gray-600 focus:border-green-400'
              }`}
              placeholder="Confirm new password"
            />
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
              <p className="text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

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
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-green-400 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-black rounded-lg transition-colors font-medium"
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Change Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
