import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Maximize2, Minimize2, X } from 'lucide-react';

export const LiveTerminal: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<Array<{ text: string; type: 'info' | 'success' | 'error' | 'warning' }>>([
    { text: 'AgentP Terminal initialized...', type: 'info' },
    { text: 'Connecting to systems...', type: 'info' },
    { text: 'System A: Connected ✓', type: 'success' },
    { text: 'System B: Connected ✓', type: 'success' },
    { text: 'System C: Connection failed ✗', type: 'error' },
    { text: 'Ready to execute tests', type: 'success' },
  ]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomLogs = [
        { text: 'Running health check...', type: 'info' as const },
        { text: 'Memory usage: 64%', type: 'warning' as const },
        { text: 'Test completed successfully', type: 'success' as const },
        { text: 'API response time: 127ms', type: 'info' as const },
        { text: 'Database query executed', type: 'success' as const },
      ];
      
      const randomLog = randomLogs[Math.floor(Math.random() * randomLogs.length)];
      setLogs(prev => [...prev.slice(-10), randomLog]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg transition-all duration-300 ${
      isExpanded ? 'fixed inset-4 z-50' : 'relative'
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Terminal className="text-green-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Live Terminal</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div 
        ref={terminalRef}
        className={`p-4 font-mono text-sm overflow-y-auto ${
          isExpanded ? 'h-[calc(100vh-8rem)]' : 'h-64'
        }`}
      >
        {logs.map((log, index) => (
          <div key={index} className={`mb-1 ${getLogColor(log.type)}`}>
            <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log.text}
          </div>
        ))}
        <div className="flex items-center text-green-400">
          <span className="text-gray-500">agentp@terminal:~$</span>
          <span className="ml-2 animate-pulse">|</span>
        </div>
      </div>
    </div>
  );
};