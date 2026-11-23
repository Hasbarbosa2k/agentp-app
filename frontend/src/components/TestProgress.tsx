import React, { useState } from 'react';
import { Pause, Square, RotateCcw, Clock, Server, Monitor, Video, Info, Trash2, Image as ImageIcon, CheckCircle, XCircle, Loader2, Play } from 'lucide-react';
import { useTest } from '../contexts/TestContext';
import { RunningTest } from '../contexts/TestContext';
import { TestDetailsModal } from './TestDetailsModal';

interface TestProgressProps {
  test: RunningTest;
  onViewBrowser?: (test: RunningTest) => void;
  onViewVideo?: (test: RunningTest) => void;
  onViewScreenshots?: (test: RunningTest) => void;
}

export const TestProgress: React.FC<TestProgressProps> = ({ 
  test, 
  onViewBrowser, 
  onViewVideo,
  onViewScreenshots,
}) => {
  const { pauseTest, stopTest, restartTest, deleteTest } = useTest();
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const getStatusIcon = (status: RunningTest['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      case 'paused':
        return <Pause size={16} className="text-yellow-400" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
    }
  };

  const getStatusBorderColor = (status: RunningTest['status']) => {
    switch (status) {
      case 'running':
        return 'border-blue-500/30';
      case 'paused':
        return 'border-yellow-500/30';
      case 'completed':
        return 'border-green-500/30';
      case 'failed':
        return 'border-red-500/30';
    }
  };

  const getProgressColor = (status: RunningTest['status']) => {
    switch (status) {
      case 'running':
        return 'bg-blue-400';
      case 'paused':
        return 'bg-yellow-400';
      case 'completed':
        return 'bg-green-400';
      case 'failed':
        return 'bg-red-400';
    }
  };

  const isFinished = test.status === 'completed' || test.status === 'failed';

  return (
    <div className={`bg-gray-800/80 border ${getStatusBorderColor(test.status)} rounded-lg p-4 hover:bg-gray-800 transition-colors`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {getStatusIcon(test.status)}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{test.name}</h3>
                {test.uiTestId && (
                  <span className="text-xs font-mono text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                    {test.uiTestId}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 flex items-center gap-1 bg-gray-700/30 px-2 py-0.5 rounded">
                <Server size={10} />
                {test.system}
              </span>
            </div>
            {test.description && (
              <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">
                {test.description}
              </p>
            )}
            {test.prompt && !test.description && (
              <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">
                {test.prompt}
              </p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {test.type === 'ui' && (
            <>
              {onViewBrowser && test.url && (
                <button 
                  onClick={() => onViewBrowser(test)}
                  className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                  title="View Website"
                >
                  <Monitor size={14} />
                </button>
              )}
              {onViewVideo && (
                <button 
                  onClick={() => onViewVideo(test)}
                  className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded transition-colors"
                  title="View Recording"
                >
                  <Video size={14} />
                </button>
              )}
              {onViewScreenshots && (
                <button
                  onClick={() => onViewScreenshots(test)}
                  className="p-1.5 text-gray-400 hover:text-teal-400 hover:bg-teal-400/10 rounded transition-colors"
                  title="Screenshots"
                >
                  <ImageIcon size={14} />
                </button>
              )}
              <div className="w-px h-4 bg-gray-700 mx-0.5" />
            </>
          )}
          
          <button 
            onClick={() => setShowDetailsModal(true)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Details"
          >
            <Info size={14} />
          </button>
          
          {!isFinished && (
            <>
              <button 
                onClick={() => test.status === 'running' ? pauseTest(test.id) : restartTest(test.id)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title={test.status === 'running' ? 'Pause' : 'Resume'}
              >
                {test.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button 
                onClick={() => stopTest(test.id)}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                title="Stop"
              >
                <Square size={14} />
              </button>
            </>
          )}
          
          {isFinished && (
            <button 
              onClick={() => restartTest(test.id)}
              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
              title="Restart"
            >
              <RotateCcw size={14} />
            </button>
          )}
          
          <button 
            onClick={() => {
              if (window.confirm(`Delete test "${test.name}"?`)) {
                deleteTest(test.id);
              }
            }}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar - only show if running or paused */}
      {!isFinished && (
        <div className="mt-3 space-y-1">
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${getProgressColor(test.status)} transition-all duration-300`}
              style={{ width: `${test.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={10} />
              <span>{test.startTime}</span>
            </div>
            <span>{test.progress}%</span>
          </div>
        </div>
      )}

      {/* Completed/Failed footer */}
      {isFinished && (
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>Started: {test.startTime}</span>
          </div>
          {test.estimatedTime && test.estimatedTime !== '—' && (
            <span>Duration: {test.estimatedTime}</span>
          )}
        </div>
      )}

      {/* Test Details Modal */}
      <TestDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        test={test}
        onPause={pauseTest}
        onStop={stopTest}
        onRestart={restartTest}
        onDelete={deleteTest}
      />
    </div>
  );
};