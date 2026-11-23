import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Trash2, AlertTriangle, Archive, HardDrive } from 'lucide-react';
import { templatesService, type Template } from '../services';
import { useToast } from '../contexts/ToastContext';

interface DeleteTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
  onTemplateDeleted?: (templateId: string) => void;
}

export default function DeleteTemplateModal({ 
  isOpen, 
  onClose, 
  template,
  onTemplateDeleted
}: DeleteTemplateModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [forceDelete, setForceDelete] = useState(false);
  const { showToast } = useToast();

  const handleDelete = async () => {
    if (!template) return;

    setLoading(true);

    try {
      if (forceDelete) {
        // Hard delete - permanent removal
        await templatesService.deleteTemplate(template._id, { force: true });
        showToast(`Template "${template.name}" permanently deleted`, 'success');
      } else {
        // Soft delete - archival with reason
        await templatesService.deleteTemplate(template._id, { 
          reason: deleteReason.trim() || 'No reason provided',
          force: false 
        });
        showToast(`Template "${template.name}" archived successfully`, 'success');
      }
      
      if (onTemplateDeleted) {
        onTemplateDeleted(template._id);
      }
      
      onClose();
      resetForm();

    } catch (error: any) {
      console.error('❌ [DELETE-TEMPLATE] Error deleting template:', error);
      
      let errorMessage = 'Unknown error';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.details) {
          errorMessage = typeof errorData.details === 'string' 
            ? errorData.details 
            : JSON.stringify(errorData.details, null, 2);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(`Error deleting template: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDeleteReason('');
    setForceDelete(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!template) {
    return null;
  }

  const isSystemTemplate = template.tags?.includes('system') || template.createdBy === 'system';

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md w-full bg-gray-900 rounded-lg shadow-xl border border-gray-700">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-gray-700">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-white">
                Delete Template
              </DialogTitle>
              <p className="text-sm text-gray-400 mt-1">
                Are you sure you want to delete "{template.name}"?
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Template Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">{template.name}</h4>
              <p className="text-sm text-gray-400 mb-3">{template.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Version:</span>
                  <span className="text-white ml-2">v{template.version}</span>
                </div>
                <div>
                  <span className="text-gray-500">Steps:</span>
                  <span className="text-white ml-2">{template.steps.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Used:</span>
                  <span className="text-white ml-2">{template.usage.timesUsed}x</span>
                </div>
                <div>
                  <span className="text-gray-500">Success Rate:</span>
                  <span className="text-white ml-2">{template.usage.successRate}%</span>
                </div>
              </div>
            </div>

            {/* System Template Warning */}
            {isSystemTemplate && (
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-yellow-400 mb-1">System Template</h5>
                    <p className="text-sm text-yellow-300">
                      This is a system template and may be protected from deletion. 
                      Consider archiving instead of permanent deletion.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="soft-delete"
                  name="delete-type"
                  checked={!forceDelete}
                  onChange={() => setForceDelete(false)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <label htmlFor="soft-delete" className="flex items-center gap-2 text-white cursor-pointer">
                  <Archive className="w-4 h-4 text-blue-400" />
                  <span>Archive Template (Recommended)</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="hard-delete"
                  name="delete-type"
                  checked={forceDelete}
                  onChange={() => setForceDelete(true)}
                  className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 focus:ring-red-500"
                />
                <label htmlFor="hard-delete" className="flex items-center gap-2 text-white cursor-pointer">
                  <HardDrive className="w-4 h-4 text-red-400" />
                  <span>Permanently Delete</span>
                </label>
              </div>
            </div>

            {/* Reason Input */}
            {!forceDelete && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Archive Reason (Optional)
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Why are you archiving this template?"
                  rows={3}
                />
              </div>
            )}

            {/* Warning for permanent deletion */}
            {forceDelete && (
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-red-400 mb-1">Permanent Deletion</h5>
                    <p className="text-sm text-red-300">
                      This action cannot be undone. The template will be permanently removed 
                      from the system and all associated data will be lost.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                forceDelete 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {forceDelete ? 'Deleting...' : 'Archiving...'}
                </div>
              ) : (
                forceDelete ? 'Delete Permanently' : 'Archive Template'
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
} 