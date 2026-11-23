import React, { useState, useEffect } from 'react';
import { Monitor, Maximize2, Minimize2, X, RefreshCw, Globe } from 'lucide-react';

interface BrowserViewProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  testName: string;
}

export const BrowserView: React.FC<BrowserViewProps> = ({
  isOpen,
  onClose,
  url,
  testName,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentUrl(url);
  }, [url]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 transition-all duration-300 ${
      isFullscreen 
        ? 'inset-4' 
        : 'right-4 top-20 bottom-4 w-96 lg:w-[500px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <Monitor className="text-blue-400" size={20} />
          <div>
            <h3 className="text-white font-medium">{testName}</h3>
            <p className="text-xs text-gray-400">Live Browser View</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* URL Bar */}
      <div className="flex items-center space-x-2 p-3 bg-gray-800 border-b border-gray-700">
        <Globe className="text-gray-400" size={16} />
        <input
          type="text"
          value={currentUrl}
          onChange={(e) => setCurrentUrl(e.target.value)}
          className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-green-400"
          placeholder="Enter URL..."
        />
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-white relative overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="animate-spin text-blue-500 mx-auto mb-2" size={32} />
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center p-8">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="text-white" size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Test Website</h2>
                <p className="text-gray-600 mb-4">
                  This is a simulated browser view for testing purposes.
                </p>
                <div className="space-y-2">
                  <button className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors">
                    Login
                  </button>
                  <button className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors">
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700 rounded-b-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Test Running</span>
        </div>
        <span className="text-xs text-gray-400">
          {currentUrl || 'No URL'}
        </span>
      </div>
    </div>
  );
};