import React, { useState } from 'react';
import { X, Server, Globe, Database, Smartphone, HardDrive } from 'lucide-react';

interface AddSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSystem: (system: NewSystem) => void;
}

export interface NewSystem {
  name: string;
  type: 'web' | 'database' | 'api' | 'mobile';
  ip: string;
  os: string;
  owner: string;
  cpu: string;
  ram: string;
  description?: string;
}

const systemTypes = [
  { id: 'web', label: 'Web Server', icon: Globe, description: 'Web application server' },
  { id: 'database', label: 'Database', icon: Database, description: 'Database server' },
  { id: 'api', label: 'API Gateway', icon: Server, description: 'API management server' },
  { id: 'mobile', label: 'Mobile Backend', icon: Smartphone, description: 'Mobile application backend' },
];

const operatingSystems = [
  'Ubuntu 22.04',
  'Ubuntu 20.04',
  'CentOS 8',
  'CentOS 7',
  'Windows Server 2022',
  'Windows Server 2019',
  'Docker Container',
  'Amazon Linux',
  'Red Hat Enterprise Linux',
  'Debian 11',
];

const teams = [
  'DevOps Team',
  'Backend Team',
  'Frontend Team',
  'Database Team',
  'Mobile Team',
  'QA Team',
  'Infrastructure Team',
];

export const AddSystemModal: React.FC<AddSystemModalProps> = ({
  isOpen,
  onClose,
  onAddSystem,
}) => {
  const [formData, setFormData] = useState<NewSystem>({
    name: '',
    type: 'web',
    ip: '',
    os: '',
    owner: '',
    cpu: '',
    ram: '',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NewSystem, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof NewSystem, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do sistema é obrigatório';
    }

    if (!formData.ip.trim()) {
      newErrors.ip = 'Endereço IP é obrigatório';
    } else if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(formData.ip)) {
      newErrors.ip = 'Formato de IP inválido (ex: 192.168.1.100)';
    }

    if (!formData.os.trim()) {
      newErrors.os = 'Sistema operativo é obrigatório';
    }

    if (!formData.owner.trim()) {
      newErrors.owner = 'Responsável é obrigatório';
    }

    if (!formData.cpu.trim()) {
      newErrors.cpu = 'Especificação de CPU é obrigatória';
    }

    if (!formData.ram.trim()) {
      newErrors.ram = 'Especificação de RAM é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onAddSystem(formData);
      setFormData({
        name: '',
        type: 'web',
        ip: '',
        os: '',
        owner: '',
        cpu: '',
        ram: '',
        description: '',
      });
      setErrors({});
      onClose();
    }
  };

  const handleChange = (field: keyof NewSystem, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Server className="text-green-400" size={24} />
            <h2 className="text-xl font-semibold text-white">Adicionar Sistema</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* System Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Sistema *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'
              }`}
              placeholder="Ex: Production Web Server"
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* System Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Tipo de Sistema *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {systemTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleChange('type', type.id as NewSystem['type'])}
                    className={`p-3 rounded-lg border transition-colors text-left ${
                      formData.type === type.id
                        ? 'bg-green-400/10 border-green-400/50 text-green-400'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon size={16} />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs opacity-80">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* IP Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Endereço IP *
            </label>
            <input
              type="text"
              value={formData.ip}
              onChange={(e) => handleChange('ip', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                errors.ip ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'
              }`}
              placeholder="192.168.1.100"
            />
            {errors.ip && <p className="text-red-400 text-sm mt-1">{errors.ip}</p>}
          </div>

          {/* Operating System */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sistema Operativo *
            </label>
            <select
              value={formData.os}
              onChange={(e) => handleChange('os', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                errors.os ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'
              }`}
            >
              <option value="">Seleccionar SO...</option>
              {operatingSystems.map((os) => (
                <option key={os} value={os}>{os}</option>
              ))}
            </select>
            {errors.os && <p className="text-red-400 text-sm mt-1">{errors.os}</p>}
          </div>

          {/* Owner/Team */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Responsável/Equipa *
            </label>
            <select
              value={formData.owner}
              onChange={(e) => handleChange('owner', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                errors.owner ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'
              }`}
            >
              <option value="">Seleccionar equipa...</option>
              {teams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
            {errors.owner && <p className="text-red-400 text-sm mt-1">{errors.owner}</p>}
          </div>

          {/* Hardware Specs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CPU *
              </label>
              <input
                type="text"
                value={formData.cpu}
                onChange={(e) => handleChange('cpu', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                  errors.cpu ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'
                }`}
                placeholder="8 cores @ 3.2GHz"
              />
              {errors.cpu && <p className="text-red-400 text-sm mt-1">{errors.cpu}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                RAM *
              </label>
              <input
                type="text"
                value={formData.ram}
                onChange={(e) => handleChange('ram', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                  errors.ram ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'
                }`}
                placeholder="32GB DDR4"
              />
              {errors.ram && <p className="text-red-400 text-sm mt-1">{errors.ram}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              placeholder="Descrição adicional do sistema..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              Adicionar Sistema
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 