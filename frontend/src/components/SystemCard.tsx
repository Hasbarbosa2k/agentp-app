import React, { useState, useEffect, useRef } from 'react';
import { Server, HardDrive, Wifi, MoreVertical, Play, FileText, Activity, Edit, Trash2 } from 'lucide-react';
import { useTest } from '../contexts/TestContext';
import { useToast } from '../contexts/ToastContext';
import { systemsService, uiTestsService } from '../services';

interface System {
  id: string;
  name: string;
  type: 'web' | 'database' | 'api' | 'mobile';
  ip: string;
  os: string;
  owner: string;
  status: 'online' | 'offline' | 'maintenance';
  cpu: string;
  ram: string;
  uptime: string;
  lastTest: string;
  description?: string;
  // Futuro: onboarding/script status display
}

interface SystemCardProps {
  system: System;
  onViewProfile?: (system: System) => void;
  onEditSystem?: (system: System) => void;
  onDeleteSystem?: (system: System) => void;
}

export const SystemCard: React.FC<SystemCardProps> = ({ system, onViewProfile, onEditSystem, onDeleteSystem }) => {
  const { addTest } = useTest();
  const { showToast } = useToast();
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const formatDateTime = (value: string): string => {
    if (!value || value === 'N/A') return 'N/A';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    try {
      return date.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch {
      return date.toISOString();
    }
  };

  const handleRunUITest = async () => {
    try {
      // Try to get system by name to obtain slug via systems list
      // In this component we don't have slug; best effort by fetching list and matching name
      const { systems } = await systemsService.getSystems({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
      const matched = systems.find(s => s.name === system.name);
      const systemSlug = matched?.slug;
      if (!systemSlug) {
        showToast('Could not identify system (missing slug).', 'error');
        return;
      }

      const url = `http://${system.ip}`;

      console.log('📤 [UI-TESTS] Enviando criação de teste UI (SystemCard)...', {
        systemSlug,
        url,
        description: `UI Test - ${system.name}`,
        extraDescription: `Test the user interface of ${system.name}`,
      });
      await uiTestsService.createUiTest({
        systemSlug,
        url,
        description: `UI Test - ${system.name}`,
        extraDescription: `Test the user interface of ${system.name}`,
      });

      const test = {
        name: `UI Test - ${system.name}`,
        type: 'ui' as const,
        system: system.name,
        prompt: `Test the user interface of ${system.name}`,
        url,
      };
      addTest(test);
      showToast(`UI test started for ${system.name}`, 'success');
    } catch (error: any) {
      console.error('❌ [UI-TESTS] Failed to start UI test:', error);
      showToast(error?.message || 'Failed to start UI test', 'error');
    }
  };

  const handleRunOSTest = () => {
    const test = {
      name: `OS Test - ${system.name}`,
      type: 'performance' as const,
      system: system.name,
      prompt: `Run system performance and health checks on ${system.name}`,
    };
    addTest(test);
    showToast(`OS test started for ${system.name}`, 'success');
  };

  const getStatusColor = (status: System['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'offline':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      case 'maintenance':
        return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
    }
  };

  const getTypeIcon = (type: System['type']) => {
    switch (type) {
      case 'web':
        return <Wifi size={16} className="text-blue-400" />;
      case 'database':
        return <HardDrive size={16} className="text-purple-400" />;
      case 'api':
        return <Activity size={16} className="text-green-400" />;
      case 'mobile':
        return <Server size={16} className="text-orange-400" />;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevenir propagação se clicou num botão
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (onViewProfile) {
      onViewProfile(system);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(false);
    if (onEditSystem) {
      onEditSystem(system);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(false);
    if (onDeleteSystem) {
      onDeleteSystem(system);
    }
  };

  const handleActionsToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  return (
    <div 
      className={`relative bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 transition-all duration-300 group overflow-hidden ${
        onViewProfile ? 'cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-400/10' : 'hover:scale-[1.01]'
      } hover:border-green-400/50 hover:bg-gray-800/90`}
      onClick={handleCardClick}
      style={{
        background: 'linear-gradient(135deg, rgb(31, 41, 55) 0%, rgb(17, 24, 39) 100%)'
      }}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-400/5 via-blue-400/5 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
      
      {/* Animated border effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-400/20 via-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10"></div>
      
      {/* Content wrapper with relative positioning */}
      <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            {getTypeIcon(system.type)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors duration-300 group-hover:translate-x-1">{system.name}</h3>
            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{system.ip}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs border transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg ${getStatusColor(system.status)} group-hover:brightness-125`}>
            {system.status}
          </span>
          
          {/* Actions Dropdown */}
          <div className="relative" ref={actionsRef}>
            <button 
              onClick={handleActionsToggle}
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-gray-400 hover:text-white transform hover:scale-110 hover:rotate-90"
            >
              <MoreVertical size={16} />
            </button>
            
            {/* Dropdown Menu */}
            {showActions && (
              <div className="absolute right-0 top-6 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={handleEditClick}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4 group-hover:bg-gray-800/50 group-hover:p-3 group-hover:rounded-lg transition-all duration-300">
        <div className="flex justify-between text-sm transform group-hover:translate-x-1 transition-transform duration-300">
          <span className="text-gray-400 group-hover:text-green-400 transition-colors duration-300">OS:</span>
          <span className="text-white group-hover:text-gray-100 transition-colors duration-300">{system.os}</span>
        </div>
        <div className="flex justify-between text-sm transform group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '50ms' }}>
          <span className="text-gray-400 group-hover:text-blue-400 transition-colors duration-300">Owner:</span>
          <span className="text-white group-hover:text-gray-100 transition-colors duration-300">{system.owner}</span>
        </div>
        <div className="flex justify-between text-sm transform group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
          <span className="text-gray-400 group-hover:text-purple-400 transition-colors duration-300">Uptime:</span>
          <span className="text-white group-hover:text-gray-100 transition-colors duration-300">{system.uptime}</span>
        </div>
        <div className="flex justify-between text-sm transform group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '150ms' }}>
          <span className="text-gray-400 group-hover:text-yellow-400 transition-colors duration-300">Last Test:</span>
          <span className="text-white group-hover:text-gray-100 transition-colors duration-300" title={system.lastTest}>
            {formatDateTime(system.lastTest)}
          </span>
        </div>
        {/* Espaço para futuros displays vindos da API (onboardingStatusDisplay, statusDisplay) */}
      </div>

      {onViewProfile && (
        <div className="text-center mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
          <span className="text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20 animate-pulse">
            Click to view full profile
          </span>
        </div>
      )}

      <div className="flex space-x-2 transform group-hover:scale-105 transition-transform duration-300">
        <button 
          onClick={handleRunUITest}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-400/10 border border-green-400/20 rounded-lg hover:bg-green-400/30 hover:scale-105 hover:shadow-lg hover:shadow-green-400/25 transition-all duration-200 group/btn"
        >
          <div className="transform group-hover/btn:rotate-12 transition-transform duration-200">
            <Play size={14} />
          </div>
          <span className="text-sm text-green-400 hidden sm:inline group-hover/btn:text-green-300 transition-colors">Test UI</span>
        </button>
        <button 
          onClick={handleRunOSTest}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-400/10 border border-blue-400/20 rounded-lg hover:bg-blue-400/30 hover:scale-105 hover:shadow-lg hover:shadow-blue-400/25 transition-all duration-200 group/btn"
        >
          <div className="transform group-hover/btn:scale-110 transition-transform duration-200">
            <Server size={14} />
          </div>
          <span className="text-sm text-blue-400 hidden sm:inline group-hover/btn:text-blue-300 transition-colors">Test OS</span>
        </button>
        <button className="flex items-center justify-center px-3 py-2 bg-purple-400/10 border border-purple-400/20 rounded-lg hover:bg-purple-400/30 hover:scale-105 hover:shadow-lg hover:shadow-purple-400/25 transition-all duration-200 group/btn">
          <div className="transform group-hover/btn:rotate-12 transition-transform duration-200">
            <FileText size={14} className="text-purple-400 group-hover/btn:text-purple-300 transition-colors" />
          </div>
        </button>
      </div>
      </div> {/* Close content wrapper */}
    </div>
  );
};