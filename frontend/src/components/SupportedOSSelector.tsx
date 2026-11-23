import React from 'react';
import { X, Plus } from 'lucide-react';

interface SupportedOSSelectorProps {
  selectedOS: string[];
  onOSChange: (osList: string[]) => void;
  className?: string;
}

const COMMON_OS_OPTIONS = [
  'Ubuntu 24.04.2 LTS',
  'Ubuntu 22.04 LTS', 
  'Ubuntu 20.04 LTS',
  'ubuntu',
  'centos', 
  'rhel',
  'CentOS 8',
  'CentOS 7',
  'Red Hat Enterprise Linux',
  'Debian 11',
  'debian',
  'fedora',
  'alpine'
];

export default function SupportedOSSelector({ 
  selectedOS, 
  onOSChange, 
  className = '' 
}: SupportedOSSelectorProps) {
  const [customOS, setCustomOS] = React.useState('');
  const [showCustomInput, setShowCustomInput] = React.useState(false);

  const toggleOS = (os: string) => {
    if (selectedOS.includes(os)) {
      onOSChange(selectedOS.filter(item => item !== os));
    } else {
      onOSChange([...selectedOS, os]);
    }
  };

  const addCustomOS = () => {
    if (customOS.trim() && !selectedOS.includes(customOS.trim())) {
      onOSChange([...selectedOS, customOS.trim()]);
      setCustomOS('');
      setShowCustomInput(false);
    }
  };

  const removeOS = (os: string) => {
    onOSChange(selectedOS.filter(item => item !== os));
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Sistemas Operacionais Suportados
      </label>
      
      {/* Selected OS Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {selectedOS.map((os) => (
          <div
            key={os}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
          >
            <span>{os}</span>
            <button
              type="button"
              onClick={() => removeOS(os)}
              className="text-blue-200 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Common OS Options */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
        {COMMON_OS_OPTIONS.map((os) => (
          <button
            key={os}
            type="button"
            onClick={() => toggleOS(os)}
            className={`px-3 py-2 rounded text-sm transition-colors ${
              selectedOS.includes(os)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {os}
          </button>
        ))}
      </div>

      {/* Custom OS Input */}
      {showCustomInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={customOS}
            onChange={(e) => setCustomOS(e.target.value)}
            placeholder="Nome do sistema operacional"
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addCustomOS()}
          />
          <button
            type="button"
            onClick={addCustomOS}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Adicionar
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              setCustomOS('');
            }}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar OS Personalizado
        </button>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Selecione os sistemas operacionais que este template suporta. O template só poderá ser usado em sistemas compatíveis.
      </p>
    </div>
  );
}