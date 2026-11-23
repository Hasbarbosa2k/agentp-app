import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface ScreenshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  testName: string;
  screenshots: string[];
  folderUrl?: string;
}

export const ScreenshotsModal: React.FC<ScreenshotsModalProps> = ({
  isOpen,
  onClose,
  testName,
  screenshots,
  folderUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">Screenshots</h3>
            <p className="text-sm text-gray-400">{testName}</p>
          </div>
          <div className="flex items-center space-x-2">
            {folderUrl && (
              <a href={folderUrl} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Open folder">
                <ExternalLink size={18} />
              </a>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-64px)]">
          {screenshots.length === 0 ? (
            <div className="text-center text-gray-400 py-12">No screenshots available.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {screenshots.map((src, idx) => (
                <div key={idx} className="bg-black rounded-lg overflow-hidden border border-gray-700">
                  <img src={src} alt={`Screenshot ${idx + 1}`} className="w-full h-48 object-cover" />
                  <div className="p-2 text-xs text-gray-400 truncate">{decodeURIComponent(src.split('/').pop() || `screenshot-${idx + 1}`)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreenshotsModal;

