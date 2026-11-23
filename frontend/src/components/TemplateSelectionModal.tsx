import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Search, Tag, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react';
import { templatesService, type Template, type TemplateCategory } from '../services';
import { useToast } from '../contexts/ToastContext';
import EditTemplateModal from './EditTemplateModal';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template | null) => void;
  onCreateTemplate?: () => void;
  systemId: string;
}

const categoryLabels: Record<TemplateCategory, string> = {
  system_discovery: 'System Discovery',
  security_audit: 'Security Audit',
  performance_test: 'Performance Test',
  network_check: 'Network Check',
  custom: 'Custom'
};

const categoryColors: Record<TemplateCategory, string> = {
  system_discovery: 'bg-blue-100 text-blue-800',
  security_audit: 'bg-red-100 text-red-800',
  performance_test: 'bg-green-100 text-green-800',
  network_check: 'bg-yellow-100 text-yellow-800',
  custom: 'bg-purple-100 text-purple-800'
};

export default function TemplateSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectTemplate,
  onCreateTemplate,
  systemId 
}: TemplateSelectionModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const { showToast } = useToast();

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await templatesService.getTemplates({
        status: 'active',
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        limit: 50
      });
      
      // Se systemId foi fornecido, podemos adicionar lógica adicional de filtragem aqui
      // Por enquanto, mostramos todos os templates ativos
      console.log(`🔍 [TEMPLATES] Loaded ${result.templates.length} templates for system: ${systemId || 'any'}`);
      setTemplates(result.templates);
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
  }, [isOpen, selectedCategory, searchTerm]);

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template);
    onClose();
  };

  const handleEditTemplate = (template: Template, event: React.MouseEvent) => {
    event.stopPropagation();
    setTemplateToEdit(template);
    setShowEditModal(true);
  };

  const handleDeleteTemplate = (template: Template, event: React.MouseEvent) => {
    event.stopPropagation();
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const handleTemplateEdited = (updatedTemplate: Template) => {
    setTemplates(prev => prev.map(t => t._id === updatedTemplate._id ? updatedTemplate : t));
    setShowEditModal(false);
    setTemplateToEdit(null);
    showToast(`Template "${updatedTemplate.name}" updated successfully`, 'success');
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      await templatesService.deleteTemplate(templateToDelete._id, { force: true });
      setTemplates(prev => prev.filter(t => t._id !== templateToDelete._id));
      showToast(`Template "${templateToDelete.name}" deleted successfully`, 'success');
    } catch (error: any) {
      showToast(`Error deleting template: ${error.message}`, 'error');
    } finally {
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-4xl w-full bg-gray-900 rounded-lg shadow-xl border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <DialogTitle className="text-xl font-semibold text-white">
                  Select Onboarding Template
                </DialogTitle>
                {systemId && (
                  <p className="text-sm text-gray-400 mt-1">
                    Showing templates compatible with selected system
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {onCreateTemplate && (
                  <button
                    onClick={onCreateTemplate}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Template
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Search and Filters */}
              <div className="mb-6 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key as TemplateCategory)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates List */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
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
                      Try again
                    </button>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No templates found</p>
                    {onCreateTemplate && (
                      <button
                        onClick={onCreateTemplate}
                        className="flex items-center gap-2 mx-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create First Template
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template._id}
                        className="group cursor-pointer p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-gray-750 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1" onClick={() => handleSelectTemplate(template)}>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                                {template.name}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[template.category as TemplateCategory]}`}>
                                {categoryLabels[template.category as TemplateCategory]}
                              </span>
                            </div>
                            
                            <p className="text-gray-400 text-sm mb-3">
                              {template.description}
                            </p>

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{template.steps.length} steps</span>
                              <span>{template.usage.timesUsed} uses</span>
                              <span>{template.usage.successRate}% success</span>
                              {template.supportedOS && template.supportedOS.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Tag className="w-4 h-4" />
                                  <span>{template.supportedOS.join(', ')}</span>
                                </div>
                              )}
                            </div>

                            {template.tags && template.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
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
                          </div>

                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={(e) => handleEditTemplate(template, e)}
                              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                              title="Edit template"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteTemplate(template, e)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                              title="Delete template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onSelectTemplate(null)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all font-medium"
                  title="Executa apenas os passos base: diagnóstico do sistema, análise de recursos, e instalação do Node Exporter"
                >
                  🔧 Apenas Passos Base
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Edit Template Modal */}
      {showEditModal && templateToEdit && (
        <EditTemplateModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setTemplateToEdit(null);
          }}
          template={templateToEdit}
          onTemplateUpdated={handleTemplateEdited}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && templateToDelete && (
        <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="mx-auto max-w-md w-full bg-gray-900 rounded-lg shadow-xl border border-gray-700">
              <div className="p-6">
                <DialogTitle className="text-lg font-semibold text-white mb-4">
                  Are you sure?
                </DialogTitle>
                <p className="text-gray-400 mb-6">
                  Do you want to delete the template "{templateToDelete.name}"? This action cannot be undone.
                </p>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </>
  );
}