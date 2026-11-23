import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { systemsService } from '../services';

interface System {
  id: string;
  name: string;
  type: 'web' | 'database' | 'api' | 'mobile';
  ip: string;
  os: string;
  owner: string;
  status: 'online' | 'offline' | 'maintenance';
  cpu: string;
  ram: string;
  uptime: string;
  lastTest: string;
  slug?: string;
}

interface DeleteSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: System | null;
  onSystemDeleted: (deletedSystem: System) => void;
}

export const DeleteSystemModal: React.FC<DeleteSystemModalProps> = ({
  isOpen,
  onClose,
  system,
  onSystemDeleted
}) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const handleDelete = async () => {
    if (!system) return;

    // Verificar se o texto de confirmação está correto
    if (confirmationText !== system.name) {
      showToast('Please type the system name correctly to confirm', 'error');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🗑️ [DELETE-SYSTEM] Deleting system:', system.id);
      
      await systemsService.deleteSystem(system.id);

      // Não dependemos de payload no DELETE; usamos o objeto atual
      onSystemDeleted(system);
      showToast(`System "${system.name}" deleted successfully!`, 'success');
      onClose();
      
    } catch (error: any) {
      console.error('❌ [DELETE-SYSTEM] Failed to delete system:', error);
      const errorMessage = error.message || 'Error deleting system';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setConfirmationText('');
      onClose();
    }
  };

  if (!isOpen || !system) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Delete System</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="bg-red-400/10 border border-red-400/20 rounded-full p-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
          </div>

          {/* Warning Message */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              Are you sure you want to delete this system?
            </h3>
            <p className="text-gray-400 mb-4">
              This action cannot be undone and will:
            </p>
          </div>

          {/* System Info */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white font-medium">{system.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">IP:</span>
                <span className="text-white">{system.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">OS:</span>
                <span className="text-white">{system.os}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Owner:</span>
                <span className="text-white">{system.owner}</span>
              </div>
            </div>
          </div>

          {/* Consequences */}
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-400">
                <p className="font-medium">Consequences:</p>
                <ul className="text-red-300 mt-1 space-y-1">
                  <li>• System will be marked as inactive (soft delete)</li>
                  <li>• Knowledge base directory will be removed</li>
                  <li>• All associated files will be deleted</li>
                  <li>• Onboarding data will be lost</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label htmlFor="confirmation" className="block text-sm font-medium text-gray-300 mb-2">
              Type <span className="text-red-400 font-mono">{system.name}</span> to confirm:
            </label>
            <input
              type="text"
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-400 disabled:opacity-50"
              placeholder="Type the system name..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading || confirmationText !== system.name}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:hover:bg-red-600 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </> 
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 