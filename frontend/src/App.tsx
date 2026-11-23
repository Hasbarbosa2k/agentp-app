import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ParticleBackground } from './components/ParticleBackground';
import { CommandPalette } from './components/CommandPalette';
import { Toast } from './components/Toast';
import { Dashboard } from './pages/Dashboard';
import { RunningTests } from './pages/RunningTests';
import { TestHistory } from './pages/TestHistory';
import { SystemInventory } from './pages/SystemInventory';
import { Documentation } from './pages/Documentation';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Alarms } from './pages/Alarms';
import { TestProvider } from './contexts/TestContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';

type Page = 'dashboard' | 'inventory' | 'alarms' | 'running' | 'history' | 'docs' | 'settings';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const { user, isAuthenticated, isLoading, error, login, logout, clearError } = useAuth();
  const { showToast } = useToast();
  // Forçar remontagem do SystemInventory para voltar à lista quando já estiver nessa página
  const [inventoryKey, setInventoryKey] = useState(0);

  const handleLogin = async (email: string, password: string) => {
    try {
      clearError();
      await login({ email, password });
      showToast('Login successful!', 'success');
    } catch (error) {
      // O erro já é gerido no AuthContext
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentPage('dashboard');
      showToast('Logout successful', 'info');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'running':
        return <RunningTests />;
      case 'history':
        return <TestHistory />;
      case 'inventory':
        return <SystemInventory key={inventoryKey} />;
      case 'alarms':
        return <Alarms />;
      case 'docs':
        return <Documentation />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  const handlePageChange = (page: string) => {
    if (['dashboard', 'inventory', 'alarms', 'running', 'history', 'docs', 'settings'].includes(page)) {
      // Se já estamos no inventory e o utilizador clicar novamente, forçar remontagem
      if (page === 'inventory' && currentPage === 'inventory') {
        setInventoryKey((k) => k + 1);
      }
      setCurrentPage(page as Page);
    }
  };

  // Se não estiver autenticado, mostrar página de login
  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={handleLogin}
        isLoading={isLoading}
        error={error || ''}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <ParticleBackground />
      
      {/* Header fixo */}
      <Header 
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleTheme={() => setDarkMode(!darkMode)}
        darkMode={darkMode}
      />
      
      {/* Sidebar fixo */}
      <Sidebar 
        isOpen={sidebarOpen} 
        isCollapsed={sidebarCollapsed}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
        userName={user?.displayName}
      />
      
      {/* Conteúdo principal com espaçamento para header e sidebar */}
      <main className={`
        pt-28
        ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        ml-0
        transition-all duration-300 
        min-h-screen 
        overflow-auto 
        px-4 pb-6
        sm:px-6 sm:pb-8
        lg:px-8 lg:pb-6
      `}>
        {renderCurrentPage()}
      </main>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onPageChange={handlePageChange}
      />

      <Toast />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TestProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </TestProvider>
    </AuthProvider>
  );
}

export default App;