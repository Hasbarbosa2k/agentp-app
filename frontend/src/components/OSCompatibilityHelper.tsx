import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, Copy } from 'lucide-react';
import { checkOSCompatibility, getOSSuggestions } from '../utils/osCompatibility';

interface OSCompatibilityHelperProps {
  systemOS?: string;
  templateSupportedOS: string[];
  onSupportedOSChange: (newOS: string[]) => void;
}

export default function OSCompatibilityHelper({ 
  systemOS = 'Ubuntu 24.04.2 LTS', // Default to the problematic OS
  templateSupportedOS,
  onSupportedOSChange 
}: OSCompatibilityHelperProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const compatibility = checkOSCompatibility(systemOS, templateSupportedOS);
  const suggestions = getOSSuggestions(systemOS);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const addOSToTemplate = (os: string) => {
    if (!templateSupportedOS.includes(os)) {
      onSupportedOSChange([...templateSupportedOS, os]);
    }
  };
  
  const fixCompatibility = () => {
    const newSupportedOS = [...templateSupportedOS];
    
    // Add the exact system OS
    if (!newSupportedOS.includes(systemOS)) {
      newSupportedOS.unshift(systemOS);
    }
    
    // Add top suggestions
    suggestions.suggestions.slice(0, 3).forEach(os => {
      if (!newSupportedOS.includes(os)) {
        newSupportedOS.push(os);
      }
    });
    
    onSupportedOSChange(newSupportedOS);
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-md font-semibold text-white flex items-center gap-2">
          {compatibility.compatible ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              OS Compatível
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-500" />
              OS Incompatível
            </>
          )}
        </h4>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          {showDetails ? 'Ocultar' : 'Ver'} Detalhes
        </button>
      </div>
      
      <div className="space-y-3">
        {/* System OS */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
          <div>
            <span className="text-sm text-gray-400">OS do Sistema:</span>
            <div className="text-white font-mono text-sm">{systemOS}</div>
          </div>
          <button
            onClick={() => copyToClipboard(systemOS)}
            className="p-1 text-gray-400 hover:text-white"
            title="Copiar OS"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        
        {/* Compatibility Status */}
        <div className={`p-3 rounded flex items-start gap-3 ${
          compatibility.compatible 
            ? 'bg-green-900/30 border border-green-700/50' 
            : 'bg-red-900/30 border border-red-700/50'
        }`}>
          {compatibility.compatible ? (
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="text-white font-medium mb-1">
              {compatibility.compatible 
                ? `✅ Template suporta este sistema`
                : `❌ Template NÃO suporta este sistema`
              }
            </div>
            {compatibility.exactMatch && (
              <div className="text-sm text-gray-300">
                Match encontrado: <code className="bg-gray-800 px-1 rounded">{compatibility.exactMatch}</code>
              </div>
            )}
            {!compatibility.compatible && (
              <div className="text-sm text-gray-300">
                O OS "{systemOS}" não está na lista supportedOS do template.
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Fix */}
        {!compatibility.compatible && (
          <div className="flex items-center justify-between p-3 bg-yellow-900/30 border border-yellow-700/50 rounded">
            <div>
              <div className="text-yellow-200 font-medium">Correção Rápida</div>
              <div className="text-sm text-yellow-300">Adicionar OS do sistema ao template</div>
            </div>
            <button
              onClick={fixCompatibility}
              className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
            >
              Corrigir
            </button>
          </div>
        )}
        
        {/* Detailed Information */}
        {showDetails && (
          <div className="space-y-3 border-t border-gray-600 pt-3">
            <div>
              <h5 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Template suporta:
              </h5>
              <div className="flex flex-wrap gap-2">
                {templateSupportedOS.map((os, index) => (
                  <span 
                    key={index}
                    className={`px-2 py-1 rounded text-xs font-mono ${
                      os === systemOS 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {os}
                  </span>
                ))}
              </div>
            </div>
            
            {suggestions.suggestions.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-white mb-2">
                  Sugestões de OS compatíveis:
                </h5>
                <div className="space-y-1">
                  {suggestions.suggestions.map((os, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm"
                    >
                      <code className="text-blue-300">{os}</code>
                      {!templateSupportedOS.includes(os) && (
                        <button
                          onClick={() => addOSToTemplate(os)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Adicionar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}