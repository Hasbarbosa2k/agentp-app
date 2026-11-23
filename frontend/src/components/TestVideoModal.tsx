import React from 'react';
import { X, Play, Download, Maximize2, ExternalLink } from 'lucide-react';

interface TestVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  testName: string;
  videoUrl?: string;
  artifactsFolderUrl?: string;
}

export const TestVideoModal: React.FC<TestVideoModalProps> = ({
  isOpen,
  onClose,
  testName,
  videoUrl,
  artifactsFolderUrl,
}) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${testName.replace(/\s+/g, '_')}_test_recording`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">Test Recording</h3>
            <p className="text-sm text-gray-400">{testName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Download Video"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => {
                const video = document.querySelector('video');
                if (video) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    video.requestFullscreen();
                  }
                }
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Fullscreen"
            >
              <Maximize2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video Content */}
        <div className="p-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            {videoUrl ? (
              <video controls className="w-full aspect-video">
                <source src={videoUrl} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="aspect-video w-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Play size={32} className="text-yellow-400 ml-1" />
                  </div>
                  <h4 className="text-white font-semibold mb-2">Video not available</h4>
                  <p className="text-gray-300 text-sm mb-4">Could not locate the video file for this test.</p>
                  {artifactsFolderUrl && (
                    <a href={artifactsFolderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300">
                      <ExternalLink size={16} />
                      <span>Open artifacts folder</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 