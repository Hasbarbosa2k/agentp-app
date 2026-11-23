import React, { useState } from 'react';
import { Menu, Bell, Zap, Command } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  darkMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onToggleTheme,
  onOpenCommandPalette,
  darkMode,
}) => {
  const [notifications] = useState([
    { id: 1, message: 'Test completed on System A', type: 'success', time: '2 min ago' },
    { id: 2, message: 'System B connection failed', type: 'error', time: '5 min ago' },
    { id: 3, message: 'Documentation generated', type: 'info', time: '10 min ago' },
  ]);
  const [notificationOpen, setNotificationOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden text-gray-300 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Zap className="text-green-400 animate-pulse" size={28} />
              <div className="absolute inset-0 text-green-400 animate-ping opacity-20">
                <Zap size={28} />
              </div>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              AgentP
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Command size={16} />
            <span className="text-sm text-gray-300">Cmd+K</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative p-2 text-gray-300 hover:text-white transition-colors"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs">
                  {notifications.length}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                <div className="p-3 border-b border-gray-700">
                  <h3 className="font-semibold text-white">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 border-b border-gray-700 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.type === 'success' ? 'bg-green-400' :
                          notification.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-white">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleTheme}
            className="p-2 text-gray-300 hover:text-white transition-colors"
          >
            {darkMode ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  );
};