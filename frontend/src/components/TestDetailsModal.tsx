import React, { useState, useEffect } from 'react';
import { X, Clock, Server, Play, Pause, Square, Trash2, RotateCcw, CheckCircle, AlertCircle, Info, User, Calendar, Tag, Target, TrendingUp, Activity, Eye, Image as ImageIcon, Video } from 'lucide-react';
import { RunningTest } from '../contexts/TestContext';
import { testsService, type TestDetails, type TestExecution } from '../services/tests.service';
import { agentService } from '../services/agent.service';

interface TestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: RunningTest;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TestDetailsModal: React.FC<TestDetailsModalProps> = ({
  isOpen,
  onClose,
  test,
  onPause,
  onStop,
  onRestart,
  onDelete,
}) => {
  const [testDetails, setTestDetails] = useState<TestDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'suites' | 'history'>('overview');
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [artifactsFolderUrl, setArtifactsFolderUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen && test.id) {
      loadTestDetails();
      if (test.type === 'ui' && test.status === 'completed') {
        loadArtifacts();
      } else {
        setScreenshots([]);
        setVideoUrl(undefined);
        setArtifactsFolderUrl(undefined);
      }
    }
  }, [isOpen, test.id]);

  const loadTestDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('📋 Loading full test details:', test.id);
      
      // TEMPORARY: For demonstration, simulate loading
      // In production: const details = await testsService.getTestDetails(test.id);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mocked data only for UI demonstration
      const mockDetails: TestDetails = {
        id: test.id,
        title: test.name,
        description: test.description || `Comprehensive test for ${test.name}`,
        systemInfo: test.system,
        features: ['Authentication', 'Navigation', 'Core functionalities'],
        context: 'Automated testing environment',
        constraints: 'Run in modern browsers',
        scope: ['functional', 'security'],
        status: 'active',
        isTemplate: false,
        tags: ['automation', test.type, 'critical'],
        testTypes: [test.type, 'functional'],
        testEnvironments: ['testing', 'staging'],
        estimatedDuration: '45 minutes',
        totalTestCases: 12,
        testSuites: [
          {
            name: 'Authentication',
            description: 'Login and logout tests',
            priority: 'High',
            testCases: [
              {
                id: 'tc001',
                title: 'Login with valid credentials',
                description: 'Verify successful login',
                steps: test.aiPlan || [
                  'Navigate to login page',
                  'Enter valid email',
                  'Enter valid password',
                  'Click the Sign In button',
                  'Verify redirect'
                ],
                expectedResult: 'Login completed successfully',
                estimatedTime: '3 minutes',
                priority: 'High'
              }
            ]
          }
        ],
        statistics: {
          totalSuites: 2,
          totalTestCases: 12,
          priorityBreakdown: {
            Critical: 2,
            High: 5,
            Medium: 4,
            Low: 1
          }
        },
        recentExecutions: [
          {
            id: 'exec001',
            executedAt: new Date().toISOString(),
            executedBy: {
              username: 'current_user',
              email: 'user@company.com',
              displayName: 'Current User'
            },
            environment: 'testing',
            status: test.status === 'running' ? 'running' : 'completed',
            progress: {
              completed: Math.floor(test.progress / 10),
              total: 10
            },
            results: {
              passed: 8,
              failed: 1,
              skipped: 0,
              total: 9
            },
            duration: '25 minutes',
            passRate: test.progress > 90 ? 95 : 75,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdBy: {
          username: 'admin',
          email: 'admin@company.com',
          displayName: 'Administrator'
        },
        updatedBy: {
          username: 'current_user',
          email: 'user@company.com',
          displayName: 'Current User'
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setTestDetails(mockDetails);
      
      console.log('✅ Detalhes carregados (MOCK):', {
        title: mockDetails.title,
        suites: mockDetails.testSuites.length,
        executions: mockDetails.recentExecutions.length
      });
      
      console.log('ℹ️ NOTA: Usando dados mockados para demonstração da interface.');
      console.log('🔧 Para dados reais, integre com: await testsService.getTestDetails(realTestId)');
      
    } catch (error) {
      console.error('❌ Error loading details:', error);
      setError(error instanceof Error ? error.message : 'Error loading test details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadArtifacts = async () => {
    try {
      setIsLoadingArtifacts(true);
      setArtifactsError(null);
      const id = test.uiTestId || test.id;
      console.log('📦 [UI-ASSETS] Loading artifacts in details modal:', { id, name: test.name });
      const { videoUrl, screenshots } = await agentService.getAssets(id);
      console.log('📦 [UI-ASSETS] Artifacts loaded:', { id, hasVideo: Boolean(videoUrl), screenshots: screenshots.length });
      setVideoUrl(videoUrl || undefined);
      setScreenshots(Array.isArray(screenshots) ? screenshots : []);
      setArtifactsFolderUrl(undefined);
    } catch (error: any) {
      console.error('❌ [UI-ASSETS] Failed to load artifacts:', { error: error?.message });
      setArtifactsError(error?.message || 'Failed to load test artifacts');
    } finally {
      setIsLoadingArtifacts(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStatusIcon = (status: RunningTest['status']) => {
    switch (status) {
      case 'running':
        return <Play className="text-green-400" size={20} />;
      case 'paused':
        return <Pause className="text-yellow-400" size={20} />;
      case 'completed':
        return <CheckCircle className="text-blue-400" size={20} />;
      case 'failed':
        return <AlertCircle className="text-red-400" size={20} />;
      default:
        return <Info className="text-gray-400" size={20} />;
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'running': return 'text-blue-400 bg-blue-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      case 'cancelled': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the test "${test.name}"?`)) {
      onDelete(test.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            {getStatusIcon(test.status)}
            <div>
              <h2 className="text-xl font-semibold text-white">{test.name}</h2>
              {test.uiTestId && (
                <span className="text-xs font-mono text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded inline-block mt-1">
                  ID: {test.uiTestId}
                </span>
              )}
              {testDetails && (
                <p className="text-gray-400 text-sm mt-1">{testDetails.systemInfo}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'suites', label: 'Test Suites', icon: Target },
            { id: 'history', label: 'History', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-green-400 border-b-2 border-green-400 bg-green-400/5'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
              <span className="ml-3 text-gray-400">Loading details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-red-400 mb-2">Error loading details</h3>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={loadTestDetails}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && testDetails && (
                <div className="space-y-6">
                  {/* Basic Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="text-blue-400" size={16} />
                        <span className="text-gray-400 text-sm">Test Suites</span>
                      </div>
                      <p className="text-white text-lg font-semibold">{testDetails.statistics.totalSuites}</p>
                    </div>
                    
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="text-green-400" size={16} />
                        <span className="text-gray-400 text-sm">Test Cases</span>
                      </div>
                      <p className="text-white text-lg font-semibold">{testDetails.statistics.totalTestCases}</p>
                    </div>
                    
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="text-yellow-400" size={16} />
                        <span className="text-gray-400 text-sm">Duration</span>
                      </div>
                      <p className="text-white text-lg font-semibold">{testDetails.estimatedDuration}</p>
                    </div>
                    
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="text-purple-400" size={16} />
                        <span className="text-gray-400 text-sm">Executions</span>
                      </div>
                      <p className="text-white text-lg font-semibold">{testDetails.recentExecutions.length}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-gray-300">{testDetails.description}</p>
                    </div>
                  </div>

                  {/* Features */}
                  {testDetails.features && testDetails.features.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Features</h3>
                      <div className="flex flex-wrap gap-2">
                        {testDetails.features.map((feature, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {testDetails.tags && testDetails.tags.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {testDetails.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-600 text-gray-300 rounded-full text-sm flex items-center space-x-1"
                          >
                            <Tag size={12} />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priority Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Priority Distribution</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(testDetails.statistics.priorityBreakdown).map(([priority, count]) => (
                        <div key={priority} className="bg-gray-700/50 p-3 rounded-lg text-center">
                          <div className={`text-xs px-2 py-1 rounded border ${getPriorityColor(priority)} mb-2`}>
                            {priority}
                          </div>
                          <p className="text-white font-semibold">{count}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="text-green-400" size={16} />
                          <span className="text-gray-400 text-sm">Created by</span>
                        </div>
                        <p className="text-white">{testDetails.createdBy.displayName}</p>
                        <p className="text-gray-400 text-sm">{testDetails.createdBy.email}</p>
                      </div>
                      
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Calendar className="text-blue-400" size={16} />
                          <span className="text-gray-400 text-sm">Created at</span>
                        </div>
                        <p className="text-white">{formatDate(testDetails.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Suites Tab */}
              {activeTab === 'suites' && testDetails && (
                <div className="space-y-6">
                  {testDetails.testSuites.map((suite, suiteIndex) => (
                    <div key={suiteIndex} className="bg-gray-700/30 rounded-lg overflow-hidden">
                      <div className="p-4 border-b border-gray-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{suite.name}</h3>
                            <p className="text-gray-400">{suite.description}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs border ${getPriorityColor(suite.priority)}`}>
                            {suite.priority}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="space-y-4">
                          {suite.testCases.map((testCase, caseIndex) => (
                            <div key={caseIndex} className="bg-gray-800/50 p-4 rounded-lg">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-white mb-1">{testCase.title}</h4>
                                  <p className="text-gray-400 text-sm">{testCase.description}</p>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  <div className={`px-2 py-1 rounded text-xs border ${getPriorityColor(testCase.priority)}`}>
                                    {testCase.priority}
                                  </div>
                                  <span className="text-gray-400 text-xs">{testCase.estimatedTime}</span>
                                </div>
                              </div>
                              
                              {/* Steps */}
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium text-gray-300">Steps:</h5>
                                {testCase.steps.map((step, stepIndex) => (
                                  <div key={stepIndex} className="flex items-start space-x-3 text-sm">
                                    <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                      {stepIndex + 1}
                                    </span>
                                    <span className="text-gray-300">{step}</span>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Expected Result */}
                              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <span className="text-green-400 text-sm font-medium">Expected Result:</span>
                                <p className="text-gray-300 text-sm mt-1">{testCase.expectedResult}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && testDetails && (
                <div className="space-y-4">
                  {testDetails.recentExecutions.length > 0 ? (
                    testDetails.recentExecutions.map((execution, index) => (
                      <div key={index} className="bg-gray-700/30 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${getExecutionStatusColor(execution.status)}`} />
                            <div>
                              <p className="text-white font-medium">{execution.executedBy.displayName}</p>
                              <p className="text-gray-400 text-sm">{execution.environment}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm">{formatDate(execution.executedAt)}</p>
                            <p className="text-gray-400 text-xs">{execution.duration}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="text-center">
                            <p className="text-green-400 font-semibold">{execution.results.passed}</p>
                            <p className="text-gray-400 text-xs">Passed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-red-400 font-semibold">{execution.results.failed}</p>
                            <p className="text-gray-400 text-xs">Failed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-yellow-400 font-semibold">{execution.results.skipped}</p>
                            <p className="text-gray-400 text-xs">Skipped</p>
                          </div>
                          <div className="text-center">
                            <p className="text-blue-400 font-semibold">{execution.passRate}%</p>
                            <p className="text-gray-400 text-xs">Rate</p>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-green-400 h-2 rounded-full"
                            style={{ width: `${execution.passRate}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="mx-auto text-gray-500 mb-4" size={48} />
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No executions found</h3>
                      <p className="text-gray-500">This test has not been executed yet</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => test.status === 'running' ? onPause(test.id) : onRestart(test.id)}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors"
            >
              {test.status === 'running' ? <Pause size={16} /> : <Play size={16} />}
              <span>{test.status === 'running' ? 'Pausar' : 'Retomar'}</span>
            </button>
            
            <button
              onClick={() => onRestart(test.id)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              <span>Reiniciar</span>
            </button>
            
            <button
              onClick={() => onStop(test.id)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Square size={16} />
              <span>Parar</span>
            </button>
          </div>

          <button
            onClick={handleDelete}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            <span>Apagar Teste</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 