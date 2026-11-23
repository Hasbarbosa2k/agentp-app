import React, { useState, useEffect } from 'react';
import { X, Play, Server, Globe, Database, Smartphone, Monitor, Wifi, Brain, CheckSquare, Search, ChevronDown, FileText, Zap } from 'lucide-react';
import { aiService } from '../services/ai.service';
import { systemsService, type SystemInfo, uiTestsService } from '../services';
import { useToast } from '../contexts/ToastContext';

interface AddTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTest: (test: NewTest) => void;
  preSelectedSystem?: { name: string; slug: string };
  onTestCreated?: () => void;
}

export interface NewTest {
  name: string;
  type: 'ui' | 'api' | 'database' | 'performance' | 'os' | 'network';
  system: string;
  prompt: string;
  description?: string;
  aiPlan?: string[];
  url?: string;
}

const testTypes = [
  { id: 'ui', label: 'UI Test', icon: Globe, description: 'Test user interface interactions' },
  { id: 'api', label: 'API Test', icon: Server, description: 'Test API endpoints and responses' },
  { id: 'database', label: 'Database Test', icon: Database, description: 'Test database operations' },
  { id: 'performance', label: 'Performance Test', icon: Smartphone, description: 'Test system performance' },
  { id: 'os', label: 'OS Test', icon: Monitor, description: 'Test operating system functions' },
  { id: 'network', label: 'Network Test', icon: Wifi, description: 'Test network connectivity and performance' },
];

// REMOVIDO: sistemas hardcoded - agora são carregados da API real

const getPlaceholderForTestType = (type: NewTest['type']): string => {
  switch (type) {
    case 'ui':
      return 'Example: "Test login functionality with valid credentials, verify successful redirect to dashboard"';
    case 'api':
      return 'Example: "Test user registration API endpoint with valid data, verify 201 response and user creation"';
    case 'database':
      return 'Example: "Test user data persistence after registration, verify all fields are correctly stored"';
    case 'performance':
      return 'Example: "Test page load time under 3 seconds with 100 concurrent users"';
    case 'os':
      return 'Example: "Test file system permissions for upload directory, verify read/write access"';
    case 'network':
      return 'Example: "Test network connectivity between web server and database, verify latency under 50ms"';
    default:
      return 'Describe what you want to test and the expected behavior...';
  }
};

