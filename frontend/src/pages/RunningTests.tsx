import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Play, Plus, RefreshCw, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight, FileText, Zap, Edit, Trash2 } from 'lucide-react';
import { TestProgress } from '../components/TestProgress';
import { AddTestModal, NewTest } from '../components/AddTestModal';
import { BrowserView } from '../components/BrowserView';
import { TestVideoModal } from '../components/TestVideoModal';
import { ScreenshotsModal } from '../components/ScreenshotsModal';
import { agentService } from '../services/agent.service';
import { useTest, RunningTest } from '../contexts/TestContext';
import { useToast } from '../contexts/ToastContext';
import { templatesService, type Template } from '../services';
import CreateTemplateModal from '../components/CreateTemplateModal';
import EditTemplateModal from '../components/EditTemplateModal';
import DeleteTemplateModal from '../components/DeleteTemplateModal';

const AUTO_REFRESH_INTERVAL = 5000; // 5 segundos

export const RunningTests: React.FC = () => {
  const [showQuickTestModal, setShowQuickTestModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [showBrowserView, setShowBrowserView] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentBrowserTest, setCurrentBrowserTest] = useState<{ url: string; name: string } | null>(null);
  const [currentVideoTest, setCurrentVideoTest] = useState<{ name: string; id: string } | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | undefined>(undefined);
  const [currentArtifactsFolder, setCurrentArtifactsFolder] = useState<string | undefined>(undefined);
  const { runningTests, addTest, reloadTests } = useTest();
  const [showScreenshotsModal, setShowScreenshotsModal] = useState(false);
  const [currentScreenshots, setCurrentScreenshots] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    templates: true,
    running: true,
    completed: false,
    failed: false,
  });
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<'all' | RunningTest['type']>('all');
  const [filterSystem, setFilterSystem] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Separar testes por status e aplicar filtros
  const { activeTests, completedTests, failedTests, allSystems } = useMemo(() => {
    // Aplicar filtros primeiro
    let filtered = runningTests;
    
    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    
    // Filtro por sistema
    if (filterSystem !== 'all') {
      filtered = filtered.filter(t => t.system === filterSystem);
    }
    
    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.system.toLowerCase().includes(query) ||
        t.prompt.toLowerCase().includes(query)
      );
    }
    
    // Separar por status
    const active = filtered.filter(t => t.status === 'running' || t.status === 'paused');
    const completed = filtered.filter(t => t.status === 'completed');
    const failed = filtered.filter(t => t.status === 'failed');
    
    // Extrair sistemas únicos para dropdown
    const systems = Array.from(new Set(runningTests.map(t => t.system))).sort();
    
    return { activeTests: active, completedTests: completed, failedTests: failed, allSystems: systems };
  }, [runningTests, filterType, filterSystem, searchQuery]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Auto-refresh enquanto há testes ativos
  useEffect(() => {
    const hasActiveTests = activeTests.length > 0;
    
    if (hasActiveTests) {
      autoRefreshRef.current = setInterval(() => {
        reloadTests();
      }, AUTO_REFRESH_INTERVAL);
    }
    
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [activeTests.length, reloadTests]);

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const result = await templatesService.getTemplates({
        status: 'active',
        limit: 50
      });
      setTemplates(result.templates);
      console.log('✅ [TEMPLATES] Loaded', result.templates.length, 'templates');
    } catch (error: any) {
      console.error('❌ [TEMPLATES] Failed to load templates:', error);
      showToast('Failed to load templates', 'error');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleQuickTest = async (test: NewTest) => {
    console.log('🚀 Running quick test:', test);
    addTest(test);
    showToast(`Quick test "${test.name}" started!`, 'success');
    
    // Refresh imediato após adicionar
    setTimeout(() => reloadTests(), 500);
    
    // Show browser view for UI tests
    if (test.type === 'ui' && test.url) {
      setCurrentBrowserTest({ url: test.url, name: test.name });
      setShowBrowserView(true);
    }
  };

  const handleRunTemplate = async (template: Template) => {
    try {
      console.log('🚀 Running template:', template.name);
      // TODO: Implementar execução de template
      showToast(`Template "${template.name}" execution started!`, 'success');
      setTimeout(() => reloadTests(), 500);
    } catch (error: any) {
      console.error('❌ Failed to run template:', error);
      showToast('Failed to run template', 'error');
    }
  };

  const handleTemplateCreated = () => {
    loadTemplates();
    showToast('Template created successfully!', 'success');
  };

  const handleEditTemplate = (template: Template) => {
    setTemplateToEdit(template);
    setShowEditTemplateModal(true);
  };

  const handleDeleteTemplate = (template: Template) => {
    setTemplateToDelete(template);
    setShowDeleteTemplateModal(true);
  };

  const handleTemplateUpdated = () => {
    loadTemplates();
    setShowEditTemplateModal(false);
    setTemplateToEdit(null);
  };

  const handleTemplateDeleted = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t._id !== templateId));
    setShowDeleteTemplateModal(false);
    setTemplateToDelete(null);
    loadTemplates();
  };

  const handleViewBrowser = (test: RunningTest) => {
    if (test.type === 'ui' && test.url) {
      setCurrentBrowserTest({ url: test.url, name: test.name });
      setShowBrowserView(true);
    }
  };

  const handleViewVideo = (test: RunningTest) => {
    if (test.type === 'ui') {
      setCurrentVideoTest({ name: test.name, id: test.id });
      // resolve video URL via artifacts service
      const assetId = test.uiTestId || test.id;
      console.log('🎬 [UI-ASSETS] Requesting video for test:', { assetId, displayName: test.name });
      agentService.getAssets(assetId)
        .then(({ videoUrl }) => {
          console.log('🎬 [UI-ASSETS] Video URL resolved:', { assetId, videoUrl });
          setCurrentVideoUrl(videoUrl);
        })
        .catch((error: any) => {
          const msg = error?.message || 'Failed to fetch test video';
          console.error('❌ [UI-ASSETS] Video fetch failed:', { assetId, error: msg });
          showToast(msg, 'error');
          setCurrentVideoUrl(undefined);
        })
        .finally(() => setShowVideoModal(true));
    }
  };

  const refreshRuns = async () => {
    try {
      setIsRefreshing(true);
      await reloadTests();
      setErrorMessage(null);
    } catch (error: any) {
      const msg = error?.message || 'Failed to refresh runs';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderTestSection = (
    title: string,
    tests: RunningTest[],
    sectionKey: string,
    icon: React.ReactNode,
    badgeClass: string
  ) => {
    if (tests.length === 0) return null;
    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="space-y-3">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center gap-3 w-full text-left group"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={18} className="text-gray-400" />
            ) : (
              <ChevronRight size={18} className="text-gray-400" />
            )}
            {icon}
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeClass}`}>
            {tests.length}
          </span>
        </button>
        {isExpanded && (
          <div className="space-y-3 pl-7">
            {tests.map((test) => (
              <TestProgress
                key={test.id}
                test={test}
                onViewBrowser={handleViewBrowser}
                onViewVideo={handleViewVideo}
                onViewScreenshots={handleViewScreenshots}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleViewScreenshots = async (test: RunningTest) => {
    if (test.type !== 'ui') return;
    try {
      const assetId = test.uiTestId || test.id;
      console.log('🖼️ [UI-ASSETS] Requesting screenshots for test:', { assetId, displayName: test.name });
      const { screenshots } = await agentService.getAssets(assetId);
      console.log('🖼️ [UI-ASSETS] Screenshots resolved:', { assetId, count: screenshots.length });
      setCurrentScreenshots(screenshots);
      setCurrentArtifactsFolder(undefined);
      setCurrentVideoTest({ name: test.name, id: test.id });
      setShowScreenshotsModal(true);
    } catch (error: any) {
      const msg = error?.message || 'Failed to load screenshots';
      console.error('❌ [UI-ASSETS] Screenshots fetch failed:', { error: msg });
      setCurrentScreenshots([]);
      setCurrentArtifactsFolder(undefined);
      setCurrentVideoTest({ name: test.name, id: test.id });
      setShowScreenshotsModal(true);
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tests</h1>
          <p className="text-gray-400 mt-1">Manage templates and execute tests</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Status summary badges */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-1.5 text-sm">
              <FileText size={14} className="text-purple-400" />
              <span className="text-purple-400 font-medium">{templates.length}</span>
              <span className="text-gray-500 text-xs">templates</span>
            </div>
            {activeTests.length > 0 && (
              <>
                <div className="w-px h-4 bg-gray-700" />
                <div className="flex items-center gap-1.5 text-sm">
                  <Loader2 size={14} className="text-blue-400 animate-spin" />
                  <span className="text-blue-400 font-medium">{activeTests.length}</span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              refreshRuns();
              loadTemplates();
            }}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border ${
              isRefreshing 
                ? 'bg-gray-800 text-gray-500 border-gray-700' 
                : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600'
            }`}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          
          <button
            onClick={() => setShowCreateTemplateModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-purple-500 hover:bg-purple-400 text-white font-medium rounded-lg transition-colors"
          >
            <FileText size={16} />
            <span>Create Template</span>
          </button>
          
          <button
            onClick={() => setShowQuickTestModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
          >
            <Zap size={16} />
            <span>Quick Test</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tests..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
            />
          </div>
          
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
          >
            <option value="all">All Types</option>
            <option value="ui">UI Tests</option>
            <option value="api">API Tests</option>
            <option value="database">Database Tests</option>
            <option value="performance">Performance Tests</option>
            <option value="os">OS Tests</option>
            <option value="network">Network Tests</option>
          </select>
          
          {/* System Filter */}
          <select
            value={filterSystem}
            onChange={(e) => setFilterSystem(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-400"
          >
            <option value="all">All Systems</option>
            {allSystems.map(system => (
              <option key={system} value={system}>{system}</option>
            ))}
          </select>
        </div>
        
        {/* Active filters indicator */}
        {(filterType !== 'all' || filterSystem !== 'all' || searchQuery) && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Active filters:</span>
            {filterType !== 'all' && (
              <span className="px-2 py-1 bg-blue-400/20 text-blue-400 rounded">
                Type: {filterType}
              </span>
            )}
            {filterSystem !== 'all' && (
              <span className="px-2 py-1 bg-purple-400/20 text-purple-400 rounded">
                System: {filterSystem}
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-1 bg-green-400/20 text-green-400 rounded">
                Search: "{searchQuery}"
              </span>
            )}
            <button
              onClick={() => {
                setFilterType('all');
                setFilterSystem('all');
                setSearchQuery('');
              }}
              className="text-red-400 hover:text-red-300 ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      {activeTests.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          <span>Auto-refreshing every {AUTO_REFRESH_INTERVAL / 1000}s</span>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 rounded-lg border border-red-400/30 bg-red-400/10 text-red-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Templates Section */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('templates')}
          className="flex items-center gap-3 w-full text-left group"
        >
          <div className="flex items-center gap-2">
            {expandedSections.templates ? (
              <ChevronDown size={18} className="text-gray-400" />
            ) : (
              <ChevronRight size={18} className="text-gray-400" />
            )}
            <FileText size={18} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Test Templates</h2>
          </div>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-400/20 text-purple-400">
            {templates.length}
          </span>
        </button>
        
        {expandedSections.templates && (
          <div className="space-y-3 pl-7">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 size={20} className="animate-spin mr-2" />
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <FileText className="mx-auto text-gray-600 mb-3" size={32} />
                <p className="text-gray-400 mb-4">No templates yet</p>
                <button
                  onClick={() => setShowCreateTemplateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Create First Template
                </button>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template._id}
                  className="bg-gray-800/80 border border-gray-700 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-white">{template.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-400/20 text-blue-400">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{template.steps.length} steps</span>
                        <span>{template.usage?.timesUsed || 0} uses</span>
                        {template.supportedOS && template.supportedOS.length > 0 && (
                          <span>OS: {template.supportedOS.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors"
                        title="Edit template"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors"
                        title="Delete template"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => handleRunTemplate(template)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
                      >
                        <Play size={14} />
                        Run
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Tests organized by status */}
      <div className="space-y-6">
        {renderTestSection(
          'Running',
          activeTests,
          'running',
          <Loader2 size={18} className="text-blue-400 animate-spin" />,
          'bg-blue-400/20 text-blue-400'
        )}

        {renderTestSection(
          'Completed',
          completedTests,
          'completed',
          <CheckCircle size={18} className="text-green-400" />,
          'bg-green-400/20 text-green-400'
        )}

        {renderTestSection(
          'Failed',
          failedTests,
          'failed',
          <XCircle size={18} className="text-red-400" />,
          'bg-red-400/20 text-red-400'
        )}
      </div>

      {/* Empty state */}
      {runningTests.length === 0 && templates.length === 0 && !isLoadingTemplates && (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <FileText className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No templates or tests</h3>
          <p className="text-gray-500 mb-6">Create a template or run a quick test to get started</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowCreateTemplateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-medium rounded-lg transition-colors"
            >
              <FileText size={18} />
              <span>Create Template</span>
            </button>
            <button
              onClick={() => setShowQuickTestModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
            >
              <Zap size={18} />
              <span>Quick Test</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Test Modal */}
      <AddTestModal
        isOpen={showQuickTestModal}
        onClose={() => setShowQuickTestModal(false)}
        onAddTest={handleQuickTest}
      />

      {/* Create Template Modal */}
      <CreateTemplateModal
        isOpen={showCreateTemplateModal}
        onClose={() => setShowCreateTemplateModal(false)}
        onTemplateCreated={handleTemplateCreated}
        systemId=""
      />

      {/* Edit Template Modal */}
      <EditTemplateModal
        isOpen={showEditTemplateModal}
        onClose={() => {
          setShowEditTemplateModal(false);
          setTemplateToEdit(null);
        }}
        template={templateToEdit}
        onTemplateUpdated={handleTemplateUpdated}
      />

      {/* Delete Template Modal */}
      <DeleteTemplateModal
        isOpen={showDeleteTemplateModal}
        onClose={() => {
          setShowDeleteTemplateModal(false);
          setTemplateToDelete(null);
        }}
        template={templateToDelete}
        onTemplateDeleted={handleTemplateDeleted}
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

      {/* Video Modal */}
      {currentVideoTest && (
        <TestVideoModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          testName={currentVideoTest.name}
          videoUrl={currentVideoUrl}
          artifactsFolderUrl={currentArtifactsFolder}
        />
      )}

      <ScreenshotsModal
        isOpen={showScreenshotsModal}
        onClose={() => setShowScreenshotsModal(false)}
        testName={currentVideoTest?.name || 'UI Test'}
        screenshots={currentScreenshots}
        folderUrl={currentArtifactsFolder}
      />
    </div>
  );
};