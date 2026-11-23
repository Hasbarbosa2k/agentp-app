import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { systemsService, type CreateSystemData } from '../services';

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

interface EditSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: System | null;
  onSystemUpdated: (updatedSystem: System) => void;
}

export const EditSystemModal: React.FC<EditSystemModalProps> = ({
  isOpen,
  onClose,
  system,
  onSystemUpdated
}) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateSystemData>({
    name: '',
    ip: '',
    os: '',
    owner: '',
    description: '',
    environment: 'production',
    status: 'unknown'
  });

  // Preencher formulário quando sistema é carregado
  useEffect(() => {
    if (system) {
      setFormData({
        name: system.name,
        ip: system.ip,
        os: system.os,
        owner: system.owner,
        description: system.description || '',
        environment: 'production', // Default value
        status: system.status === 'maintenance' ? 'maintenance' : 
                system.status === 'online' ? 'online' : 'offline'
      });
    }
  }, [system]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!system) return;

    // Validação básica
    if (!formData.name.trim() || !formData.ip.trim() || !formData.os.trim() || !formData.owner.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Validação de IPv4 simples (sem mock/fallback)
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    if (!ipv4Regex.test(formData.ip)) {
      showToast('Invalid IP address. Use a valid IPv4 (e.g: 192.168.1.100).', 'error');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 [EDIT-SYSTEM] Submitting form data:', formData);
      
      const updatedSystemInfo = await systemsService.updateSystem(system.id, formData);
      
      // Converter SystemInfo para System
      const updatedSystem: System = {
        id: updatedSystemInfo._id,
        name: updatedSystemInfo.name,
        type: 'web', // Mapear conforme necessário
        ip: updatedSystemInfo.ip,
        os: updatedSystemInfo.os,
        owner: updatedSystemInfo.owner,
        status: updatedSystemInfo.status === 'unknown' ? 'offline' : updatedSystemInfo.status,
        cpu: 'N/A',
        ram: 'N/A',
        uptime: 'N/A',
        lastTest: 'N/A',
        slug: updatedSystemInfo.slug
      };

      onSystemUpdated(updatedSystem);
      showToast(`System "${updatedSystem.name}" updated successfully!`, 'success');
      onClose();
      
    } catch (error: any) {
      console.error('❌ [EDIT-SYSTEM] Failed to update system:', error);
      const errorMessage = error.message || 'Error updating system';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen || !system) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Edit System</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Sistema *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
              placeholder="Ex: Web Server"
            />
          </div>

          {/* IP */}
          <div>
            <label htmlFor="ip" className="block text-sm font-medium text-gray-300 mb-2">
              Endereço IP *
            </label>
            <input
              type="text"
              id="ip"
              name="ip"
              value={formData.ip}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
              placeholder="Ex: 192.168.1.100"
            />
          </div>

          {/* OS */}
          <div>
            <label htmlFor="os" className="block text-sm font-medium text-gray-300 mb-2">
              Sistema Operativo *
            </label>
            <input
              type="text"
              id="os"
              name="os"
              value={formData.os}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
              placeholder="Ex: Ubuntu 20.04"
            />
          </div>

          {/* Owner */}
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-300 mb-2">
              Proprietário *
            </label>
            <input
              type="text"
              id="owner"
              name="owner"
              value={formData.owner}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
              placeholder="Ex: IT Team"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400 disabled:opacity-50"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Manutenção</option>
              <option value="unknown">Desconhecido</option>
            </select>
          </div>

          {/* Environment */}
          <div>
            <label htmlFor="environment" className="block text-sm font-medium text-gray-300 mb-2">
              Ambiente
            </label>
            <select
              id="environment"
              name="environment"
              value={formData.environment}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400 disabled:opacity-50"
            >
              <option value="production">Produção</option>
              <option value="staging">Staging</option>
              <option value="development">Desenvolvimento</option>
              <option value="testing">Teste</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 disabled:opacity-50 resize-none"
              placeholder="Descrição opcional do sistema..."
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-400">
                <p className="font-medium">Atenção</p>
                <p className="text-yellow-300 mt-1">
                  A edição de um sistema pode afetar o diretório da knowledge base e gerar um novo slug se o nome for alterado.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Atualizando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Atualizar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 