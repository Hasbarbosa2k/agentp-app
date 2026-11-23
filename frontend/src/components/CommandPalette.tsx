import React, { useState, useEffect, useCallback } from 'react';
import { Search, Zap, FileText, Play, Server, Settings } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onPageChange: (page: string) => void;
}

const commands = [
  { id: 'test-ui', label: 'Run UI Test', icon: Play, action: 'test' },
  { id: 'test-os', label: 'Run OS Test', icon: Server, action: 'test' },
  { id: 'generate-doc', label: 'Generate Documentation', icon: FileText, action: 'doc' },
  { id: 'go-dashboard', label: 'Go to Dashboard', icon: Zap, action: 'navigate', page: 'dashboard' },
  { id: 'go-inventory', label: 'Go to Inventory', icon: Server, action: 'navigate', page: 'inventory' },
  { id: 'go-settings', label: 'Go to Settings', icon: Settings, action: 'navigate', page: 'settings' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onPageChange,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleCommand = useCallback((command: typeof commands[0]) => {
    if (command.action === 'navigate' && command.page) {
      onPageChange(command.page);
    }
    onClose();
  }, [onPageChange, onClose]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          handleCommand(filteredCommands[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, handleCommand, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md mx-4 shadow-2xl">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Type a command..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
              autoFocus
            />
          </div>
        </div>

        <div className="border-t border-gray-700">
          {filteredCommands.map((command, index) => {
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                onClick={() => handleCommand(command)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                  index === selectedIndex ? 'bg-gray-700' : ''
                }`}
              >
                <Icon size={18} className="text-gray-400" />
                <span className="text-white">{command.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};