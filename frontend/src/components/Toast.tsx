import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-400" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-400" size={20} />;
      case 'info':
        return <Info className="text-blue-400" size={20} />;
      default:
        return <Info className="text-blue-400" size={20} />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-400/10 border-green-400/20';
      case 'error':
        return 'bg-red-400/10 border-red-400/20';
      case 'warning':
        return 'bg-yellow-400/10 border-yellow-400/20';
      case 'info':
        return 'bg-blue-400/10 border-blue-400/20';
      default:
        return 'bg-blue-400/10 border-blue-400/20';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center space-x-3 p-4 rounded-lg border backdrop-blur-md ${getBackgroundColor(toast.type)} animate-slide-in`}
        >
          {getIcon(toast.type)}
          <span className="text-white">{toast.message}</span>
          <button 
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};