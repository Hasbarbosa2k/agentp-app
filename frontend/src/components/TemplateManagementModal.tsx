import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { 
  X, 
  Plus, 
  Copy,
  Trash2,
  Edit,
  Play,
  Tag,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { templatesService, type Template, type TemplateCategory, type CreateTemplateRequest } from '../services';

// Extended template interface for UI
interface TemplateWithArchive extends Template {
  isArchived?: boolean;
}
import { useToast } from '../contexts/ToastContext';
import EditTemplateModal from './EditTemplateModal';
import DeleteTemplateModal from './DeleteTemplateModal';

interface TemplateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect?: (template: Template) => void;
}

const categoryLabels: Record<TemplateCategory, string> = {
  system_discovery: 'Descoberta de Sistema',
  security_audit: 'Auditoria de Segurança',
  performance_test: 'Teste de Performance',
  network_check: 'Verificação de Rede',
  custom: 'Personalizado'
};

export default function TemplateManagementModal({ 
  isOpen, 
  onClose, 
  onTemplateSelect 
}: TemplateManagementModalProps) {
  const [templates, setTemplates] = useState<TemplateWithArchive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const { showToast } = useToast();

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load both active and archived templates
      const [activeResult, archivedResult] = await Promise.all([
        templatesService.getTemplates({ status: 'active', limit: 100 }),
        templatesService.getTemplates({ status: 'archived', limit: 100 })
      ]);
      
      // Combine templates and mark archived ones
      const activeTemplates = activeResult.templates.map(t => ({ ...t, isArchived: false }));
      const archivedTemplates = archivedResult.templates.map(t => ({ ...t, isArchived: true }));
      
      setTemplates([...activeTemplates, ...archivedTemplates]);
    } catch (err: any) {
      setError(err.message);
      showToast('Error loading templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const handleTemplateSelect = (template: Template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
      onClose();
    }
  };

  const handleCloneTemplate = async (template: Template) => {
    try {
      const clonedTemplate = await templatesService.cloneTemplate(template._id, {
        name: `${template.name} (Cópia)`,
        description: `Cópia de ${template.description}`
      });
      
      showToast(`Template "${clonedTemplate.template.name}" clonado com sucesso`, 'success');
      loadTemplates();
    } catch (err: any) {
      showToast(`Erro ao clonar template: ${err.message}`, 'error');
    }
  };

  const handleEditTemplate = (template: Template) => {
    setTemplateToEdit(template);
    setShowEditModal(true);
  };

  const handleDeleteTemplate = (template: Template) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  const handleTemplateUpdated = () => {
    loadTemplates();
  };

  const handleTemplateDeleted = () => {
    loadTemplates();
  };

  const handleRestoreTemplate = async (template: Template) => {
    try {
      await templatesService.restoreTemplate(template._id, 'active');
      showToast(`Template "${template.name}" restored successfully`, 'success');
      loadTemplates();
    } catch (err: any) {
      showToast(`Error restoring template: ${err.message}`, 'error');
    }
  };

  const getStatusColor = (template: Template) => {
    const successRate = template.usage.successRate;
    if (successRate >= 80) return 'text-green-400';
    if (successRate >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatLastUsed = (dateString?: string) => {
    if (!dateString) return 'Nunca usado';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-6xl w-full bg-gray-900 rounded-lg shadow-xl border border-gray-700 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <DialogTitle className="text-xl font-semibold text-white">
              Gestão de Templates
            </DialogTitle>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo Template
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-400">Loading templates...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={loadTemplates}
                  className="mt-2 text-blue-400 hover:text-blue-300 underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="overflow-y-auto p-6">
                {templates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Nenhum template encontrado</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Template
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {templates.map((template) => (
                      <div
                        key={template._id}
                        className={`bg-gray-800 rounded-lg border p-6 transition-all ${
                          template.isArchived 
                            ? 'border-gray-600 opacity-75 hover:border-gray-500' 
                            : 'border-gray-700 hover:border-blue-500'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">
                              {template.name}
                            </h3>
                            <p className="text-gray-400 text-sm mb-3">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                {categoryLabels[template.category as TemplateCategory]}
                              </span>
                              <span className="text-gray-500 text-xs">
                                v{template.version}
                              </span>
                              {template.isArchived && (
                                <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded">
                                  Arquivado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-3 bg-gray-700 rounded">
                            <div className="text-white font-semibold">
                              {template.steps.length}
                            </div>
                            <div className="text-gray-400 text-xs">Steps</div>
                          </div>
                          <div className="text-center p-3 bg-gray-700 rounded">
                            <div className={`font-semibold ${getStatusColor(template)}`}>
                              {template.usage.successRate}%
                            </div>
                            <div className="text-gray-400 text-xs">Success</div>
                          </div>
                        </div>

                        {/* Usage Info */}
                        <div className="text-sm text-gray-400 mb-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Usado {template.usage.timesUsed}x</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            <span>Último uso: {formatLastUsed(template.usage.lastUsed)}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {template.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {onTemplateSelect && !template.isArchived && (
                            <button
                              onClick={() => handleTemplateSelect(template)}
                              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                            >
                              <Play className="w-4 h-4" />
                              Usar
                            </button>
                          )}
                          <button
                            onClick={() => handleCloneTemplate(template)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Copy className="w-4 h-4" />
                            Clonar
                          </button>
                          {!template.isArchived && (
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          )}
                          {template.isArchived ? (
                            <button
                              onClick={() => handleRestoreTemplate(template)}
                              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Restaurar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteTemplate(template)}
                              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400">
                {templates.length} template{templates.length !== 1 ? 's' : ''} disponível{templates.length !== 1 ? 'eis' : ''}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>

      {/* Edit Template Modal */}
      <EditTemplateModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setTemplateToEdit(null);
        }}
        template={templateToEdit}
        onTemplateUpdated={handleTemplateUpdated}
      />

      {/* Delete Template Modal */}
      <DeleteTemplateModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTemplateToDelete(null);
        }}
        template={templateToDelete}
        onTemplateDeleted={handleTemplateDeleted}
      />
    </Dialog>
  );
}