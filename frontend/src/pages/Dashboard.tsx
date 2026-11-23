import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Server, 
  FileText,
  Play,
  TrendingUp
} from 'lucide-react';
import { SystemStatusCard } from '../components/SystemStatusCard';
import { RecentTestsCard } from '../components/RecentTestsCard';
import { LiveTerminal } from '../components/LiveTerminal';
import { AddTestModal, NewTest } from '../components/AddTestModal';
import { BrowserView } from '../components/BrowserView';
import { useTest } from '../contexts/TestContext';
import { useToast } from '../contexts/ToastContext';
import { systemsService } from '../services/systems.service';
import { uiTestsService } from '../services';

interface SystemStats {
  overview: {
    totalSystems: number;
    onlineSystems: number;
    offlineSystems: number;
    maintenanceSystems: number;
    unknownSystems: number;
    uptimePercentage: string;
  };
}

interface TestRun {
  _id: string;
  testId: string;
  displayName?: string;
  status: 'completed' | 'failed' | 'running' | 'queued';
  startedAt?: string;
  completedAt?: string;
  systemSlug?: string;
  testType?: string;
}

export const Dashboard: React.FC = () => {
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [showBrowserView, setShowBrowserView] = useState(false);
  const [currentBrowserTest, setCurrentBrowserTest] = useState<{ url: string; name: string } | null>(null);
  const { addTest, runningTests } = useTest();
  const { showToast } = useToast();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [recentTests, setRecentTests] = useState<TestRun[]>([]);
  const [testStats, setTestStats] = useState({ failed: 0, successRate: '0%' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSystemStats(),
        loadRecentTests()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      // O extractApiData retorna response.data.data, que já contém { overview: {...} }
      const data = await systemsService.getSystemStats();
      // O tipo SystemStats no serviço não corresponde ao formato real da API
      // A API retorna { overview: {...}, environmentDistribution: [...], ... }
      if (data && (data as any).overview) {
        setSystemStats({ overview: (data as any).overview });
      } else {
        // Fallback: buscar diretamente
        const { api } = await import('../services/api');
        const rawResponse = await api.get('/systems/stats');
        if (rawResponse.data?.success && rawResponse.data?.data?.overview) {
          setSystemStats({ overview: rawResponse.data.data.overview });
        } else {
          setSystemStats({
            overview: {
              totalSystems: 0,
              onlineSystems: 0,
              offlineSystems: 0,
              maintenanceSystems: 0,
              unknownSystems: 0,
              uptimePercentage: '0%'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading system stats:', error);
      setSystemStats({
        overview: {
          totalSystems: 0,
          onlineSystems: 0,
          offlineSystems: 0,
          maintenanceSystems: 0,
          unknownSystems: 0,
          uptimePercentage: '0%'
        }
      });
    }
  };

  const loadRecentTests = async () => {
    try {
      const response = await uiTestsService.listRuns({ limit: 10 });
      const tests = response.data?.items || [];
      setRecentTests(tests);
      
      // Calcular estatísticas de testes
      const completedTests = tests.filter((t: TestRun) => t.status === 'completed' || t.status === 'failed');
      const failedTests = tests.filter((t: TestRun) => t.status === 'failed');
      const successCount = completedTests.length - failedTests.length;
      const successRate = completedTests.length > 0 
        ? Math.round((successCount / completedTests.length) * 100)
        : 0;
      
      setTestStats({
        failed: failedTests.length,
        successRate: `${successRate}%`
      });
    } catch (error) {
      console.error('Error loading recent tests:', error);
    }
  };

  const handleAddTest = (test: NewTest) => {
    addTest(test);
    showToast(`Test "${test.name}" started successfully!`, 'success');
    
    // Show browser view for UI tests
    if (test.type === 'ui' && test.url) {
      setCurrentBrowserTest({ url: test.url, name: test.name });
      setShowBrowserView(true);
    }
    
    // Recarregar dados após adicionar teste
    setTimeout(loadDashboardData, 1000);
  };

  const stats = [
    {
      title: 'Active Systems',
      value: systemStats?.overview.totalSystems.toString() || '0',
      change: systemStats?.overview.onlineSystems ? `+${systemStats.overview.onlineSystems}` : '0',
      icon: Server,
      color: 'green' as const,
    },
    {
      title: 'Running Tests',
      value: runningTests.length.toString(),
      change: runningTests.length > 0 ? `+${runningTests.length}` : '0',
      icon: Play,
      color: 'blue' as const,
    },
    {
      title: 'Failed Tests',
      value: testStats.failed.toString(),
      change: testStats.failed > 0 ? `-${testStats.failed}` : '0',
      icon: AlertTriangle,
      color: 'red' as const,
    },
    {
      title: 'Success Rate',
      value: testStats.successRate,
      change: testStats.successRate !== '0%' ? '+0%' : '0%',
      icon: TrendingUp,
      color: testStats.successRate === '100%' ? 'green' as const : 'green' as const,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-400/10 to-blue-400/10 border border-green-400/20 rounded-lg p-6 sm:p-8 hover:border-green-400/30 transition-colors">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Welcome to AgentP</h1>
        <p className="text-gray-300 text-sm sm:text-base">
          Your intelligent QA copilot is ready to execute tests and generate documentation.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <SystemStatusCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recent Tests */}
        <div className="lg:col-span-2">
          <RecentTestsCard tests={recentTests} loading={loading} />
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setShowAddTestModal(true)}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-green-400/10 border border-green-400/20 rounded-lg hover:bg-green-400/20 transition-colors"
              >
                <Play size={16} className="text-green-400" />
                <span className="text-white">Run UI Test</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-400/10 border border-blue-400/20 rounded-lg hover:bg-blue-400/20 transition-colors">
                <Server size={16} className="text-blue-400" />
                <span className="text-white">Test OS</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-4 py-3 bg-purple-400/10 border border-purple-400/20 rounded-lg hover:bg-purple-400/20 transition-colors">
                <FileText size={16} className="text-purple-400" />
                <span className="text-white">Generate Doc</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Terminal */}
      <div className="mt-6">
        <LiveTerminal />
      </div>

      {/* Add Test Modal */}
      <AddTestModal
        isOpen={showAddTestModal}
        onClose={() => setShowAddTestModal(false)}
        onAddTest={handleAddTest}
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