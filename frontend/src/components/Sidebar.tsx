import React from 'react';
import { 
  LayoutDashboard, 
  Server, 
  Play, 
  Clock, 
  FileText, 
  Settings, 
  X,
  ChevronRight,
  ChevronLeft,
  LogOut,
  User,
  Bell
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  currentPage: string;
  onPageChange: (page: string) => void;
  onClose: () => void;
  onToggleCollapse: () => void;
  onLogout?: () => void;
  userName?: string;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'System Inventory', icon: Server },
  { id: 'alarms', label: 'Alarms', icon: Bell },
  { id: 'running', label: 'Tests', icon: Play },
  { id: 'history', label: 'Test History', icon: Clock },
  { id: 'docs', label: 'Documentation', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  currentPage,
  onPageChange,
  onClose,
  onToggleCollapse,
  onLogout,
  userName = "QA Engineer",
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-16 bottom-0 
        ${isCollapsed ? 'w-16' : 'w-64'} 
        bg-gray-800/95 backdrop-blur-md border-r border-gray-700 
        transform transition-all duration-300 z-50 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0
        overflow-y-auto
      `}>
        <div className="p-4">
          <div className={`flex items-center justify-between mb-6 ${isCollapsed ? 'lg:justify-center' : ''} lg:hidden`}>
            {!isCollapsed && <h2 className="text-lg font-semibold text-white">Menu</h2>}
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Section with Collapse Button */}
          <div className={`mb-6 ${isCollapsed ? 'text-center' : ''}`}>
            <div className={`bg-gray-700/50 rounded-lg p-3 ${isCollapsed ? 'px-2' : ''} relative`}>
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                  <User size={16} className="text-gray-900" />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{userName}</p>
                    <p className="text-xs text-gray-400">Agent Operator</p>
                  </div>
                )}
              </div>
              
              {/* Collapse/Expand button - Desktop only */}
              <div className="hidden lg:block absolute top-2 right-2">
                <button
                  onClick={onToggleCollapse}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded-md transition-colors"
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
              </div>
            </div>
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-green-400/20 to-blue-400/20 text-white border border-green-400/30' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                    <Icon size={18} className={isActive ? 'text-green-400' : ''} />
                    {!isCollapsed && <span className="font-medium">{item.label}</span>}
                  </div>
                  {isActive && !isCollapsed && (
                    <ChevronRight size={16} className="text-green-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          {onLogout && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={onLogout}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-start px-4'} py-3 rounded-lg transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-400/10`}
                title={isCollapsed ? 'Logout' : ''}
              >
                <LogOut size={18} />
                {!isCollapsed && <span className="ml-3 font-medium">Logout</span>}
              </button>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className={`absolute bottom-4 ${isCollapsed ? 'left-2 right-2' : 'left-4 right-4'}`}>
          <div className="bg-gray-700 rounded-lg p-3">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'}`}>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {!isCollapsed && <span className="text-sm text-gray-300">Systems Online</span>}
            </div>
            {!isCollapsed && <div className="text-xs text-gray-400 mt-1">
              Last sync: 2 min ago
            </div>}
          </div>
        </div>
      </aside>
    </>
  );
};