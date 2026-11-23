import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Filter, Eye, Edit, Trash2, Copy } from 'lucide-react';
import { templatesService } from '../services';
import { Template, TemplateCategory } from '../types/template.types';
import { useToast } from '../contexts/ToastContext';
import TemplateManagementModal from '../components/TemplateManagementModal';
import DeleteTemplateModal from '../components/DeleteTemplateModal';

interface TemplateManagementProps {
  onBack: () => void;
}

const categoryLabels: Record<TemplateCategory | 'performance_test', string> = {
  system_discovery: 'System Discovery',
  security_audit: 'Security Audit',
  performance_test: 'Performance Test',
  network_check: 'Network Check',
  custom: 'Custom'
};

export default function TemplateManagement({ onBack }: TemplateManagementProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [showManagementModal, setShowManagementModal] = useState(false);
  const { showToast } = useToast();

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await templatesService.getTemplates({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        limit: 100
      });
      
      setTemplates(result.templates);
    } catch (err: any) {
      setError(err.message);
      showToast('Error loading templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, searchTerm]);

  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteTemplate = (template: Template) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  const handleTemplateDeleted = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t._id !== templateId));
    setTemplateToDelete(null);
    setShowDeleteModal(false);
    loadTemplates();
  };

  const handleCloneTemplate = async (template: Template) => {
    try {
      const clonedTemplate = await templatesService.cloneTemplate(template._id, {
        name: `${template.name} (Copy)`,
        description: `Copy of ${template.description}`
      });
      
      showToast(`Template "${clonedTemplate.template.name}" cloned successfully`, 'success');
      loadTemplates();
    } catch (err: any) {
      showToast(`Error cloning template: ${err.message}`, 'error');
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Gestão de Templates</h1>
              <p className="text-gray-400">Gerencie templates de onboarding para seus sistemas</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowManagementModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Novo Template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'all')}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as categorias</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
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
              Tentar novamente
            </button>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Nenhum template encontrado</p>
            <button
              onClick={() => setShowManagementModal(true)}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template._id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-blue-500 transition-all"
              >
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {template.name}
                    </h3>
                    <span className="text-gray-500 text-sm">
                      v{template.version}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                      {categoryLabels[template.category as TemplateCategory]}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      template.status === 'active' ? 'bg-green-600 text-white' :
                      template.status === 'draft' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {template.status}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-gray-700 rounded">
                    <div className="text-white font-semibold text-sm">
                      {template.steps.length}
                    </div>
                    <div className="text-gray-400 text-xs">Steps</div>
                  </div>
                  <div className="text-center p-2 bg-gray-700 rounded">
                    <div className={`font-semibold text-sm ${getStatusColor(template)}`}>
                      {template.usage.successRate}%
                    </div>
                    <div className="text-gray-400 text-xs">Success</div>
                  </div>
                  <div className="text-center p-2 bg-gray-700 rounded">
                    <div className="text-white font-semibold text-sm">
                      {template.usage.timesUsed}
                    </div>
                    <div className="text-gray-400 text-xs">Usos</div>
                  </div>
                </div>

                {/* Usage Info */}
                <div className="text-xs text-gray-400 mb-4">
                  <p>Último uso: {formatLastUsed(template.usage.lastUsed)}</p>
                  {template.supportedOS && template.supportedOS.length > 0 && (
                    <p>Suporta: {template.supportedOS.join(', ')}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-xs"
                    title="Visualizar"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                    title="Edit"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleCloneTemplate(template)}
                    className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                    title="Clonar"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template)}
                    className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs"
                    title="Deletar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Management Modal */}
      <TemplateManagementModal
        isOpen={showManagementModal}
        onClose={() => setShowManagementModal(false)}
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
    </div>
  );
}