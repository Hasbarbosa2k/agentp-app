import React, { useState, useEffect } from 'react';
import { Search, Plus, Server, AlertTriangle, RefreshCw } from 'lucide-react';
import { SystemCard } from '../components/SystemCard';
import { SystemProfile } from './SystemProfile';
import { AddTestModal, NewTest } from '../components/AddTestModal';
import { AddSystemModal, NewSystem } from '../components/AddSystemModal';
import { EditSystemModal } from '../components/EditSystemModal';
import { DeleteSystemModal } from '../components/DeleteSystemModal';
import { BrowserView } from '../components/BrowserView';
import { useTest } from '../contexts/TestContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { systemsService, type SystemServiceInfo as SystemInfo, type CreateSystemData } from '../services';
import { authService } from '../services/auth.service';

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
  slug?: string; // Adicionar campo slug
}

export const SystemInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [showAddSystemModal, setShowAddSystemModal] = useState(false);
  const [showBrowserView, setShowBrowserView] = useState(false);
  const [currentBrowserTest, setCurrentBrowserTest] = useState<{ url: string; name: string } | null>(null);
  const [systems, setSystems] = useState<System[]>([]);
  const [isLoadingSystems, setIsLoadingSystems] = useState(true);
  const [systemsError, setSystemsError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [showSystemProfile, setShowSystemProfile] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [systemToEdit, setSystemToEdit] = useState<System | null>(null);
  const [systemToDelete, setSystemToDelete] = useState<System | null>(null);
  const { addTest } = useTest();
  const { showToast } = useToast();
  const { user } = useAuth();

  const handleAddTest = (test: NewTest) => {
    addTest(test);
    showToast(`Test "${test.name}" started successfully!`, 'success');
    
    // Show browser view for UI tests
    if (test.type === 'ui' && test.url) {
      setCurrentBrowserTest({ url: test.url, name: test.name });
      setShowBrowserView(true);
    }
  };

  const handleViewSystemProfile = (system: System) => {
    setSelectedSystem(system);
    setShowSystemProfile(true);
  };

  const handleBackFromProfile = () => {
    setShowSystemProfile(false);
    setSelectedSystem(null);
  };

  const handleEditSystem = (system: System) => {
    setSystemToEdit(system);
    setShowEditModal(true);
  };

  const handleDeleteSystem = (system: System) => {
    setSystemToDelete(system);
    setShowDeleteModal(true);
  };

  const handleSystemUpdated = (updatedSystem: System) => {
    setSystems(prev => prev.map(sys => 
      sys.id === updatedSystem.id ? updatedSystem : sys
    ));
  };

  const handleSystemDeleted = (deletedSystem: System) => {
    setSystems(prev => prev.filter(sys => sys.id !== deletedSystem.id));
  };

  // Converter SystemInfo para System (compatibilidade com componentes existentes)
  const convertSystemInfo = (systemInfo: SystemInfo): System => ({
    id: systemInfo._id,
    name: systemInfo.name,
    type: 'web', // Mapear conforme necessário
    ip: systemInfo.ip,
    os: systemInfo.os,
    owner: systemInfo.owner,
    status: systemInfo.status === 'unknown' ? 'offline' : systemInfo.status,
    cpu: 'N/A',
    ram: 'N/A',
    uptime: systemInfo.uptime || 'N/A',
    lastTest: systemInfo.lastTest || 'N/A',
    slug: systemInfo.slug, // Incluir o slug do sistema
  });

  // Carregar sistemas usando API real
  const loadSystems = async () => {
    try {
      setIsLoadingSystems(true);
      setSystemsError(null);
      
      // Debug: verificar se há token antes de fazer request
      const token = authService.getCurrentToken();
      console.log('🔑 Token disponível antes do request:', token ? 'SIM' : 'NÃO');
      console.log('🔐 isAuthenticated:', authService.isAuthenticated());
      
      const response = await systemsService.getSystems({
        page: 1,
        limit: 100, // Load all systems
        sortBy: 'name',
        sortOrder: 'asc'
      });
      
      // Log complete raw response from systems API
      console.log('🔍 [SYSTEMS-INVENTORY] Raw systems API response:');
      console.log('🔍 [RAW-SYSTEMS] Complete response:', JSON.stringify(response, null, 2));
      console.log('🔍 [RAW-SYSTEMS] Systems count:', response.systems.length);
      console.log('🔍 [RAW-SYSTEMS] Systems array:', response.systems);
      
      // Log each system in detail
      response.systems.forEach((system, index) => {
        console.log(`🔍 [RAW-SYSTEMS] System ${index + 1} (${system.name}):`, system);
        console.log(`🔍 [RAW-SYSTEMS] System ${index + 1} ID: ${system._id}`);
        console.log(`🔍 [RAW-SYSTEMS] System ${index + 1} Status: ${system.status}`);
        console.log(`🔍 [RAW-SYSTEMS] System ${index + 1} IP: ${system.ip}`);
        console.log(`🔍 [RAW-SYSTEMS] System ${index + 1} OS: ${system.os}`);
      });
      
      setSystems(response.systems.map(convertSystemInfo));
      showToast('Systems loaded successfully!', 'success');
    } catch (error) {
      console.error('Error loading systems:', error);
      setSystemsError(error instanceof Error ? error.message : 'Error loading systems');
      showToast('Error loading systems', 'error');
    } finally {
      setIsLoadingSystems(false);
    }
  };

  useEffect(() => {
    loadSystems();
  }, []);

  // Function to add new system using real API
  const handleAddSystem = async (newSystemData: NewSystem) => {
    try {
      const createData: CreateSystemData = {
        name: newSystemData.name,
        ip: newSystemData.ip,
        os: newSystemData.os,
        owner: newSystemData.owner,
        description: newSystemData.description || undefined,
        environment: 'production', // Default value
        status: 'unknown', // New system starts as unknown
      };

      const createdSystem = await systemsService.createSystem(createData);
      
      // Add to local list
      const newSystem = convertSystemInfo(createdSystem);
      setSystems(prev => [...prev, newSystem]);
      showToast(`System "${newSystem.name}" created successfully!`, 'success');
    } catch (error) {
      console.error('Error creating system:', error);
      
              // Check if it's a 403 error (no permissions)
      if (error instanceof Error && error.message.includes('Access denied')) {
        showToast('❌ Access denied: Insufficient permissions', 'error');
      } else {
        showToast('Error creating system', 'error');
      }
    }
  };

  const filteredSystems = systems.filter(system => {
    const matchesSearch = system.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         system.ip.includes(searchTerm) ||
                         system.os.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || system.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusCount = (status: string) => {
    if (status === 'all') return systems.length;
    return systems.filter(s => s.status === status).length;
  };

      // Render error state
  if (systemsError && !isLoadingSystems) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">System Inventory</h1>
            <p className="text-gray-400 mt-1">Manage and monitor all registered systems</p>
          </div>
        </div>
        
        <div className="text-center py-8 sm:py-12">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                      <h3 className="text-lg font-semibold text-red-400 mb-2">Error loading systems</h3>
          <p className="text-gray-500 mb-4">{systemsError}</p>
          <button
            onClick={loadSystems}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-400 hover:bg-blue-500 text-black rounded-lg transition-colors mx-auto"
          >
            <RefreshCw size={16} />
            <span>Tentar Novamente</span>
          </button>
        </div>
      </div>
    );
  }

  // Mostrar perfil do sistema se um sistema foi selecionado
  if (showSystemProfile && selectedSystem) {
    return (
      <SystemProfile 
        system={selectedSystem} 
        onBack={handleBackFromProfile}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Inventory</h1>
          <p className="text-gray-400 mt-1">Manage and monitor all registered systems</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={() => setShowAddSystemModal(true)}
            disabled={systemsError !== null}
            className="flex items-center space-x-2 px-4 py-2 bg-green-400 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-black rounded-lg transition-colors"
            title="Adicionar novo sistema"
          >
            <Plus size={16} />
            <span>Add System</span>
          </button>
          <button 
            onClick={() => setShowAddTestModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-400 hover:bg-blue-500 text-black rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>Add Test</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search systems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoadingSystems || systemsError !== null}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 disabled:opacity-50"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {['all', 'online', 'offline', 'maintenance'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              disabled={isLoadingSystems || systemsError !== null}
              className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                selectedFilter === filter
                  ? 'bg-green-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)} ({getStatusCount(filter)})
            </button>
          ))}
        </div>
      </div>

      {/* Systems Grid */}
      {isLoadingSystems ? (
        <div className="text-center py-8 sm:py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">Loading systems...</h3>
          <p className="text-gray-500">Please wait while we fetch system information.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
            {filteredSystems.map((system, index) => (
              <div 
                key={system.id}
                className="animate-fade-in"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both'
                }}
              >
                <SystemCard 
                  system={system} 
                  onViewProfile={handleViewSystemProfile}
                  onEditSystem={handleEditSystem}
                  onDeleteSystem={handleDeleteSystem}
                />
              </div>
            ))}
          </div>

          {filteredSystems.length === 0 && !systemsError && (
            <div className="text-center py-8 sm:py-12">
              <Server className="mx-auto text-gray-600 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No systems found</h3>
              <p className="text-gray-500">Try adjusting your search filters</p>
            </div>
          )}
        </>
      )}

      {/* Add Test Modal */}
      <AddTestModal
        isOpen={showAddTestModal}
        onClose={() => setShowAddTestModal(false)}
        onAddTest={handleAddTest}
      />

      {/* Add System Modal */}
      <AddSystemModal
        isOpen={showAddSystemModal}
        onClose={() => setShowAddSystemModal(false)}
        onAddSystem={handleAddSystem}
      />

      {/* Edit System Modal */}
      <EditSystemModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSystemToEdit(null);
        }}
        system={systemToEdit}
        onSystemUpdated={handleSystemUpdated}
      />

      {/* Delete System Modal */}
      <DeleteSystemModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSystemToDelete(null);
        }}
        system={systemToDelete}
        onSystemDeleted={handleSystemDeleted}
      />

      {/* Browser View */}
      {currentBrowserTest && (
        <BrowserView
          isOpen={showBrowserView}
          onClose={() => setShowBrowserView(false)}
          url={currentBrowserTest.url}
          testName={currentBrowserTest.name}
        />
      )}
    </div>
  );
};