export const AddTestModal: React.FC<AddTestModalProps> = ({
  isOpen,
  onClose,
  onAddTest,
  preSelectedSystem,
  onTestCreated,
}) => {
  const [formData, setFormData] = useState<NewTest>({
    name: '',
    type: 'ui',
    system: preSelectedSystem?.name || '',
    prompt: '',
    description: '',
    aiPlan: [],
    url: '',
  });

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showSystemDropdown, setShowSystemDropdown] = useState(false);
  const [systemSearch, setSystemSearch] = useState(preSelectedSystem?.name || '');
  const [systems, setSystems] = useState<SystemInfo[]>([]);
  const [isLoadingSystems, setIsLoadingSystems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const [uiPlanData, setUiPlanData] = useState<any | null>(null);

  // Update form when preSelectedSystem changes
  useEffect(() => {
    if (preSelectedSystem) {
      setFormData(prev => ({ ...prev, system: preSelectedSystem.name }));
      setSystemSearch(preSelectedSystem.name);
    }
  }, [preSelectedSystem]);
  type UiPlanEditable = {
    title: string;
    objective: string;
    steps: string[];
    acceptanceCriteria: string[];
    url?: string;
  };
  const [uiPlanEditable, setUiPlanEditable] = useState<UiPlanEditable | null>(null);

  // Filtrar sistemas baseado na pesquisa
  const filteredSystems = systems.filter(system =>
    system.name.toLowerCase().includes(systemSearch.toLowerCase())
  );

  // Log dos sistemas filtrados para debug
  useEffect(() => {
    if (systemSearch.length > 0) {
      console.log('🔍 Pesquisa sistemas:', {
        searchTerm: systemSearch,
        totalSystems: systems.length,
        filteredCount: filteredSystems.length,
        filteredNames: filteredSystems.map(s => s.name)
      });
    }
  }, [systemSearch, systems, filteredSystems]);

  // Carregar sistemas da API
  useEffect(() => {
    const loadSystems = async () => {
      try {
        setIsLoadingSystems(true);
        console.log('🔄 Loading systems from API...');
        
        const response = await systemsService.getSystems({
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc'
        });
        
        setSystems(response.systems);
        console.log(`✅ ${response.systems.length} sistemas carregados:`, response.systems.map(s => s.name));
      } catch (error) {
        console.error('❌ Error loading systems:', error);
        setSystems([]); // Em caso de erro, lista vazia (sem mock data)
      } finally {
        setIsLoadingSystems(false);
      }
    };

    loadSystems();
  }, []);

  // Sincronizar systemSearch com formData.system
  useEffect(() => {
    setSystemSearch(formData.system);
  }, [formData.system]);

  // Função para selecionar sistema
  const handleSystemSelect = (systemName: string) => {
    // Procurar o sistema completo para log adicional
    const selectedSystem = systems.find(s => s.name === systemName);
    
    console.log('✅ Sistema selecionado:', {
      name: systemName,
      systemInfo: selectedSystem ? {
        id: selectedSystem._id,
        ip: selectedSystem.ip,
        os: selectedSystem.os,
        status: selectedSystem.status,
        owner: selectedSystem.owner
      } : 'Sistema novo (será criado)'
    });
    
    setFormData({ ...formData, system: systemName });
    setSystemSearch(systemName);
    setShowSystemDropdown(false);
  };

  // Fechar dropdown quando clicar fora
  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowSystemDropdown(false);
    }
  };

  // Função para gerar plano de AI baseado na descrição e tipo de teste
  // Retorna array vazio se AI não disponível (não bloqueia)
  const generateAIPlan = async (description: string, testType: NewTest['type']): Promise<string[]> => {
    if (!description.trim()) return [];
    try {
      const steps = await aiService.generateSimpleSteps(description, testType);
      return steps;
    } catch {
      // AI não disponível - retorna vazio, utilizador preenche manualmente
      return [];
    }
  };

  // Auto-gerar plano quando descrição ou tipo mudarem
  useEffect(() => {
    const generatePlan = async () => {
      if (formData.description && formData.description.trim().length > 10) {
        setIsGeneratingPlan(true);
        try {
          const plan = await generateAIPlan(formData.description, formData.type);
          if (plan.length > 0) {
            console.log('✅ AI plan generated:', plan.length, 'steps');
          }
          setFormData(prev => ({ ...prev, aiPlan: plan }));
        } finally {
          setIsGeneratingPlan(false);
        }
      } else {
        setFormData(prev => ({ ...prev, aiPlan: [] }));
      }
    };

    // Debounce para evitar muitas chamadas de API
    const timer = setTimeout(generatePlan, 1000);
    return () => clearTimeout(timer);
  }, [formData.description, formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.system || !formData.prompt) {
      return;
    }

    try {
      // Find selected system to get slug
      const selected = systems.find(s => s.name === formData.system);
      const systemSlug = selected?.slug;

      if (!systemSlug) {
        console.error('❌ [TESTS] System slug not found for selected system:', formData.system);
        showToast('Could not identify system (missing slug). Select a valid system.', 'error');
        return;
      }

      // URL is required only for UI tests
      if (formData.type === 'ui' && (!formData.url || !formData.url.trim())) {
        showToast('URL is required for UI tests.', 'error');
        return;
      }

      setIsSubmitting(true);
      console.log(`📤 [TESTS] Sending ${formData.type} test creation...`);
      
      const result = await uiTestsService.createUiTest({
        systemSlug,
        url: formData.url?.trim() || '',
        description: formData.description || formData.name,
        extraDescription: formData.prompt,
        testType: formData.type,
        // Skip AI plan for non-UI tests (will use frontend-generated steps)
        skipAiPlan: formData.type !== 'ui',
      });
      
      console.log('✅ [TESTS] Test creation sent successfully');
      
      // Guardar plano/response para revisão antes de executar
      const data = result?.data || null;
      setUiPlanData(data);
      
      // Initialize editable copy of parsed plan
      // Prioridade: 1) parsed steps from AI, 2) steps array from response, 3) frontend aiPlan
      const parsed = data?.aiResponse?.parsed || {};
      let stepsFromPlan: string[] = [];
      
      if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        stepsFromPlan = parsed.steps.slice();
      } else if (Array.isArray(data?.steps) && data.steps.length > 0) {
        stepsFromPlan = data.steps.slice();
      } else if (formData.aiPlan && formData.aiPlan.length > 0) {
        stepsFromPlan = formData.aiPlan.slice();
      }
      
      // If still no steps and we have AI error, show toast
      if (stepsFromPlan.length === 0 && data?.aiError) {
        showToast('AI plan generation failed. Please add steps manually.', 'warning');
      }
      
      setUiPlanEditable({
        title: parsed.title || formData.name || '',
        objective: parsed.objective || formData.description || '',
        steps: stepsFromPlan,
        acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria) ? parsed.acceptanceCriteria.slice() : [],
        url: data?.uiTest?.url || formData.url || '',
      });
      
      // Do not close yet; allow the user to review and click "Run Now"
    } catch (error: any) {
      console.error('❌ Error creating test:', error);
      const message = error?.message || 'Failed to create test';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunUiTestNow = async () => {
    if (!uiPlanEditable) return;

    try {
      // Validar sistema e slug
      const selected = systems.find(s => s.name === formData.system);
      const systemSlug = selected?.slug;
      if (!systemSlug) {
        showToast('Could not identify system (missing slug). Select a valid system.', 'error');
        return;
      }

      const payload = {
        title: uiPlanEditable.title || formData.name || `${formData.type} Test`,
        objective: uiPlanEditable.objective || formData.description || '',
        steps: Array.isArray(uiPlanEditable.steps) ? uiPlanEditable.steps.filter(Boolean) : [],
        acceptanceCriteria: Array.isArray(uiPlanEditable.acceptanceCriteria) ? uiPlanEditable.acceptanceCriteria.filter(Boolean) : [],
        url: (uiPlanEditable.url || formData.url || '').trim(),
        systemSlug,
        testType: formData.type,
      };

      // URL is required only for UI tests
      if (formData.type === 'ui' && !payload.url) {
        showToast('URL is required to run the UI test.', 'error');
        return;
      }

      console.log(`📤 [TESTS] Finalize & Run ${formData.type} test payload:`, payload);
      await uiTestsService.finalizeAndRun(payload as any);
      showToast('Test submitted for execution.', 'success');

      // Adicionar ao contexto local para visualização
      onAddTest({
        name: payload.title,
        type: formData.type,
        system: formData.system,
        prompt: formData.prompt,
        description: payload.objective,
        aiPlan: payload.steps,
        url: payload.url,
      });

      // Callback para refresh da lista de testes
      onTestCreated?.();

      // Reset e fechar
      setUiPlanData(null);
      setUiPlanEditable(null);
      setFormData({
        name: '',
        type: 'ui',
        system: '',
        prompt: '',
        description: '',
        aiPlan: [],
        url: '',
      });
      setSystemSearch('');
      setShowSystemDropdown(false);
      onClose();
    } catch (error: any) {
      console.error('❌ [UI-TESTS] Finalize & Run failed:', error);
      showToast(error?.message || 'Failed to start UI test execution', 'error');
    }
  };

  const updateEditableField = (field: keyof UiPlanEditable, value: any) => {
    setUiPlanEditable(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const updateEditableListItem = (listKey: 'steps' | 'acceptanceCriteria', index: number, value: string) => {
    setUiPlanEditable(prev => {
      if (!prev) return prev;
      const list = [...(prev[listKey] || [])];
      list[index] = value;
      return { ...prev, [listKey]: list };
    });
  };

  const addEditableListItem = (listKey: 'steps' | 'acceptanceCriteria') => {
    setUiPlanEditable(prev => {
      if (!prev) return prev;
      const list = [...(prev[listKey] || [])];
      list.push('');
      return { ...prev, [listKey]: list };
    });
  };

  const removeEditableListItem = (listKey: 'steps' | 'acceptanceCriteria', index: number) => {
    setUiPlanEditable(prev => {
      if (!prev) return prev;
      const list = [...(prev[listKey] || [])];
      list.splice(index, 1);
      return { ...prev, [listKey]: list };
    });
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Quick Test</h2>
            <p className="text-sm text-gray-400 mt-1">Run a one-time test (not saved as template)</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-medium text-white">Quick Test Mode</h3>
                <p className="text-xs text-gray-400 mt-1">
                  This test will run once and won't be saved as a template. 
                  To create reusable tests, use "Create Template" instead.
                </p>
              </div>
            </div>
          </div>

          {/* 1. Test Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Test Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
              placeholder="Enter test name..."
              required
            />
          </div>

          {/* 2. Test Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Test Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {testTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.id as NewTest['type'] })}
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                      formData.type === type.id
                        ? 'bg-green-400/10 border-green-400/30 text-green-400'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Icon size={20} />
                    <div className="text-left">
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs opacity-75">{type.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. System Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target System
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={systemSearch}
                onChange={(e) => {
                  setSystemSearch(e.target.value);
                  setFormData({ ...formData, system: e.target.value });
                  setShowSystemDropdown(true);
                }}
                onFocus={() => setShowSystemDropdown(true)}
                onBlur={() => {
                  // Delay para permitir clique nas opções
                  setTimeout(() => setShowSystemDropdown(false), 200);
                }}
                className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                placeholder="Search or type system name..."
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            {/* Dropdown de sugestões */}
            {showSystemDropdown && (systemSearch.length > 0 || filteredSystems.length > 0) && (
              <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {isLoadingSystems ? (
                  <div className="px-3 py-2 text-gray-400 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      <span>Loading systems...</span>
                    </div>
                  </div>
                ) : filteredSystems.length > 0 ? (
                  <>
                    {filteredSystems.map((system) => (
                      <button
                        key={system._id}
                        type="button"
                        onClick={() => handleSystemSelect(system.name)}
                        className="w-full text-left px-3 py-2 text-white hover:bg-gray-600 focus:bg-gray-600 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Server className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{system.name}</div>
                              <div className="text-xs text-gray-400">
                                {system.ip} • {system.os} • {system.status}
                              </div>
                            </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            system.status === 'online' ? 'bg-green-400' : 
                            system.status === 'offline' ? 'bg-red-400' : 
                            'bg-yellow-400'
                          }`} />
                        </div>
                      </button>
                    ))}
                    {/* Separator if there are filtered systems and text does not match exactly */}
                    {systemSearch && !systems.some(s => s.name === systemSearch) && (
                      <div className="border-t border-gray-600 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleSystemSelect(systemSearch)}
                          className="w-full text-left text-green-400 hover:text-green-300 font-medium"
                        >
                          <div className="flex items-center space-x-2">
                            <Play className="h-4 w-4" />
                            <span>Create "{systemSearch}"</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </>
                ) : systemSearch.length > 0 ? (
                  <div className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleSystemSelect(systemSearch)}
                      className="w-full text-left text-green-400 hover:text-green-300 font-medium"
                    >
                      <div className="flex items-center space-x-2">
                        <Play className="h-4 w-4" />
                        <span>Create "{systemSearch}"</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2 text-gray-400 text-sm">
                    No systems found. Type to create a new one.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Test Description for AI */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description for AI
              <span className="text-xs text-gray-500 ml-2">(Helps AI understand what you want to test)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 resize-none"
              placeholder={getPlaceholderForTestType(formData.type)}
            />
            <div className="mt-1 text-xs text-gray-500">
              💡 Be specific about what you want to test and the expected behavior
            </div>
          </div>

          {/* 5. AI Planning Section */}
          {((formData.description && formData.description.trim().length > 10) || (formData.aiPlan && formData.aiPlan.length > 0) || isGeneratingPlan) && (
            <div className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Brain className="text-purple-400" size={20} />
                <h3 className="text-sm font-medium text-gray-300">AI Planning</h3>
                {isGeneratingPlan && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                )}
              </div>
              
              {isGeneratingPlan ? (
                <div className="text-sm text-gray-400 italic">
                  🤖 AI is analyzing your description and generating test steps...
                </div>
              ) : (formData.aiPlan && formData.aiPlan.length > 0) ? (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 mb-2">
                    Automated test plan generated by AI:
                  </div>
                  {formData.aiPlan.map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckSquare className="text-green-400 mt-0.5 flex-shrink-0" size={14} />
                      <span className="text-sm text-gray-300">{step}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">
                  Write a description above to generate an automated test plan
                </div>
              )}
            </div>
          )}

          {/* URL for UI tests */}
          {formData.type === 'ui' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL to Test
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                placeholder="https://example.com"
              />
            </div>
          )}

          {/* Test Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Test Instructions
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 resize-none"
              placeholder="Describe what you want to test..."
              required
            />
          </div>

          {/* UI Plan Review (if available) */}
          {uiPlanData && uiPlanEditable && (
            <div className="space-y-4 p-4 border border-green-400/30 rounded-lg bg-green-400/5">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Generated UI Plan</h3>
                <p className="text-sm text-gray-400">Review and edit the plan below, then run the test.</p>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Title</div>
                  <input
                    type="text"
                    value={uiPlanEditable.title}
                    onChange={(e) => updateEditableField('title', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                    placeholder="Test title"
                  />
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Objective</div>
                  <textarea
                    value={uiPlanEditable.objective}
                    onChange={(e) => updateEditableField('objective', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 resize-none"
                    placeholder="Test objective"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-gray-400 text-sm">Steps</div>
                    <button type="button" onClick={() => addEditableListItem('steps')} className="text-xs text-green-400 hover:text-green-300">+ Add step</button>
                  </div>
                  {uiPlanEditable.steps.length > 0 ? (
                    <div className="space-y-2">
                      {uiPlanEditable.steps.map((s, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={s}
                            onChange={(e) => updateEditableListItem('steps', i, e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                            placeholder={`Step ${i + 1}`}
                          />
                          <button type="button" onClick={() => removeEditableListItem('steps', i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No steps. Add at least one.</div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-gray-400 text-sm">Acceptance Criteria</div>
                    <button type="button" onClick={() => addEditableListItem('acceptanceCriteria')} className="text-xs text-green-400 hover:text-green-300">+ Add criterion</button>
                  </div>
                  {uiPlanEditable.acceptanceCriteria.length > 0 ? (
                    <div className="space-y-2">
                      {uiPlanEditable.acceptanceCriteria.map((c, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={c}
                            onChange={(e) => updateEditableListItem('acceptanceCriteria', i, e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                            placeholder={`Criterion ${i + 1}`}
                          />
                          <button type="button" onClick={() => removeEditableListItem('acceptanceCriteria', i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No criteria. Optional.</div>
                  )}
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">URL</div>
                  <input
                    type="url"
                    value={uiPlanEditable.url || ''}
                    onChange={(e) => updateEditableField('url', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setUiPlanData(null); setUiPlanEditable(null); }}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  Close Plan
                </button>
                <button
                  type="button"
                  onClick={handleRunUiTestNow}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-400 hover:bg-green-500 text-black rounded-lg transition-colors"
                >
                  <Play size={16} />
                  <span>Run now</span>
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!uiPlanData && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
                disabled={isSubmitting}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isSubmitting ? 'bg-green-400/60 cursor-not-allowed' : 'bg-green-400 hover:bg-green-500'
                } text-black`}
            >
              <Play size={16} />
                <span>{isSubmitting ? 'Submitting...' : 'Start Test'}</span>
            </button>
          </div>
          )}
        </form>
      </div>
    </div>
  );
};