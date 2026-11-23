import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Activity, Book, Wrench, AlertTriangle, Monitor, Server, Settings, Clock, User, Network, ChevronDown, ChevronUp, Plus, Bell, Send, Bot, Layout, FileText, Download, Trash2, Eye, EyeOff, Upload, Play, History, X, Shield, Globe, ExternalLink, Terminal } from 'lucide-react';
import { onboardingService, templatesService, uploadService, issueHelperService, diagnosticsService, systemsService, uiTestsService, type StepResult, type UiTestItem } from '../services';
import { Template } from '../types/template.types';
import { useToast } from '../contexts/ToastContext';
import OnboardingStatusViewer from '../components/OnboardingStatusViewer';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import CreateTemplateModal from '../components/CreateTemplateModal';
import { MonitoringAlertsTab } from '../components/MonitoringAlertsTab';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';
import { AddTestModal, type NewTest } from '../components/AddTestModal';
import SshTestRunner from '../components/SshTestRunner';

interface NodeExporterInfo {
  installed: boolean;
  port: number;
  version?: string | null;
  installedAt?: string | null;
  lastCheckedAt?: string | null;
  status: 'unknown' | 'running' | 'stopped' | 'not_installed' | 'error';
}

interface ProcessExporterInfo {
  installed: boolean;
  port: number;
  installedAt?: string | null;
  lastCheckedAt?: string | null;
  status: 'unknown' | 'running' | 'stopped' | 'not_installed' | 'error';
  monitoredProcesses?: string[];
}

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
  environment?: string;
  slug?: string;
  nodeExporter?: NodeExporterInfo;
  processExporter?: ProcessExporterInfo;
}

interface SystemProfileProps {
  system: System;
  onBack: () => void;
}

type TabType = 'onboarding' | 'monitoring' | 'knowledge' | 'tests' | 'testHistory' | 'issuesolver';

interface CommandResult {
  command: string;
  output: string;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  ai?: {
    text?: string;
    structured?: any;
    references?: Array<{ idx?: number; path?: string; url?: string; score?: number } | string | number>;
  };
}

  // Helper: tenta extrair payload da IA caso o texto contenha JSON com { structured, references, text }
  const parseAiEnvelope = (raw?: string): { structured?: any; references?: { idx: number; path: string; score?: number }[]; text?: string } | null => {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && (parsed.structured || parsed.references || parsed.text)) {
        return parsed;
      }
      // Se não há envelope mas tem formato estruturado direto (summary/likelyCauses/etc), tratar como structured
      if (parsed && typeof parsed === 'object' && (parsed.summary || parsed.likelyCauses || parsed.investigate || parsed.fixes || parsed.validation || parsed.prevention)) {
        return { structured: parsed } as any;
      }
    } catch (_) {
      return null;
    }
    return null;
  };

  // Detecta payloads "Not found in context" para mostrar apenas o summary
  const isNotFoundToken = (value: any): boolean => {
    return typeof value === 'string' && value.trim().toLowerCase().includes('not found in context');
  };

  const isStructuredFallbackResponse = (structured: any): boolean => {
    if (!structured || typeof structured !== 'object') return false;
    const checkList = (arr: any) => Array.isArray(arr) && arr.length > 0 && arr.every(isNotFoundToken);
    const listsOk = ['likelyCauses', 'investigate', 'validation', 'prevention'].every((k) => checkList(structured[k]));
    const fixesOk = Array.isArray(structured.fixes)
      ? structured.fixes.length > 0 && structured.fixes.every((f: any) => isNotFoundToken(f?.cause) && checkList(f?.steps))
      : true;
    return listsOk && fixesOk;
  };

  // Normaliza payloads diversos do backend (string JSON, objeto com structured, objeto "flattened")
  const normalizeAiResponsePayload = (input: any): { text?: string | null; structured?: any | null; references?: any[] } => {
    let text: string | null | undefined;
    let structured: any | null | undefined;
    let references: any[] | undefined;

    if (typeof input === 'string') {
      const env = parseAiEnvelope(input);
      if (env) {
        text = env.text ?? null;
        structured = env.structured ?? null;
        references = (env as any).references;
      } else {
        text = input;
      }
    } else if (input && typeof input === 'object') {
      // Se vier no formato esperado
      if ('structured' in input || 'text' in input || 'references' in input) {
        text = (input as any).text ?? null;
        structured = (input as any).structured ?? null;
        references = (input as any).references;
      }
      // Se vier "flattened" com summary/likelyCauses/etc
      if (!structured && (input.summary || input.likelyCauses || input.investigate || input.fixes || input.validation || input.prevention)) {
        structured = input;
        references = (input as any).references ?? references;
      }
    }

    return { text, structured, references };
  };

  // Heurística para evitar mostrar JSON cru quando já renderizamos structured
  const isLikelyJsonString = (value?: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    const t = value.trim();
    return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
  };

  // Helpers de rendering versátil
  const renderReferencesList = (refs: any[]): JSX.Element => {
    const norm = Array.isArray(refs) ? refs : [];
    return (
      <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
        {norm.map((r: any, i: number) => {
          if (typeof r === 'number' || typeof r === 'string') {
            return (
              <li key={i}><span className="text-gray-400">[{String(r)}]</span></li>
            );
          }
          const label = r.path || r.url || JSON.stringify(r);
          const score = typeof r.score === 'number' ? ` (score ${r.score.toFixed(2)})` : '';
          return (
            <li key={i}>
              <span className="text-gray-400">[{r.idx ?? i + 1}]</span> <span className="text-gray-200">{label}</span>
              <span className="text-gray-400">{score}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const CommandLine: React.FC<{ cmd: string }> = ({ cmd }) => (
    <div className="flex items-center gap-2">
      <pre className="flex-1 bg-black/40 text-gray-100 text-xs p-2 rounded border border-gray-600 overflow-x-auto">{cmd}</pre>
      <button
        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-200"
        onClick={() => navigator.clipboard.writeText(cmd)}
        title="Copiar comando"
      >
        Copiar
      </button>
    </div>
  );

interface Document {
  id: string;
  name: string;
  type: 'manual' | 'procedure' | 'config' | 'log';
  size: string;
  lastModified: string;
  description: string;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'security' | 'functionality' | 'connectivity';
  estimatedDuration: string;
  requirements: string[];
  status: 'available' | 'running' | 'completed' | 'failed';
}

interface TestExecution {
  id: string;
  testId: string;
  testName: string;
  startTime: string;
  endTime?: string;
  duration?: string;
  status: 'running' | 'passed' | 'failed' | 'cancelled';
  result?: 'success' | 'warning' | 'error';
  progress?: number;
  logs: string[];
  metrics?: {
    cpu?: number;
    memory?: number;
    responseTime?: number;
    errors?: number;
  };
}

export const SystemProfile: React.FC<SystemProfileProps> = ({ system, onBack }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('onboarding');
  const [selectedStepDetails, setSelectedStepDetails] = useState<string | null>(null);
  const [activeAlarmsView, setActiveAlarmsView] = useState<'active' | 'all'>('active');
  const [showCreateAlarmDropdown, setShowCreateAlarmDropdown] = useState(false);
  const [showAIAlarmModal, setShowAIAlarmModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [proposedAlarm, setProposedAlarm] = useState<any>(null);
  const [knowledgeBaseTab, setKnowledgeBaseTab] = useState<'documents' | 'summary'>('documents');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showPasswordVisible, setShowPasswordVisible] = useState(false);
  const [showTemplateSelectionModal, setShowTemplateSelectionModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  // KB System Info (by slug)
  const [kbSystemData, setKbSystemData] = useState<any | null>(null);
  const [kbInfoLoading, setKbInfoLoading] = useState(false);
  const [kbInfoError, setKbInfoError] = useState<string | null>(null);

  const loadKbSystemInfo = useCallback(async () => {
    if (!system.slug) return;
    try {
      setKbInfoLoading(true);
      setKbInfoError(null);
      const { system: sys } = await systemsService.getSystemBySlug(system.slug);
      setKbSystemData(sys);
      console.log('📥 [KB][BY-SLUG] Loaded system by slug:', sys);
    } catch (error: any) {
      console.error('❌ [KB][BY-SLUG] Failed to load system info:', error);
      setKbInfoError(error?.message || 'Error loading system information');
      setKbSystemData(null);
    } finally {
      setKbInfoLoading(false);
    }
  }, [system.slug]);

  // Carregar sempre que abrir a aba summary
  useEffect(() => {
    if (knowledgeBaseTab === 'summary' && system.slug) {
      loadKbSystemInfo();
    }
  }, [knowledgeBaseTab, system.slug, loadKbSystemInfo]);

  const [onboardingCredentials, setOnboardingCredentials] = useState({
    username: '',
    password: '',
    privateKey: '',
    usePrivateKey: false
  });
  const [isOnboardingRunning, setIsOnboardingRunning] = useState(false);
  const [isReExecuting, setIsReExecuting] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState({
    currentStep: 0,
    totalSteps: 0,
    stepName: '',
    progress: 0
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    responseTime?: number;
  } | null>(null);
  const [showConnectionTestResult, setShowConnectionTestResult] = useState(false);
  const [templateDetails, setTemplateDetails] = useState<any>(null);
  
  // Hook para obter status completo do onboarding do backend
  const onboardingStatusData = useOnboardingStatus(system.id, {
    autoRefresh: false, // Desabilitado auto-refresh para evitar rate limiting
    refreshInterval: 60000 // Se habilitado, refresh a cada 60 segundos
  });
  
  // Carregar detalhes do template quando o componente montar
  React.useEffect(() => {
    loadTemplateDetails();
  }, [system.id]);

  // Carregar ficheiros existentes quando o componente montar
  React.useEffect(() => {
    console.log('🔍 [SYSTEM-PROFILE] System data:', {
      id: system.id,
      name: system.name,
      slug: system.slug,
      hasSlug: !!system.slug
    });
    loadExistingFiles();
  }, [system.id]);
  

  
  // Step-by-step results storage - now stores array of results per step
  const [stepResults, setStepResults] = useState<Record<string, (StepResult & { fullResponse?: any })[]>>({});
  
  const [availableTests, setAvailableTests] = useState<TestCase[]>([]);
  const [runningTests, setRunningTests] = useState<Map<string, TestExecution>>(new Map());
  const [testHistory, setTestHistory] = useState<TestExecution[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [showTestDetails, setShowTestDetails] = useState(false);
  
  // System UI Tests from DB
  const [systemTests, setSystemTests] = useState<UiTestItem[]>([]);
  
  // Real test runs history from API
  const [testRuns, setTestRuns] = useState<any[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [selectedUiTest, setSelectedUiTest] = useState<UiTestItem | null>(null);
  const [showUiTestDetails, setShowUiTestDetails] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState<string | null>(null);
  const [sshTestToRun, setSshTestToRun] = useState<UiTestItem | null>(null);
  const [issueSolverMessages, setIssueSolverMessages] = useState<ChatMessage[]>([]);
  const [issueSolverCurrentMessage, setIssueSolverCurrentMessage] = useState('');
  const [isIssueSolverThinking, setIsIssueSolverThinking] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [onboardingStatus, setOnboardingStatus] = useState<Record<string, 'complete' | 'pending' | 'failed'>>({
    connectivityTest: 'pending',
    privilegesTest: 'pending',
    processAnalysis: 'pending',
    serviceAnalysis: 'pending',
    openPortsAnalysis: 'pending',
    snmpv3UserSetup: 'pending',
    statusScript: 'pending',
    configFileCopy: 'pending',
    configFileEdit: 'pending',
    aliasSetup: 'pending'
  });



  // Handle Create Alarm options
  const handleCreateAlarmOption = (option: 'template' | 'ai') => {
    console.log('🚀 handleCreateAlarmOption called with:', option);

    
    setShowCreateAlarmDropdown(false);
    console.log('✅ Dropdown closed');
    
    if (option === 'template') {
      // Handle template creation - could open a template modal
      console.log('📋 Creating alarm from template');
    } else if (option === 'ai') {
      console.log('🤖 Setting showAIAlarmModal to true');
      
      setShowAIAlarmModal(true);
  
      
      // Initialize with welcome message
      const welcomeMessage: ChatMessage = {
        id: '1',
        text: 'Hello! I\'m here to help you create a custom alarm for your system. Please describe what kind of alarm you want to create. For example, you could say "I want to monitor CPU usage" or "Alert me when disk space is low".',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages([welcomeMessage]);
      console.log('💬 Welcome message added to chat');
      console.log('🎯 AI modal should be visible now, showAIAlarmModal:', true);
    }
  };

  // Handle AI Chat
  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: currentMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    // Capturar histórico antes de adicionar a mensagem atual
    const previousHistory = chatMessages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      text: m.text,
      ai: m.ai,
      timestamp: m.timestamp
    }));

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsAIThinking(true);

    try {
      // Enviar mensagem real para o backend via Issue Helper (com histórico)
      const aiAlarmPayload = {
        systemId: system.id,
        subject: 'AI Alarm Assistant',
        message: userMessage.text,
        context: {
          source: 'SystemProfile.AIAlarm',
          system: { id: system.id, name: system.name },
          previousMessages: previousHistory,
          historyPrompt:
            'These are the previous messages (format role: text):\n' +
            previousHistory.map((h) => `${h.role}: ${h.text}`).join('\n') +
            '\n\nCurrent message (user): ' + userMessage.text
        }
      } as const;
      console.log('🧠 [ISSUE-HELPER][AI-ALARM] createMessage payload:', aiAlarmPayload);
      const created = await issueHelperService.createMessage(aiAlarmPayload as any);

      // Acionar resolução automática se disponível
      try {
        await issueHelperService.solve((created as any)._id || (created as any).id, {
          system: system.name,
          issue: userMessage.text,
          topK: 8,
          options: {}
        });
      } catch {}

      // Esperar a resposta da IA (poll curto às minhas mensagens)
      const start = Date.now();
      let aiText: string | null = null;
      let aiStructured: any | null = null;
      let aiReferences: any[] | undefined;
      while (Date.now() - start < 10000 && !aiText) {
        const list = await issueHelperService.listMyMessages({ limit: 20 });
        const match = list.find((m: any) => (m as any)._id === ((created as any)._id) || (m as any).id === (created as any).id);
        const resp = (match as any)?.aiResponse;
        if (resp) {
          const norm = normalizeAiResponsePayload(resp);
          aiText = norm.text || null;
          aiStructured = norm.structured || null;
          aiReferences = norm.references;
          if (aiText || aiStructured) break;
        }
        await new Promise(res => setTimeout(res, 800));
      }

      // Se vier envolvido em JSON como string, tentar extrair structured
      const envelope = parseAiEnvelope(aiText || undefined);
      const onlySummary = (envelope?.structured && isStructuredFallbackResponse(envelope.structured))
        || (aiStructured && isStructuredFallbackResponse(aiStructured));
      const rawText = onlySummary
        ? (envelope?.structured?.summary || aiStructured?.summary || aiText || '')
        : (envelope?.text || aiText || 'Ainda a processar... Tente novamente em alguns segundos.');
      const text = ((envelope?.structured || aiStructured) && isLikelyJsonString(rawText))
        ? ''
        : rawText;
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString(),
        ai: (!onlySummary && (envelope?.structured || aiStructured || aiReferences || envelope?.references))
          ? { text: envelope?.text || aiText || undefined, structured: envelope?.structured || aiStructured || undefined, references: envelope?.references || aiReferences }
          : undefined
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Error sending message';
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `Erro: ${errorMessage}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsAIThinking(false);
    }
  };

  // Removido gerador de respostas mock para AI Alarm (usar backend)
  // const generateAIResponse = (...) => { /* removed */ };

  const handleCreateAlarmFromAI = () => {
    if (proposedAlarm) {
      // Here you would integrate with your alarm system
      console.log('Creating alarm:', proposedAlarm);
      setShowAIAlarmModal(false);
      setChatMessages([]);
      setProposedAlarm(null);
      // Show success message or refresh alarms list
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const dropdown = document.querySelector('[data-dropdown="create-alarm"]');
      
      if (showCreateAlarmDropdown && dropdown && !dropdown.contains(target)) {
        console.log('Closing dropdown from outside click');
        setShowCreateAlarmDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCreateAlarmDropdown]);



  // Initialize Issue Solver with welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      text: `Hello! I'm your System Troubleshoot Assistant. I have knowledge about ${system.name} (${system.type.toUpperCase()} on ${system.os}) and can help you diagnose and resolve issues.\n\nYou can ask me about:\n• System performance problems\n• Connectivity issues\n• Service failures\n• Configuration problems\n• Error troubleshooting\n• Best practices\n\nWhat issues are you experiencing with this system?`,
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString()
    };
    setIssueSolverMessages([welcomeMessage]);
  }, [system]);

  // Load onboarding status for the specific system
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      try {
        // In production, this would load the real onboarding status from API
        // For now, we'll check if there's any saved status in localStorage
        const savedStatus = localStorage.getItem(`onboarding_${system.id}`);
        
        if (savedStatus) {
          const parsed = JSON.parse(savedStatus);
          setOnboardingStatus(parsed);
        } else {
          // Ensure we're using the default pending status
          setOnboardingStatus({
            connectivityTest: 'pending',
            privilegesTest: 'pending',
            processAnalysis: 'pending',
            serviceAnalysis: 'pending',
            openPortsAnalysis: 'pending',
            snmpv3UserSetup: 'pending',
            statusScript: 'pending',
            configFileCopy: 'pending',
            configFileEdit: 'pending',
            aliasSetup: 'pending'
          });
        }
      } catch (error) {
        console.error('Failed to load onboarding status:', error);
      }
    };

    loadOnboardingStatus();
  }, [system.id]);

  // Save onboarding status to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(`onboarding_${system.id}`, JSON.stringify(onboardingStatus));
  }, [onboardingStatus, system.id]);

  // Load UI tests from database
  const loadSystemTests = useCallback(async () => {
    if (!system.slug) return;
    setIsLoadingTests(true);
    try {
      const response = await uiTestsService.getBySystemSlug(system.slug);
      setSystemTests(response.data?.items || []);
    } catch (error) {
      console.error('Failed to load system tests:', error);
      setSystemTests([]);
    } finally {
      setIsLoadingTests(false);
    }
  }, [system.slug]);

  useEffect(() => {
    loadSystemTests();
  }, [loadSystemTests]);

  // Load test runs history
  const loadTestRuns = useCallback(async () => {
    if (!system.slug) return;
    setIsLoadingRuns(true);
    try {
      const response = await uiTestsService.listRuns({ systemSlug: system.slug, limit: 50 });
      setTestRuns(response.data?.runs || []);
    } catch (error) {
      console.error('Failed to load test runs:', error);
      setTestRuns([]);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [system.slug]);

  useEffect(() => {
    loadTestRuns();
  }, [loadTestRuns]);

  // Test types that require SSH execution
  const SSH_TEST_TYPES = ['os', 'performance', 'network', 'database'];

  // Handle running an existing test
  const handleRunUiTest = async (test: UiTestItem) => {
    // Se for um teste SSH, abre o modal de execução SSH
    if (SSH_TEST_TYPES.includes(test.testType)) {
      setSshTestToRun(test);
      return;
    }

    // Para testes UI/API, executa normalmente
    setIsRunningTest(test._id);
    try {
      await uiTestsService.runExisting(test._id);
      showToast('Test started successfully!', 'success');
      loadSystemTests(); // Refresh to see updated status
    } catch (error: any) {
      console.error('Failed to run test:', error);
      showToast(error?.message || 'Failed to run test', 'error');
    } finally {
      setIsRunningTest(null);
    }
  };

  // Handle closing SSH test runner
  const handleSshTestClose = () => {
    setSshTestToRun(null);
    loadSystemTests(); // Refresh to see updated status
    loadTestRuns(); // Refresh history
  };

  // Handle stopping a test in processing
  const [stoppingTest, setStoppingTest] = useState<string | null>(null);
  
  const handleStopTest = async (test: UiTestItem) => {
    if (!confirm(`Stop test "${test.title || test.description}"?`)) return;
    
    setStoppingTest(test._id);
    try {
      // Buscar o run mais recente deste teste
      const runsResponse = await uiTestsService.listRuns({ uiTestId: test._id, limit: 1 });
      const latestRun = runsResponse.data?.runs?.[0];
      
      if (latestRun && latestRun.status === 'running') {
        await uiTestsService.cancelRun(latestRun._id);
        showToast('Test stopped successfully!', 'success');
      } else {
        // Se não há run ativo, apenas atualizar o status do teste
        showToast('No active run found', 'warning');
      }
      
      loadSystemTests();
      loadTestRuns();
    } catch (error: any) {
      console.error('Failed to stop test:', error);
      showToast(error?.message || 'Failed to stop test', 'error');
    } finally {
      setStoppingTest(null);
    }
  };

  // Handle deleting a test
  const handleDeleteUiTest = async (test: UiTestItem) => {
    if (!confirm(`Delete test "${test.title || test.description}"?`)) return;
    try {
      await uiTestsService.delete(test._id);
      showToast('Test deleted successfully!', 'success');
      loadSystemTests();
    } catch (error: any) {
      console.error('Failed to delete test:', error);
      showToast(error?.message || 'Failed to delete test', 'error');
    }
  };

  // Get status color for UI test
  const getUiTestStatusColor = (status: UiTestItem['status']) => {
    switch (status) {
      case 'answered': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'pending': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Get test type info
  const getTestTypeInfo = (testType: UiTestItem['testType']) => {
    switch (testType) {
      case 'ui': return { label: 'UI', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      case 'api': return { label: 'API', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'database': return { label: 'Database', color: 'text-orange-400', bg: 'bg-orange-500/10' };
      case 'performance': return { label: 'Perf', color: 'text-pink-400', bg: 'bg-pink-500/10' };
      case 'os': return { label: 'OS', color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
      case 'network': return { label: 'Network', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
      default: return { label: 'Test', color: 'text-gray-400', bg: 'bg-gray-500/10' };
    }
  };

  // Mock command results for completed steps
  const commandResults: Record<string, CommandResult> = {
    connectivityTest: {
      command: 'ping -c 4 ' + system.ip,
      output: `PING ${system.ip} (${system.ip}): 56 data bytes
64 bytes from ${system.ip}: icmp_seq=0 ttl=64 time=1.234 ms
64 bytes from ${system.ip}: icmp_seq=1 ttl=64 time=1.156 ms
64 bytes from ${system.ip}: icmp_seq=2 ttl=64 time=1.089 ms
64 bytes from ${system.ip}: icmp_seq=3 ttl=64 time=1.145 ms

--- ${system.ip} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss
round-trip min/avg/max/stddev = 1.089/1.156/1.234/0.053 ms`,
      timestamp: '2024-01-15 10:30:45'
    },
    privilegesTest: {
      command: 'ssh admin@' + system.ip + ' "sudo -l"',
      output: `Matching Defaults entries for admin on ${system.name}:
    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

User admin may run the following commands on ${system.name}:
    (ALL : ALL) ALL
    (root) NOPASSWD: /usr/bin/systemctl
    (root) NOPASSWD: /usr/sbin/service
    (root) NOPASSWD: /bin/ps`,
      timestamp: '2024-01-15 10:31:12'
    },
    processAnalysis: {
      command: 'ssh admin@' + system.ip + ' "ps aux --sort=-%cpu | head -20"',
      output: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.1  0.3 169564 13744 ?        Ss   Jan14   0:15 /sbin/init
www-data  1234  2.5  4.2 295432 85632 ?        S    10:25   0:05 apache2 -DFOREGROUND
mysql     2456  1.8  12.3 1685532 248576 ?     Sl   Jan14   4:23 /usr/sbin/mysqld
root      3789  0.8  0.5 125684 10432 ?        Ss   Jan14   2:15 sshd: /usr/sbin/sshd -D
nginx     4567  0.6  2.1 145632 42864 ?        S    09:30   1:12 nginx: worker process
root      5432  0.3  0.8 287456 16384 ?        S    Jan14   0:45 /usr/bin/python3 /opt/monitoring/agent.py
admin     6789  0.2  0.4 118736  8192 pts/0    Ss   10:30   0:00 -bash
root      7890  0.1  0.2  95648  4096 ?        S    Jan14   0:08 /usr/sbin/cron -f`,
       timestamp: '2024-01-15 10:32:01'
     },
     serviceAnalysis: {
       command: 'ssh admin@' + system.ip + ' "systemctl list-units --type=service --state=running"',
       output: `UNIT                               LOAD   ACTIVE SUB     DESCRIPTION
apache2.service                    loaded active running The Apache HTTP Server
chronyd.service                    loaded active running chrony, an NTP client/server
cron.service                       loaded active running Regular background program processing daemon
dbus.service                       loaded active running D-Bus System Message Bus
mysql.service                      loaded active running MySQL Community Server
network-manager.service            loaded active running Network Manager
nginx.service                      loaded active running A high performance web server and a reverse proxy server
openssh-server.service            loaded active running OpenBSD Secure Shell server
redis-server.service               loaded active running Advanced key-value store
systemd-journald.service           loaded active running Journal Service
systemd-logind.service             loaded active running User Login Management
systemd-networkd.service           loaded active running Network Configuration
systemd-resolved.service           loaded active running Network Name Resolution
systemd-timesyncd.service          loaded active running Network Time Synchronization

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state, i.e. generalization of SUB.
SUB    = The low-level unit activation state, values depend on unit type.
14 loaded units listed.`,
       timestamp: '2024-01-15 10:33:15'
     },
     openPortsAnalysis: {
       command: 'ssh admin@' + system.ip + ' "ss -tuln"',
       output: `Netid  State      Recv-Q Send-Q  Local Address:Port   Peer Address:Port  Process
udp    UNCONN     0      0           127.0.0.53:53          0.0.0.0:*
udp    UNCONN     0      0           0.0.0.0:68             0.0.0.0:*
tcp    LISTEN     0      4096        127.0.0.53:53          0.0.0.0:*
tcp    LISTEN     0      128         0.0.0.0:22             0.0.0.0:*
tcp    LISTEN     0      511         0.0.0.0:80             0.0.0.0:*
tcp    LISTEN     0      511         0.0.0.0:443            0.0.0.0:*
tcp    LISTEN     0      80          127.0.0.1:3306         0.0.0.0:*
tcp    LISTEN     0      128         127.0.0.1:6379         0.0.0.0:*
tcp    LISTEN     0      128         [::]:22                [::]:*
tcp    LISTEN     0      511         [::]:80                [::]:*
tcp    LISTEN     0      511         [::]:443               [::]:*`,
       timestamp: '2024-01-15 10:34:22'
     }
   };

  const tabs = [
    { id: 'onboarding', label: 'Onboarding', icon: CheckCircle },
    { id: 'monitoring', label: 'Monitoring & Alerts', icon: Activity },
    { id: 'knowledge', label: 'Knowledge Base', icon: Book },
    { id: 'tests', label: 'Tests', icon: Play },
    { id: 'testHistory', label: 'Test History', icon: History },
    { id: 'issuesolver', label: 'Issue Solver', icon: Wrench }
  ];

  const getStatusColor = (status: System['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-400';
      case 'offline':
        return 'text-red-400';
      case 'maintenance':
        return 'text-yellow-400';
    }
  };

  const getTypeIcon = (type: System['type']) => {
    switch (type) {
      case 'web':
        return <Network size={20} className="text-blue-400" />;
      case 'database':
        return <Server size={20} className="text-purple-400" />;
      case 'api':
        return <Activity size={20} className="text-green-400" />;
      case 'mobile':
        return <Monitor size={20} className="text-orange-400" />;
    }
  };

  const renderOnboardingTab = () => {
    // Usar dados reais do backend em vez do estado local
    const backendHasOnboarding = onboardingStatusData.hasOnboarding;
    const backendProgress = onboardingStatusData.progress;
    const backendIsComplete = onboardingStatusData.isCompleted;
    const backendIsInProgress = onboardingStatusData.isInProgress;
    const backendTotalSteps = onboardingStatusData.getTotalSteps();
    const backendCompletedSteps = onboardingStatusData.getCompletedSteps();
    
    // Fallback para dados locais se backend não tiver dados
    const mainSteps = [
      'connectivityTest',
      'privilegesTest', 
      'processAnalysis',
      'serviceAnalysis',
      'openPortsAnalysis',
      'snmpv3UserSetup',
      'statusScript'
    ];
    
    const statusScriptSubSteps = [
      'configFileCopy',
      'configFileEdit', 
      'aliasSetup'
    ];
    
    const localProgress = () => {
      const mainProgress = mainSteps.filter(step => onboardingStatus[step as keyof typeof onboardingStatus] === 'complete').length;
      const subProgress = statusScriptSubSteps.filter(step => onboardingStatus[step as keyof typeof onboardingStatus] === 'complete').length;
      const totalSteps = mainSteps.length + statusScriptSubSteps.length;
      const totalCompleted = mainProgress + subProgress;
      return Math.round((totalCompleted / totalSteps) * 100);
    };
    
    // Usar dados do backend se disponíveis, senão usar dados locais
    const progress = backendHasOnboarding ? backendProgress : localProgress();
    const isComplete = backendHasOnboarding ? backendIsComplete : (progress === 100);
    const currentlyRunning = isOnboardingRunning || backendIsInProgress;
    
    // Debug logs para identificar estados
    console.log('🔍 [DEBUG] Onboarding States:', {
      backendHasOnboarding,
      backendProgress,
      backendIsComplete,
      backendIsInProgress,
      isOnboardingRunning,
      currentlyRunning,
      progress,
      isComplete
    });



    return (
      <div className="space-y-6">
                  <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                Onboarding Status
                {onboardingStatusData.hasOnboarding && (
                  <span className="ml-3 text-sm font-normal text-gray-400">
                    (Backend: {onboardingStatusData.getStatusText()})
                  </span>
                )}
              </h3>
              <button
                onClick={() => onboardingStatusData.refresh()}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Atualizar Status do Onboarding"
              >
                <Clock size={16} />
              </button>
            </div>
            <div className={`flex items-center space-x-2 ${isComplete ? 'text-green-400' : currentlyRunning ? 'text-blue-400' : 'text-yellow-400'}`}>
              {isComplete ? <CheckCircle size={20} /> : currentlyRunning ? <Clock size={20} className="animate-pulse" /> : <Clock size={20} />}
                              <span className="text-sm font-medium">
                 {backendHasOnboarding ? backendProgress : progress}% Complete
                 {backendHasOnboarding && (
                   <span className="ml-2 text-xs">({backendCompletedSteps}/{backendTotalSteps} steps)</span>
                 )}
               </span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentlyRunning ? 'bg-blue-400' : 
                  isComplete ? 'bg-green-400' : 'bg-yellow-400'
                }`}
                style={{ width: `${currentlyRunning && isOnboardingRunning ? onboardingProgress.progress : (backendHasOnboarding ? backendProgress : progress)}%` }}
              ></div>
            </div>
          </div>

          {/* Start Onboarding Section - Better positioned */}
          {!isComplete && !currentlyRunning && !backendIsComplete && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-400/10 to-blue-400/10 border border-green-400/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-500 rounded-lg flex items-center justify-center">
                    <Play size={20} className="text-black" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Ready to Start</h4>
                    <p className="text-gray-400 text-sm">Automated system onboarding via SSH</p>
                  </div>
                </div>
                <button
                  onClick={handleStartOnboarding}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-black font-semibold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-green-400/25 transform"
                >
                  <Play size={18} />
                  <span>Start Onboarding</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Execute Onboarding Section - For pending onboardings */}
          {backendHasOnboarding && onboardingStatusData.status === 'pending' && !currentlyRunning && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-400/10 to-purple-400/10 border border-blue-400/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <Play size={20} className="text-black" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Template Assigned</h4>
                    <p className="text-gray-400 text-sm">
                      {onboardingStatusData.getTemplateInfo()?.name || 'Template'} ready to execute
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOnboardingModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-black font-semibold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-400/25 transform"
                >
                  <Play size={18} />
                  <span>Execute Onboarding</span>
                </button>
              </div>
            </div>
          )}

          {/* Running Status */}
          {currentlyRunning && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-400/10 to-purple-400/10 border border-blue-400/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  </div>
                  <div>
                    <h4 className="text-blue-400 font-semibold">
                      {isReExecuting ? 'Atualizando Sistema' : 'Onboarding in Progress'}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {isReExecuting 
                        ? 'Re-executando template para atualizar dados'
                        : `Step ${onboardingProgress.currentStep} of ${onboardingProgress.totalSteps}`
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-400 font-semibold text-lg">{onboardingProgress.progress}%</div>
                  <div className="text-gray-400 text-xs">Complete</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 font-medium">{onboardingProgress.stepName}</span>
                  <span className="text-blue-400">Running...</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-3 rounded-full transition-all duration-300 relative"
                    style={{ width: `${onboardingProgress.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completed Status */}
          {(isComplete || backendIsComplete) && !currentlyRunning && validateTemplateExists(system.id) && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-400/10 to-emerald-400/10 border border-green-400/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-green-400 font-semibold">Onboarding Complete</h4>
                    <p className="text-gray-400 text-sm">
                      {backendHasOnboarding ? 
                        `System configured with template "${onboardingStatusData.getTemplateName() || 'Template'}"` : 
                        'System successfully configured and ready'
                      }
                    </p>
                    {backendHasOnboarding && onboardingStatusData.data?.data.onboarding?.completedAt && (
                      <p className="text-gray-500 text-xs mt-1">
                        Last update: {new Date(onboardingStatusData.data.data.onboarding.completedAt).toLocaleString('en-GB')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-semibold text-lg">100%</div>
                  <div className="text-gray-400 text-xs">Complete</div>
                </div>
              </div>
              
              {/* Template Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-600">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleReExecuteTemplate}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <Play size={16} />
                    <span>Update System</span>
                  </button>
                  
                  <button
                    onClick={() => setShowTemplateSelectionModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <Settings size={16} />
                    <span>Change Template</span>
                  </button>
                </div>
                
                {/* Indicador de atualização recente */}
                {backendHasOnboarding && onboardingStatusData.data?.data.onboarding?.completedAt && (
                  (() => {
                    const lastUpdate = new Date(onboardingStatusData.data.data.onboarding.completedAt);
                    const now = new Date();
                    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
                    return diffMinutes < 60 ? (
                      <div className="flex items-center space-x-2 text-green-400 text-xs bg-green-400/10 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Recently updated</span>
                      </div>
                    ) : null;
                  })()
                )}
              </div>
            </div>
          )}

          {/* Template Info - Mostrar apenas informações básicas do template */}
          {templateDetails && validateTemplateExists(system.id) && (
            <div className="mb-6 p-3 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 border border-blue-400/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                    <FileText size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-blue-400 font-semibold text-sm">Template: {templateDetails.name}</h4>
                    <p className="text-gray-400 text-xs">
                      {templateDetails.steps?.length || 0} passos • {templateDetails.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-400 font-semibold text-sm">{templateDetails.steps?.length || 0}</div>
                  <div className="text-gray-400 text-xs">Steps</div>
                </div>
              </div>
            </div>
          )}

          {/* Template Actions - Available when backend has onboarding data AND there is a template */}
          {backendHasOnboarding && validateTemplateExists(system.id) && (
            <div className="mb-6 p-3 bg-gradient-to-r from-gray-600/10 to-gray-700/10 border border-gray-600/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  <span className="font-medium">Template Actions:</span>
                  <span className="ml-2 text-gray-400">
                    {isOnboardingRunning 
                      ? 'Please wait for completion to re-run' 
                      : backendIsComplete 
                        ? 'Available for re-run'
                        : backendIsInProgress
                          ? 'Onboarding in progress - you can re-run'
                          : 'Onboarding pending - you can run'
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleReExecuteTemplate}
                    disabled={isOnboardingRunning}
                    className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <Play size={14} />
                    <span>Update System</span>
                  </button>
                  
                  <button
                    onClick={() => setShowTemplateSelectionModal(true)}
                    disabled={isOnboardingRunning}
                    className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <Settings size={14} />
                    <span>Change Template</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Aviso quando não há template associado mas há dados de onboarding */}
          {backendHasOnboarding && !validateTemplateExists(system.id) && (
            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border border-yellow-400/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="text-yellow-400 font-semibold">Template Not Associated</h4>
                  <p className="text-gray-400 text-sm">
                    System has onboarding data but no template associated.
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Associate a template to be able to re-execute the onboarding.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-600">
                <button
                  onClick={() => setShowTemplateSelectionModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <Settings size={16} />
                  <span>Associate Template</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Mostrar steps do backend se disponíveis */}
            {backendHasOnboarding && onboardingStatusData.getSteps().length > 0 ? (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">
                  Steps do Backend ({onboardingStatusData.getSteps().length})
                </h4>
                <div className="space-y-3">
                  {onboardingStatusData.getSteps().map((step, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {step.status === 'success' ? (
                            <CheckCircle size={16} className="text-green-400" />
                          ) : step.status === 'failed' ? (
                            <XCircle size={16} className="text-red-400" />
                          ) : (
                            <Clock size={16} className="text-yellow-400" />
                          )}
                          <span className="text-white font-medium">{step.step}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            step.status === 'success' ? 'bg-green-400/20 text-green-400' :
                            step.status === 'failed' ? 'bg-red-400/20 text-red-400' :
                            'bg-yellow-400/20 text-yellow-400'
                          }`}>
                            {step.status}
                          </span>
                          <span className="text-gray-400 text-sm">{step.duration}ms</span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{step.description}</p>
                      
                      <div className="space-y-2">
                        <div>
                          <h6 className="text-xs font-medium text-white mb-1">Comando:</h6>
                          <div className="bg-gray-800 p-2 rounded text-xs text-green-400 font-mono">
                            {step.command}
                          </div>
                        </div>
                        <div>
                          <h6 className="text-xs font-medium text-white mb-1">Output:</h6>
                          <div className="bg-gray-800 p-2 rounded text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {step.output}
                          </div>
                        </div>
                        {step.error && (
                          <div>
                            <h6 className="text-xs font-medium text-red-400 mb-1">Erro:</h6>
                            <div className="bg-red-900/20 p-2 rounded text-xs text-red-400 font-mono whitespace-pre-wrap">
                              {step.error}
                            </div>
                          </div>
                        )}
                        
                        {/* Validações do Step */}
                        {(() => {
                          const validations = getStepValidations(step.step);
                          return validations.length > 0 ? (
                            <div>
                              <h6 className="text-xs font-medium text-yellow-400 mb-1 flex items-center space-x-1">
                                <Shield size={12} />
                                <span>Validações ({validations.length})</span>
                              </h6>
                              <div className="space-y-2">
                                {validations.map((validation: any, vIndex: number) => (
                                  <div key={vIndex} className="bg-yellow-500/10 rounded p-2 border border-yellow-500/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-yellow-400 text-xs font-medium">
                                        {validation.type}
                                      </span>
                                      <span className="text-gray-400 text-xs">
                                        {validation.required ? 'Obrigatório' : 'Opcional'}
                                      </span>
                                    </div>
                                    <p className="text-gray-300 text-xs mb-1">
                                      {validation.description || 'Sem descrição'}
                                    </p>
                                    <div className="bg-gray-800/50 rounded p-1">
                                      <code className="text-yellow-300 text-xs font-mono">
                                        Valor: {validation.value}
                                      </code>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}
                        
                        <div className="text-xs text-gray-400 pt-1 border-t border-gray-600">
                          <div className="flex justify-between">
                            <span>Categoria: {step.category}</span>
                            <span>{new Date(step.startedAt).toLocaleString('en-US')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Steps locais (apenas quando há onboarding mas não há steps do backend) */
              backendHasOnboarding && onboardingStatusData.getSteps().length === 0 ? (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">
                    Steps Locais (Onboarding iniciado mas sem steps do backend)
                </h4>
                <div className="space-y-3">
                  {mainSteps.map((key) => {
              const status = onboardingStatus[key as keyof typeof onboardingStatus];
              const isCompleted = status === 'complete';
              const hasCommandResult = commandResults[key];
              const isExpanded = selectedStepDetails === key;
              
              // Get real step result if available
              const stepMappingReverse: Record<keyof typeof onboardingStatus, string> = {
                'connectivityTest': 'connectivity',
                'privilegesTest': 'privileges-test',
                'processAnalysis': 'process-analysis',
                'serviceAnalysis': 'service-analysis',
                'openPortsAnalysis': 'open-ports-analysis',
                'snmpv3UserSetup': 'os-detection',
                'statusScript': 'system-info',
                'configFileCopy': 'resource-check',
                'configFileEdit': 'config-edit',
                'aliasSetup': 'alias-setup'
              };
              
              const stepResultsArray = stepResults[stepMappingReverse[key as keyof typeof onboardingStatus]];
              const realStepResult = stepResultsArray && stepResultsArray.length > 0 ? stepResultsArray[stepResultsArray.length - 1] : null;
              
              const getStatusIcon = (status: string) => {
                switch (status) {
                  case 'complete':
                    return <CheckCircle size={20} className="text-green-400" />;
                  case 'failed':
                    return <XCircle size={20} className="text-red-400" />;
                  case 'pending':
                  default:
                    return <Clock size={20} className="text-yellow-400" />;
                }
              };

              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'complete':
                    return 'text-green-400';
                  case 'failed':
                    return 'text-red-400';
                  case 'pending':
                  default:
                    return 'text-yellow-400';
                }
              };

              const getStatusText = (status: string) => {
                switch (status) {
                  case 'complete':
                    return 'Complete';
                  case 'failed':
                    return 'Failed';
                  case 'pending':
                  default:
                    return 'Pending';
                }
              };
              
              return (
                <div key={key}>
                  <div 
                    className={`flex items-center justify-between p-3 bg-gray-700 rounded-lg transition-colors ${
                      isCompleted && hasCommandResult ? 'cursor-pointer hover:bg-gray-600' : ''
                    }`}
                    onClick={() => {
                      if (isCompleted && hasCommandResult) {
                        setSelectedStepDetails(isExpanded ? null : key);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(status)}
                      <span className="text-white">{getOnboardingStepLabel(key)}</span>
                      {isCompleted && hasCommandResult && (
                        <span className="text-xs text-blue-400 ml-2">(click to view details)</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${getStatusColor(status)}`}>
                        {getStatusText(status)}
                      </span>
                      {isCompleted && hasCommandResult && (
                        isExpanded ? (
                          <ChevronUp size={16} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-400" />
                        )
                      )}
                    </div>
                  </div>
                  
                                    {/* Command Details Expansion */}
                  {isExpanded && (realStepResult || hasCommandResult) && (
                    <div className="mt-2 ml-8 p-4 bg-gray-600 rounded-lg">
                      <div className="space-y-3">
                        {stepResultsArray && stepResultsArray.length > 0 ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-medium text-white">Step History</h5>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400">
                                  {stepResultsArray.length} execution{stepResultsArray.length > 1 ? 's' : ''}
                                </span>
                                {stepResultsArray.length > 1 && (
                                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                    Multiple runs
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {stepResultsArray.slice().reverse().map((stepResult, index) => (
                              <div key={stepResultsArray.length - 1 - index} className={`p-3 rounded-lg border ${
                                stepResult.status === 'success' 
                                  ? 'bg-green-400/5 border-green-400/20' 
                                  : stepResult.status === 'failed'
                                  ? 'bg-red-400/5 border-red-400/20'
                                  : 'bg-yellow-400/5 border-yellow-400/20'
                              } ${index === 0 ? 'ring-1 ring-blue-500/30' : ''}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-gray-300">
                                    Execution #{stepResultsArray.length - index}
                                    {index === 0 && <span className="ml-2 text-blue-400">(Latest)</span>}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      stepResult.status === 'success' 
                                        ? 'bg-green-400/20 text-green-400' 
                                        : stepResult.status === 'failed'
                                        ? 'bg-red-400/20 text-red-400'
                                        : 'bg-yellow-400/20 text-yellow-400'
                                    }`}>
                                      {stepResult.status}
                                    </span>
                                    {stepResult.duration && (
                                      <span className="text-xs text-gray-400">
                                        {stepResult.duration}ms
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {stepResult.command && (
                                  <div className="mb-2">
                                    <h6 className="text-xs font-medium text-white mb-1">Command:</h6>
                                    <div className="bg-gray-800 p-2 rounded text-xs text-green-400 font-mono">
                                      {stepResult.command}
                                    </div>
                                  </div>
                                )}
                                
                                {stepResult.output && (
                                  <div className="mb-2">
                                    <h6 className="text-xs font-medium text-white mb-1">Output:</h6>
                                    <div className="bg-gray-800 p-2 rounded text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                                      {stepResult.output}
                                    </div>
                                  </div>
                                )}
                                
                                {stepResult.error && (
                                  <div className="mb-2">
                                    <h6 className="text-xs font-medium text-red-400 mb-1">Error:</h6>
                                    <div className="bg-red-900/20 p-2 rounded text-xs text-red-400 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                                      {stepResult.error}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="text-xs text-gray-400 pt-1 border-t border-gray-600">
                                  {new Date(stepResult.timestamp).toLocaleString()}
                                  {stepResult.exitCode !== undefined && (
                                    <span className="ml-2">Exit Code: {stepResult.exitCode}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : hasCommandResult ? (
                          <>
                            <div>
                              <h5 className="text-sm font-medium text-white mb-1">Command Executed:</h5>
                              <div className="bg-gray-800 p-2 rounded text-xs text-green-400 font-mono">
                                {commandResults[key].command}
                              </div>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-white mb-1">Output:</h5>
                              <div className="bg-gray-800 p-3 rounded text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                                {commandResults[key].output}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              Executed: {commandResults[key].timestamp}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  )}
                 
                 {/* Status Script Sub-steps */}
                 {key === 'statusScript' && (
                   <div className="ml-8 mt-2 space-y-2">
                     {statusScriptSubSteps.map((subKey) => {
                       const subStatus = onboardingStatus[subKey as keyof typeof onboardingStatus];
                       
                       const getSubStatusIcon = (status: string) => {
                         switch (status) {
                           case 'complete':
                             return <CheckCircle size={16} className="text-green-400" />;
                           case 'failed':
                             return <XCircle size={16} className="text-red-400" />;
                           case 'pending':
                           default:
                             return <Clock size={16} className="text-yellow-400" />;
                         }
                       };

                       const getSubStatusColor = (status: string) => {
                         switch (status) {
                           case 'complete':
                             return 'text-green-400';
                           case 'failed':
                             return 'text-red-400';
                           case 'pending':
                           default:
                             return 'text-yellow-400';
                         }
                       };

                       const getSubStatusText = (status: string) => {
                         switch (status) {
                           case 'complete':
                             return 'Complete';
                           case 'failed':
                             return 'Failed';
                           case 'pending':
                           default:
                             return 'Pending';
                         }
                       };

                       return (
                         <div key={subKey} className="flex items-center justify-between p-2 bg-gray-600 rounded-md">
                           <div className="flex items-center space-x-3">
                             {getSubStatusIcon(subStatus)}
                             <span className="text-sm text-gray-200">{getOnboardingStepLabel(subKey)}</span>
                           </div>
                           <span className={`text-xs ${getSubStatusColor(subStatus)}`}>
                             {getSubStatusText(subStatus)}
                           </span>
                         </div>
                       );
                     })}
                   </div>
                 )}
               </div>
             );
           })}
                 </div>
               </div>
             ) : null
             )}
          </div>
        </div>
      </div>
    );
  };

  const renderMonitoringTab = () => {
    const activeAlarms = [
      {
        id: 'alarm-1',
        severity: 'CRITICAL',
        name: 'HighCPUUsage',
        description: 'CPU usage is above 90% for more than 5 minutes',
        instance: `${system.ip}:9100`,
        timestamp: '2m ago',
        status: 'firing'
      },
      {
        id: 'alarm-2',
        severity: 'WARNING',
        name: 'HighMemoryUsage',
        description: 'Memory usage is above 80%',
        instance: `${system.ip}:9100`,
        timestamp: '15m ago',
        status: 'firing'
      },
      {
        id: 'alarm-3',
        severity: 'WARNING',
        name: 'DiskSpaceUsage',
        description: 'Disk usage on /var partition is above 85%',
        instance: 'device="/dev/sda1", mountpoint="/var"',
        timestamp: '1h ago',
        status: 'firing'
      },
      {
        id: 'alarm-4',
        severity: 'INFO',
        name: 'ServiceRestart',
        description: 'Apache service was restarted',
        instance: 'service="apache2.service"',
        timestamp: '3h ago',
        status: 'firing'
      }
    ];

    const allAlarms = [
      ...activeAlarms,
      {
        id: 'alarm-5',
        severity: 'WARNING',
        name: 'DatabaseConnections',
        description: 'MySQL connection pool is above 80%',
        instance: `${system.ip}:3306`,
        timestamp: '2h ago',
        status: 'resolved'
      },
      {
        id: 'alarm-6',
        severity: 'CRITICAL',
        name: 'ServiceDown',
        description: 'Nginx service is not responding',
        instance: `${system.ip}:80`,
        timestamp: '6h ago',
        status: 'resolved'
      },
      {
        id: 'alarm-7',
        severity: 'INFO',
        name: 'BackupCompleted',
        description: 'Daily backup completed successfully',
        instance: 'backup-job',
        timestamp: '8h ago',
        status: 'resolved'
      },
      {
        id: 'alarm-8',
        severity: 'WARNING',
        name: 'HighLatency',
        description: 'HTTP response time above 2 seconds',
        instance: `${system.ip}:80`,
        timestamp: '12h ago',
        status: 'silenced'
      }
    ];

    const getSeverityColor = (severity: string) => {
      switch (severity) {
        case 'CRITICAL':
          return 'bg-red-400/10 border-red-400/20';
        case 'WARNING':
          return 'bg-yellow-400/10 border-yellow-400/20';
        case 'INFO':
          return 'bg-blue-400/10 border-blue-400/20';
        default:
          return 'bg-gray-400/10 border-gray-400/20';
      }
    };

    const getSeverityTextColor = (severity: string) => {
      switch (severity) {
        case 'CRITICAL':
          return 'text-red-400';
        case 'WARNING':
          return 'text-yellow-400';
        case 'INFO':
          return 'text-blue-400';
        default:
          return 'text-gray-400';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'firing':
          return 'bg-red-500/20 text-red-400';
        case 'resolved':
          return 'bg-green-500/20 text-green-400';
        case 'silenced':
          return 'bg-gray-500/20 text-gray-400';
        default:
          return 'bg-gray-500/20 text-gray-400';
      }
    };

    const alarmsToShow = activeAlarmsView === 'active' ? activeAlarms : allAlarms;

    return (
      <div className="space-y-6">
        {/* Header with Create Alarm Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Monitoring & Alerts</h2>
          <div className="relative" data-dropdown="create-alarm">
            <button 
              onClick={() => {
                console.log('Create Alarm button clicked, current state:', showCreateAlarmDropdown);
                setShowCreateAlarmDropdown(!showCreateAlarmDropdown);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-green-400 hover:bg-green-500 text-black rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span>Create Alarm</span>
              <ChevronDown size={16} />
            </button>
            
            {showCreateAlarmDropdown && (
              <div data-dropdown="create-alarm" className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                <div className="p-2">
                  <button
                    onClick={() => handleCreateAlarmOption('template')}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Layout size={16} className="text-blue-400" />
                    <div>
                      <div className="font-medium">Default Template</div>
                      <div className="text-sm text-gray-400">Use predefined alarm templates</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('AI button clicked!');
                      handleCreateAlarmOption('ai');
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Bot size={16} className="text-purple-400" />
                    <div>
                      <div className="font-medium">Create with AI</div>
                      <div className="text-sm text-gray-400">Describe your alarm needs in chat</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Activity size={20} className="text-blue-400" />
              <span>Current Status</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${getStatusColor(system.status)}`}>
                  {system.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Uptime:</span>
                <span className="text-white">{system.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">CPU:</span>
                <span className="text-white">{system.cpu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">RAM:</span>
                <span className="text-white">{system.ram}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                <Bell size={20} className="text-yellow-400" />
                <span>Alarms Overview</span>
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-red-400/10 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{activeAlarms.filter(a => a.severity === 'CRITICAL').length}</div>
                <div className="text-sm text-gray-400">Critical</div>
              </div>
              <div className="text-center p-3 bg-yellow-400/10 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{activeAlarms.filter(a => a.severity === 'WARNING').length}</div>
                <div className="text-sm text-gray-400">Warning</div>
              </div>
              <div className="text-center p-3 bg-blue-400/10 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{activeAlarms.filter(a => a.severity === 'INFO').length}</div>
                <div className="text-sm text-gray-400">Info</div>
              </div>
              <div className="text-center p-3 bg-green-400/10 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{allAlarms.filter(a => a.status === 'resolved').length}</div>
                <div className="text-sm text-gray-400">Resolved</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alarms List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
              <AlertTriangle size={20} className="text-yellow-400" />
              <span>Alarms</span>
            </h3>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setActiveAlarmsView('active')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeAlarmsView === 'active' 
                    ? 'bg-green-400 text-black' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Active ({activeAlarms.length})
              </button>
              <button 
                onClick={() => setActiveAlarmsView('all')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeAlarmsView === 'all' 
                    ? 'bg-green-400 text-black' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All ({allAlarms.length})
              </button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alarmsToShow.map((alarm) => (
              <div key={alarm.id} className={`p-3 rounded-lg border ${getSeverityColor(alarm.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 text-xs rounded font-medium ${getSeverityTextColor(alarm.severity)} ${getSeverityColor(alarm.severity)}`}>
                        {alarm.severity}
                      </span>
                      <span className={`text-sm font-medium ${getSeverityTextColor(alarm.severity)}`}>
                        {alarm.name}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(alarm.status)}`}>
                        {alarm.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{alarm.description}</p>
                    <div className="text-xs text-gray-400 mt-1">
                      <span>{alarm.instance}</span> • <span>{alarm.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Showing {alarmsToShow.length} of {allAlarms.length} alarms
              </span>
              <span className="text-gray-400">Last Updated: 2 minutes ago</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">System Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-700 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">87.5%</div>
              <div className="text-sm text-gray-400">CPU Usage</div>
              <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                <div className="bg-green-400 h-2 rounded-full" style={{ width: '87.5%' }}></div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-700 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-400 mb-1">76.2%</div>
              <div className="text-sm text-gray-400">Memory Usage</div>
              <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '76.2%' }}></div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-700 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">45.8%</div>
              <div className="text-sm text-gray-400">Disk Usage</div>
              <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: '45.8%' }}></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-3">Network Traffic</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Inbound:</span>
                  <span className="text-white">125.4 MB/s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Outbound:</span>
                  <span className="text-white">98.7 MB/s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Packets/sec:</span>
                  <span className="text-white">15,234</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-white font-medium mb-3">Load Average</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">1 min:</span>
                  <span className="text-white">2.45</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">5 min:</span>
                  <span className="text-white">2.12</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">15 min:</span>
                  <span className="text-white">1.89</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Monitoring Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 bg-blue-400/10 border border-blue-400/20 rounded-lg hover:bg-blue-400/20 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <Settings size={20} className="text-blue-400" />
                <span className="text-white font-medium">Configure Alerts</span>
              </div>
              <p className="text-gray-400 text-sm">Set thresholds and notifications</p>
            </button>
            
            <button className="p-4 bg-green-400/10 border border-green-400/20 rounded-lg hover:bg-green-400/20 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <Monitor size={20} className="text-green-400" />
                <span className="text-white font-medium">Grafana Dashboard</span>
              </div>
              <p className="text-gray-400 text-sm">Open in Grafana</p>
            </button>

            <button className="p-4 bg-purple-400/10 border border-purple-400/20 rounded-lg hover:bg-purple-400/20 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <Activity size={20} className="text-purple-400" />
                <span className="text-white font-medium">Prometheus Targets</span>
              </div>
              <p className="text-gray-400 text-sm">View monitoring targets</p>
            </button>
          </div>
        </div>

        {/* Resumo dos Dados do Backend */}
        {onboardingStatusData.hasOnboarding && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-400/20 rounded-lg">
            <h4 className="text-blue-400 font-semibold mb-3">📊 Dados do Backend (Tempo Real)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 font-medium ${
                  onboardingStatusData.isCompleted ? 'text-green-400' : 
                  onboardingStatusData.isInProgress ? 'text-blue-400' : 'text-yellow-400'
                }`}>
                  {onboardingStatusData.getStatusText()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Progresso:</span>
                <span className="ml-2 text-white font-medium">{onboardingStatusData.progress}%</span>
              </div>
              <div>
                <span className="text-gray-400">Steps:</span>
                <span className="ml-2 text-white font-medium">
                  {onboardingStatusData.getCompletedSteps()}/{onboardingStatusData.getTotalSteps()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Duração:</span>
                <span className="ml-2 text-white font-medium">
                  {Math.round(onboardingStatusData.getDuration() / 1000)}s
                </span>
              </div>
            </div>
            
            {onboardingStatusData.getOSInfo() && (
              <div className="mt-3 pt-3 border-t border-blue-400/20">
                <span className="text-gray-400">Sistema Detectado:</span>
                <span className="ml-2 text-white font-medium">
                  {onboardingStatusData.getOSInfo()?.prettyName}
                </span>
                <span className="ml-2 text-gray-400">
                  ({onboardingStatusData.getOSInfo()?.architecture})
                </span>
              </div>
            )}
            
            {onboardingStatusData.getSteps().length > 0 && (
              <div className="mt-3">
                <span className="text-gray-400">Steps Executados:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {onboardingStatusData.getSteps().map((step, index) => (
                    <span
                      key={index}
                      className={`px-2 py-1 text-xs rounded ${
                        step.status === 'success' ? 'bg-green-400/20 text-green-400' :
                        step.status === 'failed' ? 'bg-red-400/20 text-red-400' :
                        'bg-yellow-400/20 text-yellow-400'
                      }`}
                    >
                      {step.step}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Seção de Status Completo do Onboarding do Backend */}
        <div className="mt-8">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Status Completo do Onboarding</h3>
              <div className="flex items-center space-x-2">
                {onboardingStatusData.loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                )}
                <span className={`text-sm font-medium ${
                  onboardingStatusData.hasOnboarding ? 
                    (onboardingStatusData.isCompleted ? 'text-green-400' : 
                     onboardingStatusData.isInProgress ? 'text-blue-400' : 
                     onboardingStatusData.isFailed ? 'text-red-400' : 'text-yellow-400') :
                    'text-gray-400'
                }`}>
                  {onboardingStatusData.getStatusText()} ({onboardingStatusData.progress}%)
                </span>
              </div>
            </div>
            
            {onboardingStatusData.error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-400/20 rounded-lg">
                <p className="text-red-400 text-sm">❌ {onboardingStatusData.error}</p>
              </div>
            )}
            
            {!onboardingStatusData.loading && !onboardingStatusData.error && (
              <div className="text-sm text-gray-400 mb-4">
                {onboardingStatusData.hasOnboarding ? (
                  <div className="space-y-1">
                    <div>✅ <strong>{onboardingStatusData.getCompletedSteps()}</strong> de <strong>{onboardingStatusData.getTotalSteps()}</strong> passos concluídos</div>
                    {onboardingStatusData.getFailedSteps() > 0 && (
                      <div>❌ <strong>{onboardingStatusData.getFailedSteps()}</strong> passos falharam</div>
                    )}
                    {onboardingStatusData.getDuration() > 0 && (
                      <div>⏱️ Duração: <strong>{Math.round(onboardingStatusData.getDuration() / 1000)}s</strong></div>
                    )}
                    {onboardingStatusData.getOSInfo() && (
                      <div>🖥️ Sistema: <strong>{onboardingStatusData.getOSInfo()?.prettyName}</strong></div>
                    )}
                  </div>
                ) : (
                  <div>ℹ️ Nenhum processo de onboarding encontrado no backend</div>
                )}
              </div>
            )}
          </div>
          
          {/* Componente Completo de Status do Onboarding */}
          {onboardingStatusData.hasOnboarding && !onboardingStatusData.loading && (
            <OnboardingStatusViewer systemId={system.id} />
          )}
        </div>

      </div>
    );
  };



  const getDocumentTypeIcon = (type: Document['type']) => {
    switch (type) {
      case 'manual':
        return <Book size={16} className="text-blue-400" />;
      case 'procedure':
        return <Settings size={16} className="text-green-400" />;
      case 'config':
        return <Server size={16} className="text-purple-400" />;
      case 'log':
        return <FileText size={16} className="text-yellow-400" />;
    }
  };

  const getDocumentTypeColor = (type: Document['type']) => {
    switch (type) {
      case 'manual':
        return 'bg-blue-400/10 border-blue-400/20 text-blue-400';
      case 'procedure':
        return 'bg-green-400/10 border-green-400/20 text-green-400';
      case 'config':
        return 'bg-purple-400/10 border-purple-400/20 text-purple-400';
      case 'log':
        return 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const document = documents.find(doc => doc.id === docId);
      if (!document) return;

      // Verificar se o sistema tem slug
      if (!system.slug) {
        showToast('Erro: Sistema não tem slug definido', 'error');
        return;
      }

      console.log('🗑️ [FILE-DELETE] Deleting document:', document.name);
      
      const systemSlug = system.slug;
      await uploadService.deleteFile(systemSlug, document.name);
      
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      showToast('File deleted successfully', 'success');
      
    } catch (error: any) {
      console.error('❌ [FILE-DELETE] Failed to delete document:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error deleting file';
      
      showToast(`Error deleting: ${errorMessage}`, 'error');
    }
  };

  const handleDownloadDocument = async (docId: string) => {
    try {
      const document = documents.find(doc => doc.id === docId);
      if (!document) return;

      // Verificar se o sistema tem slug
      if (!system.slug) {
        showToast('Erro: Sistema não tem slug definido', 'error');
        return;
      }

      console.log('⬇️ [FILE-DOWNLOAD] Downloading document:', document.name);
      
      const systemSlug = system.slug;
      const blob = await uploadService.downloadFile(systemSlug, document.name);
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToast('Download iniciado', 'success');
      
    } catch (error: any) {
      console.error('❌ [FILE-DOWNLOAD] Failed to download document:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error downloading';
      
      showToast(`Erro no download: ${errorMessage}`, 'error');
    }
  };

  // File upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const getFileType = (fileName: string | undefined | null): Document['type'] => {
    // Verificar se fileName existe e é uma string válida
    if (!fileName || typeof fileName !== 'string') {
      console.warn('⚠️ [FILE-TYPE] Invalid fileName:', fileName);
      return 'manual'; // Fallback para manual
    }
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
      case 'doc':
      case 'docx':
        return 'manual';
      case 'txt':
      case 'md':
        return 'procedure';
      case 'json':
      case 'xml':
      case 'conf':
      case 'cfg':
        return 'config';
      case 'log':
        return 'log';
      default:
        return 'manual';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Verificar se o sistema tem slug
    if (!system.slug) {
      showToast('Erro: Sistema não tem slug definido', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('📤 [UPLOAD] Starting real file upload for system:', system.slug);
      
      // Usar o slug do sistema como identificador único
      const systemSlug = system.slug;
      
      // Upload real usando o service
      const uploadResult = await uploadService.uploadFile(
        selectedFile, 
        systemSlug,
        `Document uploaded for system: ${system.name}`
      );

      console.log('✅ [UPLOAD] File uploaded successfully:', uploadResult);
      console.log('📋 [UPLOAD] Upload result data:', {
        id: uploadResult.data?.id,
        name: uploadResult.data?.name,
        size: uploadResult.data?.size,
        uploadedAt: uploadResult.data?.uploadedAt,
        description: uploadResult.data?.description
      });

      // Criar documento com dados reais da API
      const newDocument: Document = {
        id: uploadResult.data?.id || `doc_${Date.now()}`,
        name: uploadResult.data?.name || selectedFile.name,
        type: getFileType(uploadResult.data?.name || selectedFile.name),
        size: formatFileSize(uploadResult.data?.size || selectedFile.size),
        lastModified: new Date(uploadResult.data?.uploadedAt || Date.now()).toISOString().split('T')[0],
        description: uploadResult.data?.description || `Uploaded document: ${uploadResult.data?.name || selectedFile.name}`
      };

      setDocuments(prev => [...prev, newDocument]);
      showToast('File uploaded successfully', 'success');
      
    } catch (error: any) {
      console.error('❌ [UPLOAD] File upload failed:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error uploading file';
      
      showToast(`Erro no upload: ${errorMessage}`, 'error');
    } finally {
      setShowUploadModal(false);
      setSelectedFile(null);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setDragActive(false);
    setUploadProgress(0);
    setIsUploading(false);
  };

  // Função utilitária para validar template
  const validateTemplateExists = (systemId: string): boolean => {
    const selectedTemplateData = localStorage.getItem(`selected_template_${systemId}`);
    if (!selectedTemplateData) {
      console.error('❌ [TEMPLATE-VALIDATION] No template associated with system:', systemId);
      return false;
    }
    try {
      const templateInfo = JSON.parse(selectedTemplateData);
      console.log('✅ [TEMPLATE-VALIDATION] Template found:', templateInfo);
      return true;
    } catch (error) {
      console.error('❌ [TEMPLATE-VALIDATION] Invalid template data:', error);
      clearInvalidTemplate(systemId);
      return false;
    }
  };

  const loadTemplateDetails = async () => {
    if (!validateTemplateExists(system.id)) return;
    
    try {
      const selectedTemplateData = localStorage.getItem(`selected_template_${system.id}`)!;
      const templateInfo = JSON.parse(selectedTemplateData);
      
      const template = await templatesService.getTemplate(templateInfo.id);
      setTemplateDetails(template);
      console.log('📋 [TEMPLATE-DETAILS] Template details loaded:', template);
    } catch (error) {
      console.error('❌ [TEMPLATE-DETAILS] Failed to load template details:', error);
    }
  };

  const loadExistingFiles = async () => {
    try {
      // Verificar se o sistema tem slug
      if (!system.slug) {
        console.log('⚠️ [FILES] System has no slug, skipping file load');
        return;
      }

      console.log('📁 [FILES] Loading existing files for system:', system.slug);
      
      const systemSlug = system.slug;
      const filesResponse = await uploadService.listFiles(systemSlug);
      
      console.log('✅ [FILES] Files loaded successfully:', filesResponse);
      
      // Converter FileInfo para Document
      const existingDocuments: Document[] = filesResponse.data.files.map(file => ({
        id: file.id || `file_${Date.now()}_${Math.random()}`,
        name: file.name || 'Unknown file',
        type: getFileType(file.name),
        size: formatFileSize(file.size || 0),
        lastModified: new Date(file.uploadedAt || Date.now()).toISOString().split('T')[0],
        description: file.description || `File: ${file.name || 'Unknown file'}`
      }));
      
      setDocuments(existingDocuments);
      console.log('📁 [FILES] Converted to documents:', existingDocuments);
      
    } catch (error) {
      console.error('❌ [FILES] Failed to load existing files:', error);
      // Não mostrar erro ao utilizador se não há ficheiros ainda
    }
  };

  const getStepValidations = (stepName: string) => {
    if (!templateDetails?.steps) return [];
    
    const step = templateDetails.steps.find((s: any) => s.name === stepName);
    return step?.validations || [];
  };

  // Função para limpar dados de template corrompidos ou inválidos
  const clearInvalidTemplate = (systemId: string) => {
    localStorage.removeItem(`selected_template_${systemId}`);
    console.log('🧹 [TEMPLATE-CLEANUP] Removed invalid template data for system:', systemId);
  };

  // Onboarding functions
  const handleStartOnboarding = () => {
    // SEMPRE forçar seleção de template - nunca permitir onboarding manual
    console.log('🚀 [ONBOARDING] Forcing template selection - manual onboarding is disabled');
    setIsReExecuting(false); // Nova execução
    setShowTemplateSelectionModal(true);
  };

  // Função específica para re-execução de template
  const handleReExecuteTemplate = () => {
    if (!validateTemplateExists(system.id)) {
      showToast('Erro: Não há template associado para re-executar', 'error');
      return;
    }

    const selectedTemplateData = localStorage.getItem(`selected_template_${system.id}`)!;
    const templateInfo = JSON.parse(selectedTemplateData);
    
    const confirmed = window.confirm(
      `Tem certeza que deseja re-executar o template "${templateInfo.name}"?\n\n` +
      `Esta ação irá:\n` +
      `• Executar novamente todos os comandos do template\n` +
      `• Atualizar as informações do sistema\n` +
      `• Substituir os resultados anteriores\n\n` +
      `Continuar?`
    );

    if (confirmed) {
      console.log('🔄 [RE-EXECUTION] User confirmed template re-execution:', templateInfo.name);
      setIsReExecuting(true); // Marca como re-execução
      setShowOnboardingModal(true);
    } else {
      console.log('🔄 [RE-EXECUTION] User cancelled template re-execution');
    }
  };

  const handleTemplateSelected = async (template: Template | null) => {
    setShowTemplateSelectionModal(false);
    
    try {
      if (template) {
        console.log('🚀 [ONBOARDING] Preparing onboarding with template:', template.name);
        
        // Criar processo com template (passos base + passos do template)
        const startResult = await onboardingService.startOnboarding({
          systemId: system.id,
          templateId: template._id,
          config: {
            stopOnFirstError: false,
            globalTimeout: 300,
            maxRetries: 2
          }
        });

        console.log('🚀 [ONBOARDING] Onboarding created with template:', startResult);
        
        // Armazenar template selecionado
        localStorage.setItem(`selected_template_${system.id}`, JSON.stringify({
          id: template._id,
          name: template.name
        }));
        
        showToast(`Onboarding preparado com passos base + template "${template.name}". Insira as credenciais.`, 'success');
        
      } else {
        console.log('🚀 [ONBOARDING] Preparing onboarding with base steps only (no template)');
        
        // Criar processo sem template (apenas passos base obrigatórios)
        const startResult = await onboardingService.startOnboarding({
          systemId: system.id,
          config: {
            stopOnFirstError: false,
            globalTimeout: 300,
            maxRetries: 2
          }
        });

        console.log('🚀 [ONBOARDING] Onboarding created with base steps only:', startResult);
        
        // Limpar template anterior se existir
        localStorage.removeItem(`selected_template_${system.id}`);
        
        showToast('Onboarding preparado apenas com passos base (diagnóstico + Node Exporter). Insira as credenciais.', 'info');
      }
      
      // Mostrar modal de SSH para inserir credenciais
      setShowOnboardingModal(true);

    } catch (error: any) {
      console.error('❌ [ONBOARDING] Failed to prepare onboarding:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
      showToast(`Error preparing onboarding: ${errorMessage}`, 'error');
    }
  };

  const handleCreateTemplate = () => {
    setShowTemplateSelectionModal(false);
    setShowCreateTemplateModal(true);
  };

  const handleTemplateCreated = async (templateId: string) => {
    setShowCreateTemplateModal(false);
    
    try {
      // Small delay to ensure template is fully created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the newly created template
      const newTemplate = await templatesService.getTemplate(templateId);
      
      // Verify template is active
      if (newTemplate.status !== 'active') {
        console.warn('⚠️ Template created but not active:', newTemplate.status);
        showToast(`Template criado mas não está ativo (status: ${newTemplate.status})`, 'warning');
      } else {
        showToast(`Template "${newTemplate.name}" created and saved successfully!`, 'success');
      }
      
      console.log('✅ Template created and saved:', newTemplate);
      
      // Return to template selection instead of auto-starting onboarding
      setShowTemplateSelectionModal(true);
      
    } catch (error: any) {
      console.error('❌ Error loading created template:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
      showToast(`Error loading created template: ${errorMessage}`, 'error');
      
      // If error, go back to template selection
      setShowTemplateSelectionModal(true);
    }
  };

  const handleCreateTemplateClose = () => {
    setShowCreateTemplateModal(false);
    // Reopen template selection modal
    setShowTemplateSelectionModal(true);
  };

  const clearConnectionTestResult = () => {
    setConnectionTestResult(null);
    setShowConnectionTestResult(false);
  };

  const resetOnboardingModal = () => {
    setShowOnboardingModal(false);
    setOnboardingCredentials({
      username: '',
      password: '',
      privateKey: '',
      usePrivateKey: false
    });
    clearConnectionTestResult();
  };

  const handleTestConnection = async () => {
    if (!onboardingCredentials.username || 
        (!onboardingCredentials.password && !onboardingCredentials.privateKey)) {
      return;
    }

    setIsTestingConnection(true);
    setShowConnectionTestResult(false);
    setConnectionTestResult(null);

    try {
      const testRequest = {
        host: system.ip,
        port: 22,
        credentials: {
          username: onboardingCredentials.username,
          ...(onboardingCredentials.usePrivateKey 
            ? { privateKey: onboardingCredentials.privateKey }
            : { password: onboardingCredentials.password }
          )
        }
      };

      const result = await onboardingService.testConnection(testRequest);
      
      if (result.data?.connectivity?.status === 'success') {
        const testResult = {
          success: true,
          message: 'SSH connection successful',
          responseTime: result.data.connectivity.responseTime
        };
        setConnectionTestResult(testResult);
        setShowConnectionTestResult(true);
        showToast('SSH connection test successful!', 'success', 8000);
      } else {
        const testResult = {
          success: false,
          message: 'SSH connection failed. Please check credentials and network connectivity.'
        };
        setConnectionTestResult(testResult);
        setShowConnectionTestResult(true);
        console.log('Connection test failed, setting result to show:', testResult);
        showToast('SSH connection test failed. Please verify your credentials.', 'error', 8000);
      }

    } catch (error) {
      console.error('Connection test failed:', error);
      const testResult = {
        success: false,
        message: 'SSH connection failed. Please check credentials and network connectivity.'
      };
      setConnectionTestResult(testResult);
      setShowConnectionTestResult(true);
      console.log('Connection test error, setting result to show:', testResult);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRunOnboarding = async () => {
    if (!onboardingCredentials.username || 
        (!onboardingCredentials.password && !onboardingCredentials.privateKey)) {
      return;
    }

    // Template é opcional - verificar se existe para log
    const selectedTemplateData = localStorage.getItem(`selected_template_${system.id}`);
    const hasTemplate = !!selectedTemplateData;
    console.log(`🚀 [ONBOARDING] Starting with template: ${hasTemplate ? 'yes' : 'no (base steps only)'}`);

    setIsOnboardingRunning(true);
    setShowOnboardingModal(false);
    setStepResults({});

    const credentials = {
      username: onboardingCredentials.username,
      ...(onboardingCredentials.usePrivateKey 
        ? { privateKey: onboardingCredentials.privateKey }
        : { password: onboardingCredentials.password }
      )
    };

      // Log das credenciais construídas
      console.log('🔐 [SYSTEMPROFILE] Credentials built:', {
        username: credentials.username,
        hasPassword: 'password' in credentials,
        password: 'password' in credentials ? credentials.password : 'NOT_INCLUDED',
        hasPrivateKey: 'privateKey' in credentials,
        usePrivateKey: onboardingCredentials.usePrivateKey
      });

            try {
        const executionType = isReExecuting ? 'RE-EXECUTION' : 'ONBOARDING';
        
        // Log das credenciais para debug (sem revelar password completa)
        console.log(`🔐 [${executionType}] Credentials debug:`, {
          username: credentials.username,
          hasPassword: !onboardingCredentials.usePrivateKey,
          passwordLength: onboardingCredentials.password?.length || 0,
          passwordPreview: onboardingCredentials.password ? `${onboardingCredentials.password.substring(0, 2)}***` : 'none',
          usePrivateKey: onboardingCredentials.usePrivateKey,
          hasPrivateKey: onboardingCredentials.usePrivateKey,
          privateKeyLength: onboardingCredentials.privateKey?.length || 0
        });
      const actionMessage = isReExecuting ? 'Re-executando template para atualizar sistema' : 'Executando onboarding inicial';
      
      console.log(`🚀 [${executionType}] ${actionMessage} for system:`, system.id);
      
      // Log current onboarding status before execution
      console.log(`🚀 [${executionType}] Current onboarding status:`, onboardingStatusData.data?.data);
      
      // Check if onboarding is in failed state and try to reset it
      const currentOnboarding = onboardingStatusData.data?.data?.onboarding;
      if (currentOnboarding?.status === 'failed') {
        console.log(`🔄 [${executionType}] Onboarding is in failed state, attempting to reset...`);
        try {
          await onboardingService.resetOnboardingStatus(system.id);
          console.log(`🔄 [${executionType}] Onboarding status reset successfully`);
          // Refresh status after reset
          await onboardingStatusData.refresh();
        } catch (error) {
          console.warn(`⚠️ [${executionType}] Failed to reset onboarding status, continuing anyway:`, error);
        }
      }
      
      // Primeiro testar a conexão SSH antes de executar o onboarding
      console.log(`🔌 [${executionType}] Testing SSH connection before execution...`);
      const testRequest = {
        host: system.ip,
        port: 22,
        credentials: credentials
      };
      
      try {
        const connectionTest = await onboardingService.testConnection(testRequest);
        console.log(`🔌 [${executionType}] SSH connection test result:`, connectionTest);
        
        if (connectionTest.data?.connectivity?.status !== 'success') {
          throw new Error('SSH connection test failed');
        }
      } catch (connectionError: any) {
        console.error(`🔌 [${executionType}] SSH connection test failed:`, connectionError);
        showToast('Teste de conexão SSH falhou. Verifique as credenciais e conectividade.', 'error');
        setIsOnboardingRunning(false);
        return;
      }
      
      // Usar a API /onboarding-execution/run com as credenciais
      const executionResult = await onboardingService.runOnboardingExecution({
        systemId: system.id,
        credentials: credentials
      });
      
      console.log(`🚀 [${executionType}] Execution started successfully:`, executionResult);
      
      const toastMessage = isReExecuting 
        ? 'System update started successfully!' 
        : 'Onboarding started successfully!';
      showToast(toastMessage, 'success');
      
      // Refresh status after a small delay
      setTimeout(() => {
        onboardingStatusData.refresh();
      }, 1000);
      
      // Monitorar progresso via SSE em tempo real
      // O backend executa os steps automaticamente após /onboarding-execution/run
      // Passos base são sempre executados + passos do template (se houver)
      
      if (selectedTemplateData) {
        try {
          const templateInfo = JSON.parse(selectedTemplateData);
          console.log(`🚀 [${executionType}] Template found:`, templateInfo);
          console.log(`🚀 [${executionType}] Executing: base steps + template steps`);
        } catch (error: any) {
          console.warn('⚠️ [ONBOARDING] Error parsing template info:', error);
        }
      } else {
        console.log(`🚀 [${executionType}] No template - executing base steps only (diagnostics + Node Exporter)`);
      }
      
      if (isReExecuting) {
        console.log(`🔄 [${executionType}] This is a re-execution to update system data`);
      }
      
      // Monitorar progresso via SSE em tempo real (ENDPOINT ATIVO)
      const cleanup = onboardingService.subscribeToRealtimeUpdates(
        system.id,
        (realtimeData: any) => {
          console.log('📡 [ONBOARDING-REALTIME] Progress update:', realtimeData);
          
          // Atualizar status baseado em dados em tempo real
          if (realtimeData.progress !== undefined) {
            setOnboardingProgress(prev => ({
              ...prev,
              progress: realtimeData.progress
            }));
          }

          // Refresh status quando há mudanças
          onboardingStatusData.refresh();
          
          // Parar monitoramento quando completo
          if (realtimeData.status === 'completed') {
            const completionType = isReExecuting ? 'RE-EXECUTION' : 'ONBOARDING';
            console.log(`✅ [${completionType}-REALTIME] Onboarding execution completed`);
            
            if (isReExecuting) {
              showToast('System updated successfully!', 'success');
            }
            
            // 📊 Recarregar dados do sistema após onboarding para mostrar System Summary atualizado
            console.log('📊 [ONBOARDING] Reloading system profile data after completion...');
            loadKbSystemInfo();
            
            // Reset states
            setIsReExecuting(false);
            cleanup();
          }
        }
      );
      
      // Cleanup após 10 minutos (timeout de segurança)
      setTimeout(() => {
        cleanup();
        setIsReExecuting(false); // Reset state on timeout
        console.log('⏰ [ONBOARDING-REALTIME] Cleanup timeout - stopping monitoring');
      }, 600000); // 10 minutes
      
      console.log('✅ [ONBOARDING] Execution initiated - monitoring via real-time SSE');
      
    } catch (error: any) {
      const errorType = isReExecuting ? 'RE-EXECUTION' : 'ONBOARDING';
      console.error(`❌ [${errorType}] Failed to execute:`, error);
      
      // Verificar se é erro de conexão SSH
      const errorDetails = error.response?.data?.error || '';
      const isSSHError = errorDetails.includes('SSH') || 
                        errorDetails.includes('authentication') ||
                        errorDetails.includes('connection');
      
      let toastMessage: string;
      if (isSSHError) {
        toastMessage = isReExecuting 
          ? 'Erro de conexão SSH: Verifique as credenciais e conectividade'
          : 'Erro de conexão SSH: Verifique as credenciais e conectividade';
        console.error('🔌 [SSH-ERROR] SSH connection failed - check credentials and network');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
        toastMessage = isReExecuting 
          ? `Error updating system: ${errorMessage}`
          : `Error executing onboarding: ${errorMessage}`;
      }
      
      showToast(toastMessage, 'error');
    } finally {
      setIsOnboardingRunning(false);
      setIsReExecuting(false); // Always reset re-execution state
    }
  };

  // Test execution functions
  const runTest = async (test: TestCase) => {
    const executionId = `exec-${Date.now()}`;
    const execution: TestExecution = {
      id: executionId,
      testId: test.id,
      testName: test.name,
      startTime: new Date().toISOString(),
      status: 'running',
      progress: 0,
      logs: [`[${new Date().toLocaleTimeString()}] Test initialization started...`]
    };

    // Update test status to running
    setAvailableTests(prev => 
      prev.map(t => t.id === test.id ? { ...t, status: 'running' } : t)
    );

    // Add to running tests
    setRunningTests(prev => new Map(prev.set(executionId, execution)));

    // Simulate test execution with progress updates
    const progressInterval = setInterval(() => {
      setRunningTests(prev => {
        const current = prev.get(executionId);
        if (!current || current.progress! >= 100) {
          clearInterval(progressInterval);
          return prev;
        }

        const newProgress = Math.min(current.progress! + Math.random() * 15, 100);
        const updated = {
          ...current,
          progress: newProgress,
          logs: [
            ...current.logs,
            `[${new Date().toLocaleTimeString()}] Progress: ${Math.round(newProgress)}%`,
            ...(newProgress > 30 ? [`[${new Date().toLocaleTimeString()}] Running ${test.category} checks...`] : []),
            ...(newProgress > 60 ? [`[${new Date().toLocaleTimeString()}] Analyzing results...`] : []),
            ...(newProgress > 90 ? [`[${new Date().toLocaleTimeString()}] Finalizing test execution...`] : [])
          ]
        };

        return new Map(prev.set(executionId, updated));
      });
    }, 1000);

    // Complete test after random duration
    setTimeout(() => {
      clearInterval(progressInterval);
      const isSuccess = Math.random() > 0.2; // 80% success rate
      const endTime = new Date().toISOString();
      const duration = Math.floor((new Date(endTime).getTime() - new Date(execution.startTime).getTime()) / 1000);

      const completedExecution: TestExecution = {
        ...execution,
        endTime,
        duration: `${duration}s`,
        status: isSuccess ? 'passed' : 'failed',
        result: isSuccess ? 'success' : 'error',
        progress: 100,
        logs: [
          ...execution.logs,
          `[${new Date().toLocaleTimeString()}] Test ${isSuccess ? 'completed successfully' : 'failed'}`,
          `[${new Date().toLocaleTimeString()}] Duration: ${duration} seconds`
        ],
        metrics: {
          cpu: Math.floor(Math.random() * 100),
          memory: Math.floor(Math.random() * 100),
          responseTime: Math.floor(Math.random() * 1000),
          errors: isSuccess ? 0 : Math.floor(Math.random() * 5)
        }
      };

      // Update test status back to available
      setAvailableTests(prev => 
        prev.map(t => t.id === test.id ? { ...t, status: 'available' } : t)
      );

      // Remove from running tests and add to history
      setRunningTests(prev => {
        const newMap = new Map(prev);
        newMap.delete(executionId);
        return newMap;
      });

      setTestHistory(prev => [completedExecution, ...prev]);
    }, 3000 + Math.random() * 7000); // 3-10 seconds
  };

  const cancelTest = (executionId: string) => {
    setRunningTests(prev => {
      const execution = prev.get(executionId);
      if (execution) {
        const cancelledExecution: TestExecution = {
          ...execution,
          endTime: new Date().toISOString(),
          status: 'cancelled',
          logs: [...execution.logs, `[${new Date().toLocaleTimeString()}] Test cancelled by user`]
        };

        setTestHistory(prevHistory => [cancelledExecution, ...prevHistory]);
        setAvailableTests(prevTests => 
          prevTests.map(t => t.id === execution.testId ? { ...t, status: 'available' } : t)
        );
      }

      const newMap = new Map(prev);
      newMap.delete(executionId);
      return newMap;
    });
  };

  const getTestCategoryIcon = (category: TestCase['category']) => {
    switch (category) {
      case 'performance':
        return <Activity className="text-blue-400" size={16} />;
      case 'security':
        return <Settings className="text-red-400" size={16} />;
      case 'functionality':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'connectivity':
        return <Network className="text-purple-400" size={16} />;
    }
  };

  const getTestStatusColor = (status: TestCase['status']) => {
    switch (status) {
      case 'available':
        return 'text-green-400';
      case 'running':
        return 'text-yellow-400';
      case 'completed':
        return 'text-blue-400';
      case 'failed':
        return 'text-red-400';
    }
  };

  const getExecutionStatusColor = (status: TestExecution['status']) => {
    switch (status) {
      case 'running':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'passed':
        return 'text-green-400 bg-green-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/20';
      case 'cancelled':
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  // Removido gerador de respostas mock do Issue Solver (usar backend)

  // Check onboarding completion status
  const getOnboardingStatusInfo = () => {
    // Preferir backend display/status quando disponível
    if (onboardingStatusData.hasOnboarding) {
      const display = (onboardingStatusData as any).data?.data?.system?.onboardingStatusDisplay || (onboardingStatusData as any).data?.data?.onboardingStatusDisplay;
      const status = onboardingStatusData.status; // 'pending' | 'in_progress' | 'completed' | 'failed' (dependendo do hook)
      if (display) {
        const color = display.includes('Completed') || display.includes('Online') ? 'text-green-400' : display.includes('In Progress') || display.includes('Pending') ? 'text-yellow-400' : display.includes('Failed') || display.includes('Offline') ? 'text-red-400' : 'text-gray-400';
        return { status, text: display, color } as const;
      }
      if (onboardingStatusData.isCompleted) {
        return { status: 'completed', text: 'Completed', color: 'text-green-400' } as const;
      }
      if (onboardingStatusData.isInProgress) {
        return { status: 'in_progress', text: 'In Progress', color: 'text-yellow-400' } as const;
      }
      if (onboardingStatusData.isFailed) {
        return { status: 'failed', text: 'Failed', color: 'text-red-400' } as const;
      }
    }
    // Fallback local
    const statusValues = Object.values(onboardingStatus);
    const completedSteps = statusValues.filter(status => status === 'complete').length;
    const failedSteps = statusValues.filter(status => status === 'failed').length;
    const totalSteps = statusValues.length;
    if (completedSteps === totalSteps && totalSteps > 0) return { status: 'completed', text: 'Completed', color: 'text-green-400' } as const;
    if (failedSteps > 0) return { status: 'failed', text: 'Failed', color: 'text-red-400' } as const;
    if (completedSteps > 0) return { status: 'partial', text: `${completedSteps}/${totalSteps}`, color: 'text-yellow-400' } as const;
    return { status: 'pending', text: 'Not Started', color: 'text-gray-400' } as const;
  };

  // Check script status
  // Script status removido do perfil conforme pedido

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

  // Handle Issue Solver Chat
  const handleIssueSolverMessage = async () => {
    if (!issueSolverCurrentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: issueSolverCurrentMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    const previousHistory = issueSolverMessages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      text: m.text,
      ai: m.ai,
      timestamp: m.timestamp
    }));

    setIssueSolverMessages(prev => [...prev, userMessage]);
    setIssueSolverCurrentMessage('');
    setIsIssueSolverThinking(true);

    try {
      const troubleshootPayload = {
        systemId: system.id,
        subject: 'Troubleshoot Assistant',
        message: userMessage.text,
        context: {
          source: 'SystemProfile.Troubleshoot',
          system: { id: system.id, name: system.name, os: system.os },
          previousMessages: previousHistory,
          historyPrompt:
            'These are the previous messages (format role: text):\n' +
            previousHistory.map((h) => `${h.role}: ${h.text}`).join('\n') +
            '\n\nCurrent message (user): ' + userMessage.text
        }
      } as const;
      console.log('🧠 [ISSUE-HELPER][TROUBLESHOOT] createMessage payload:', troubleshootPayload);
      const created = await issueHelperService.createMessage(troubleshootPayload as any);

      // Tentar resolver imediatamente
      try {
        await issueHelperService.solve((created as any)._id || (created as any).id, {
          system: system.name,
          issue: userMessage.text,
          topK: 8,
          options: {}
        });
      } catch {}

      // Poll simples por 10s (array)
      const start = Date.now();
      let aiText: string | null = null;
      let aiStructured: any | null = null;
      let aiReferences: any[] | undefined;
      while (Date.now() - start < 10000 && !aiText) {
        const list = await issueHelperService.listMyMessages({ limit: 20 });
        const match = list.find((m: any) => (m as any)._id === ((created as any)._id) || (m as any).id === (created as any).id);
        const resp = (match as any)?.aiResponse;
        if (resp) {
          const norm = normalizeAiResponsePayload(resp);
          aiText = norm.text || null;
          aiStructured = norm.structured || null;
          aiReferences = norm.references;
          if (aiText || aiStructured) break;
        }
        await new Promise(res => setTimeout(res, 800));
      }

      const envelope = parseAiEnvelope(aiText || undefined);
      const onlySummary = (envelope?.structured && isStructuredFallbackResponse(envelope.structured))
        || (aiStructured && isStructuredFallbackResponse(aiStructured));
      const rawText = onlySummary
        ? (envelope?.structured?.summary || aiStructured?.summary || aiText || '')
        : (envelope?.text || aiText || 'A processar no backend. Volte a verificar em instantes.');
      const text = ((envelope?.structured || aiStructured) && isLikelyJsonString(rawText))
        ? ''
        : rawText;
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString(),
        ai: (!onlySummary && (envelope?.structured || aiStructured || aiReferences || envelope?.references))
          ? { text: envelope?.text || aiText || undefined, structured: envelope?.structured || aiStructured || undefined, references: envelope?.references || aiReferences }
          : undefined
      };
      setIssueSolverMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Error sending message';
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `Erro: ${errorMessage}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      };
      setIssueSolverMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsIssueSolverThinking(false);
    }
  };

  const renderKnowledgeTab = () => {
    return (
      <div className="space-y-6">
        {/* Header with Add Document Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <Book size={20} className="text-purple-400" />
            <span>Knowledge Base</span>
          </h2>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-400 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            <Upload size={16} />
            <span>Add Document</span>
          </button>
        </div>

        {/* Knowledge Base Tabs */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setKnowledgeBaseTab('documents')}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                knowledgeBaseTab === 'documents'
                  ? 'bg-purple-400/10 text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FileText size={16} />
              <span>Documents</span>
            </button>
            <button
              onClick={() => setKnowledgeBaseTab('summary')}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                knowledgeBaseTab === 'summary'
                  ? 'bg-purple-400/10 text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Activity size={16} />
              <span>System Summary</span>
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Refresh System Summary - usa dados do onboarding */}
            {knowledgeBaseTab === 'summary' && (
              <button
                onClick={() => {
                  loadKbSystemInfo();
                  showToast?.('Loading system data...', 'info');
                }}
                disabled={kbInfoLoading}
                className="mr-4 inline-flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 rounded-lg text-sm disabled:opacity-50"
                title="Refresh System Info"
              >
                <Activity size={14} className={kbInfoLoading ? 'animate-spin' : ''} />
                <span>{kbInfoLoading ? 'Loading...' : 'Refresh'}</span>
              </button>
            )}
          </div>

          <div className="p-6">
            {knowledgeBaseTab === 'documents' ? (
              <div className="space-y-4">
                {/* Documents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className={`p-4 rounded-lg border ${getDocumentTypeColor(doc.type)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getDocumentTypeIcon(doc.type)}
                          <div>
                            <h4 className="text-white font-medium text-sm">{doc.name}</h4>
                            <p className="text-gray-400 text-xs">{doc.type.toUpperCase()}</p>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button className="p-1 text-gray-400 hover:text-blue-400 transition-colors">
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={() => handleDownloadDocument(doc.id)}
                            className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                          >
                            <Download size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-2">{doc.description}</p>
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{doc.size}</span>
                        <span>Modified: {doc.lastModified}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {documents.length === 0 && (
                  <div className="text-center py-8">
                    <FileText size={48} className="mx-auto text-gray-600 mb-2" />
                    <h3 className="text-gray-400 font-medium mb-1">No Documents</h3>
                    <p className="text-gray-500 text-sm">Upload your first document to get started</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Verificar se tem dados de onboarding */}
                {!kbInfoLoading && !kbSystemData?.aiAnalyzedProfile?.lastAnalyzedAt && (
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/30 rounded-xl p-6 text-center">
                    <AlertTriangle size={48} className="mx-auto text-yellow-400 mb-4" />
                    
                    {/* Verificar se onboarding foi feito mas dados não foram parseados */}
                    {kbSystemData?.onboardingStatus === 'completed' ? (
                      <>
                        <h3 className="text-xl font-semibold text-white mb-2">Dados Disponíveis</h3>
                        <p className="text-gray-300 mb-4">
                          O onboarding foi completado. Clique para extrair os dados do sistema.
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              showToast?.('A processar dados do onboarding...', 'info');
                              await systemsService.reparseSystemProfile(system.id);
                              await loadKbSystemInfo();
                              showToast?.('Dados do sistema carregados com sucesso!', 'success');
                            } catch (error: any) {
                              console.error('Erro ao re-parsear:', error);
                              showToast?.('Erro ao processar dados: ' + error.message, 'error');
                            }
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105"
                        >
                          <Activity size={18} />
                          <span>Load Onboarding Data</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold text-white mb-2">Onboarding Necessário</h3>
                        <p className="text-gray-300 mb-4">
                          Para ver o System Summary, é necessário executar primeiro o onboarding do sistema.
                          O onboarding recolhe automaticamente informações sobre processos, serviços e portas.
                        </p>
                        <button
                          onClick={() => setActiveTab('onboarding')}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105"
                        >
                          <Play size={18} />
                          <span>Ir para Onboarding</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* System Summary - mostrar quando tem dados */}
                {(kbInfoLoading || kbSystemData?.aiAnalyzedProfile?.lastAnalyzedAt) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Last Updated Info */}
                  {kbSystemData?.aiAnalyzedProfile?.lastAnalyzedAt && (
                    <div className="col-span-full bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock size={14} />
                        <span>Last update: {new Date(kbSystemData.aiAnalyzedProfile.lastAnalyzedAt).toLocaleString('en-US')}</span>
                        {kbSystemData.aiAnalyzedProfile.aiMetadata?.model && (
                          <span className="ml-2 px-2 py-0.5 bg-gray-600 rounded text-xs">
                            via {kbSystemData.aiAnalyzedProfile.aiMetadata.model}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setActiveTab('onboarding')}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <Play size={12} />
                        <span>Atualizar via Onboarding</span>
                      </button>
                    </div>
                  )}

                  {/* Top Processes */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                      <Activity size={16} className="text-green-400" />
                      <span>Top Processes</span>
                    </h4>
                    {kbInfoLoading ? (
                      <div className="text-gray-400 text-sm">Loading...</div>
                    ) : kbSystemData?.aiAnalyzedProfile?.topProcesses?.length ? (
                    <div className="space-y-2 text-sm">
                        {kbSystemData.aiAnalyzedProfile.topProcesses.map((p: any, i: number) => (
                          <div key={p.id || i} className="flex justify-between">
                            <span className="text-gray-300">{p.name}</span>
                            <span className="text-green-400">{p.cpuUsage || 'N/A'}</span>
                      </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">Sem dados</div>
                    )}
                  </div>

                  {/* Running Services */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                      <Server size={16} className="text-blue-400" />
                      <span>Active Services</span>
                    </h4>
                    {kbInfoLoading ? (
                      <div className="text-gray-400 text-sm">Loading...</div>
                    ) : kbSystemData?.aiAnalyzedProfile?.activeServices?.length ? (
                    <div className="space-y-2 text-sm">
                        {kbSystemData.aiAnalyzedProfile.activeServices.map((s: any, i: number) => (
                          <div key={s.id || i} className="flex justify-between">
                            <span className="text-gray-300">{s.name}</span>
                            <span className="text-green-400">{s.status}</span>
                      </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">Sem dados</div>
                    )}
                  </div>

                  {/* Open Ports */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                      <Network size={16} className="text-purple-400" />
                      <span>Open Ports</span>
                    </h4>
                    {kbInfoLoading ? (
                      <div className="text-gray-400 text-sm">Loading...</div>
                    ) : kbSystemData?.aiAnalyzedProfile?.openPorts?.length ? (
                    <div className="space-y-2 text-sm">
                        {kbSystemData.aiAnalyzedProfile.openPorts.map((o: any, i: number) => (
                          <div key={o.id || i} className="flex justify-between">
                            <span className="text-gray-300">{o.port}</span>
                            <span className="text-blue-400">{o.protocol}</span>
                      </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">Sem dados</div>
                    )}
                  </div>

                  {/* System Information */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                      <Monitor size={16} className="text-orange-400" />
                      <span>System Info</span>
                    </h4>
                    {kbInfoLoading ? (
                      <div className="text-gray-400 text-sm">Loading...</div>
                    ) : kbSystemData?.aiAnalyzedProfile?.systemInfo ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Kernel</span>
                          <span className="text-white">{kbSystemData.aiAnalyzedProfile.systemInfo.kernel || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Arch</span>
                          <span className="text-white">{kbSystemData.aiAnalyzedProfile.systemInfo.architecture || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Load Avg</span>
                          <span className="text-white">{kbSystemData.aiAnalyzedProfile.systemInfo.loadAverage || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Users</span>
                          <span className="text-white">{kbSystemData.aiAnalyzedProfile.systemInfo.loggedUsers || 'N/A'}</span>
                      </div>
                    </div>
                    ) : (
                      <div className="text-gray-500 text-sm">Sem dados</div>
                    )}
                  </div>
                </div>
                )}

                {/* Recent Diagnostics (optional when backend provides) */}
                {kbSystemData?.lastDiagnostics?.executedAt && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                    <FileText size={16} className="text-yellow-400" />
                      <span>Last Diagnostics</span>
                      <span className="text-xs text-gray-400">{formatDateTime(kbSystemData.lastDiagnostics.executedAt)}</span>
                  </h4>
                    <div className="bg-gray-900 rounded p-3 text-xs font-mono space-y-2 max-h-48 overflow-y-auto">
                      {(kbSystemData.lastDiagnostics.results || []).slice(0, 20).map((r: any, i: number) => (
                        <div key={r.id || i} className="text-gray-300">
                          <span className="text-gray-400">$ </span>
                          <span className="text-blue-300">{r.command}</span>
                          {r.exitCode !== undefined && (
                            <span className="ml-2 text-gray-500">(exit {r.exitCode}, {r.durationMs} ms)</span>
                          )}
                          {r.stdout && (
                            <pre className="mt-1 whitespace-pre-wrap text-gray-400">{String(r.stdout).slice(0, 800)}</pre>
                          )}
                  </div>
                      ))}
                </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderIssueSolverTab = () => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <Bot size={20} className="text-orange-400" />
            <span>System Troubleshoot Assistant</span>
          </h2>
          <div className="text-sm text-gray-400">
            AI-powered help for {system.name}
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {/* Chat Messages */}
          <div className="p-6 h-96 overflow-y-auto bg-gray-900">
            <div className="space-y-4">
              {issueSolverMessages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-lg ${
                    message.sender === 'user' 
                      ? 'bg-orange-400 text-white' 
                      : 'bg-gray-700 text-gray-100'
                  }`}>
                    <div className="flex items-start space-x-2 mb-2">
                      {message.sender === 'ai' && <Bot size={16} className="text-orange-400 mt-1 flex-shrink-0" />}
                      {message.sender === 'user' && <User size={16} className="text-white mt-1 flex-shrink-0" />}
                      <div className="flex-1">
                        <div className="text-xs opacity-70 mb-1">
                          {message.sender === 'ai' ? 'Troubleshoot Assistant' : 'You'} • {message.timestamp}
                        </div>
                        {/* Texto simples */}
                        {message.text && (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.text}
                        </div>
                        )}

                        {/* Structured rendering se existir */}
                        {message.sender === 'ai' && message.ai?.structured && (
                          <div className="mt-2 space-y-3">
                            {message.ai.structured.summary && (
                              <div>
                                <div className="text-xs uppercase tracking-wide text-gray-300">Resumo</div>
                                <div className="text-sm text-gray-100">{message.ai.structured.summary}</div>
                      </div>
                            )}

                            {Array.isArray(message.ai.structured.likelyCauses) && message.ai.structured.likelyCauses.length > 0 && (
                              <div>
                                <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Causas prováveis</div>
                                <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                                  {message.ai.structured.likelyCauses.map((c: string, i: number) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                    </div>
                            )}

                            {Array.isArray(message.ai.structured.investigate) && message.ai.structured.investigate.length > 0 && (
                              <div>
                                <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Investigar</div>
                                <div className="space-y-1">
                                  {message.ai.structured.investigate.map((cmd: string, i: number) => (
                                    <pre key={i} className="bg-black/40 text-gray-100 text-xs p-2 rounded border border-gray-600 overflow-x-auto">{cmd}</pre>
                                  ))}
                  </div>
                              </div>
                            )}

                            {Array.isArray(message.ai.structured.fixes) && message.ai.structured.fixes.length > 0 && (
                              <div>
                                <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Correções sugeridas</div>
                                <div className="space-y-2">
                                  {message.ai.structured.fixes.map((f: any, i: number) => (
                                    <div key={i} className="bg-gray-800/60 rounded p-2 border border-gray-600">
                                      {f.cause && <div className="text-xs text-gray-300 mb-1">Causa: <span className="text-gray-100">{f.cause}</span></div>}
                                      {Array.isArray(f.steps) && (
                                        <ul className="list-decimal list-inside text-sm text-gray-200 space-y-1">
                                          {f.steps.map((s: string, j: number) => <li key={j}>{s}</li>)}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {Array.isArray(message.ai.structured.validation) && message.ai.structured.validation.length > 0 && (
                              <div>
                                <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Validação</div>
                                <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                                  {message.ai.structured.validation.map((v: string, i: number) => (
                                    <li key={i}>{v}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {Array.isArray(message.ai.structured.prevention) && message.ai.structured.prevention.length > 0 && (
                              <div>
                                <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Prevenção</div>
                                <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                                  {message.ai.structured.prevention.map((p: string, i: number) => (
                                    <li key={i}>{p}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {Array.isArray(message.ai.references) && message.ai.references.length > 0 && (
                              <div>
                                <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Referências</div>
                                {renderReferencesList(message.ai.references as any[])}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* AI Thinking Indicator */}
              {isIssueSolverThinking && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-4 rounded-lg bg-gray-700 text-gray-100">
                    <div className="flex items-center space-x-2">
                      <Bot size={16} className="text-orange-400" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-400">Analyzing issue...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="flex space-x-3">
              <input
                type="text"
                value={issueSolverCurrentMessage}
                onChange={(e) => setIssueSolverCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isIssueSolverThinking && handleIssueSolverMessage()}
                placeholder="Describe the issue you're experiencing..."
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                disabled={isIssueSolverThinking}
              />
              <button
                onClick={handleIssueSolverMessage}
                disabled={!issueSolverCurrentMessage.trim() || isIssueSolverThinking}
                className="px-4 py-2 bg-orange-400 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            
            {/* Quick Suggestions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "System is running slow",
                "Network connectivity issues",
                "Service failed to start", 
                "High CPU usage",
                "Disk space problems"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIssueSolverCurrentMessage(suggestion);
                    setTimeout(() => handleIssueSolverMessage(), 100);
                  }}
                  disabled={isIssueSolverThinking}
                  className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-300 rounded transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* System Context Info */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
            <Settings size={16} className="text-gray-400" />
            <span>System Context</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">System:</span>
              <p className="text-white">{system.name}</p>
            </div>
            <div>
              <span className="text-gray-400">Type:</span>
              <p className="text-white capitalize">{system.type}</p>
            </div>
            <div>
              <span className="text-gray-400">OS:</span>
              <p className="text-white">{system.os}</p>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <p className={`font-medium ${getStatusColor(system.status)}`}>
                {system.status.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getOnboardingStepLabel = (key: string) => {
    const labels: Record<string, string> = {
      connectivityTest: 'Test Connectivity',
      privilegesTest: 'Test Privileges',
      processAnalysis: 'Analyze Running Processes',
      serviceAnalysis: 'Analyze Running Services',
      openPortsAnalysis: 'Analyze Open Ports',
      snmpv3UserSetup: 'Prepare SNMPv3 User',
      statusScript: 'Status Script',
      configFileCopy: 'Copy Configuration Files',
      configFileEdit: 'Edit Configuration File',
      aliasSetup: 'Add Aliases for All'
    };
    return labels[key] || key;
  };

  const renderTestsTab = () => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <Terminal size={20} className="text-emerald-400" />
            <span>System Test Templates</span>
          </h2>
          <button
            onClick={() => setShowCreateTestModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>Create Test</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoadingTests && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingTests && systemTests.length === 0 && (
          <div className="text-center py-16 bg-gray-800/50 border border-gray-700 rounded-xl">
            <Globe size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Test Templates</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Create reusable UI test templates for this system. Define steps once, run them anytime.
            </p>
            <button
              onClick={() => setShowCreateTestModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span>Create Your First Test</span>
            </button>
          </div>
        )}

        {/* Tests Grid */}
        {!isLoadingTests && systemTests.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {systemTests.map((test) => {
              const typeInfo = getTestTypeInfo(test.testType);
              const isOS = ['os', 'performance', 'network', 'database'].includes(test.testType);
              
              return (
                <div
                  key={test._id}
                  className="group relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-gray-700/50 rounded-2xl overflow-hidden hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                >
                  {/* Gradient accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    test.testType === 'os' ? 'from-blue-500 to-cyan-500' :
                    test.testType === 'performance' ? 'from-orange-500 to-yellow-500' :
                    test.testType === 'network' ? 'from-purple-500 to-pink-500' :
                    test.testType === 'database' ? 'from-amber-500 to-red-500' :
                    'from-emerald-500 to-teal-500'
                  }`} />

                  <div className="p-5">
                    {/* Header with title and type badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-base truncate mb-2 group-hover:text-emerald-400 transition-colors">
                          {test.title || test.description || 'Untitled Test'}
                        </h3>
                        <div className="flex items-center flex-wrap gap-2">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${typeInfo.bg} ${typeInfo.color} border border-current/20`}>
                            {typeInfo.label}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getUiTestStatusColor(test.status)}`}>
                            {test.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(test.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    {/* Objective/Description - smaller text */}
                    {test.objective && (
                      <p className="text-gray-400 text-xs mb-4 line-clamp-2 leading-relaxed">
                        {test.objective}
                      </p>
                    )}

                    {/* Steps Preview - redesigned */}
                    {test.steps && test.steps.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            {isOS ? 'Commands' : 'Steps'}
                          </span>
                          <span className="text-xs text-emerald-400 font-mono bg-emerald-400/10 px-2 py-0.5 rounded">
                            {test.steps.length}
                          </span>
                        </div>
                        <div className={`rounded-xl p-3 space-y-1.5 max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent ${
                          isOS ? 'bg-gray-950/80 font-mono' : 'bg-gray-800/50'
                        }`}>
                          {test.steps.slice(0, 4).map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded ${
                                isOS ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
                              } font-semibold`}>
                                {idx + 1}
                              </span>
                              <code className={`text-gray-300 truncate flex-1 ${isOS ? 'text-cyan-100' : ''}`}>
                                {step}
                              </code>
                            </div>
                          ))}
                          {test.steps.length > 4 && (
                            <div className="text-xs text-gray-500 pl-7 pt-1">
                              +{test.steps.length - 4} more...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* URL for UI tests */}
                    {test.url && test.testType === 'ui' && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 bg-gray-800/30 rounded-lg px-3 py-2">
                        <ExternalLink size={12} className="flex-shrink-0" />
                        <a
                          href={test.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate hover:text-emerald-400 transition-colors"
                        >
                          {test.url}
                        </a>
                      </div>
                    )}

                    {/* Actions - redesigned */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-700/30">
                      <button
                        onClick={() => {
                          setSelectedUiTest(test);
                          setShowUiTestDetails(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all text-sm font-medium"
                      >
                        <Eye size={15} />
                        <span>Details</span>
                      </button>
                      {test.status === 'processing' ? (
                        <button
                          onClick={() => handleStopTest(test)}
                          disabled={stoppingTest === test._id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:opacity-50"
                        >
                          {stoppingTest === test._id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                              <span>Stopping...</span>
                            </>
                          ) : (
                            <>
                              <X size={15} />
                              <span>Stop</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRunUiTest(test)}
                          disabled={isRunningTest === test._id}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                            isOS 
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
                          }`}
                        >
                          {isRunningTest === test._id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                              <span>Running...</span>
                            </>
                          ) : (
                            <>
                              <Play size={15} />
                              <span>Run</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUiTest(test)}
                        className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Delete test"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Test Details Modal */}
        {showUiTestDetails && selectedUiTest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-700">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedUiTest.title || 'Test Details'}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${getUiTestStatusColor(selectedUiTest.status)}`}>
                      {selectedUiTest.status}
                    </span>
                    <span className="text-gray-500 text-xs">
                      Created: {new Date(selectedUiTest.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUiTestDetails(false);
                    setSelectedUiTest(null);
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* URL */}
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Target URL</label>
                  <a
                    href={selectedUiTest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center space-x-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span>{selectedUiTest.url}</span>
                  </a>
                </div>

                {/* Objective */}
                {selectedUiTest.objective && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Objective</label>
                    <p className="mt-1 text-gray-300">{selectedUiTest.objective}</p>
                  </div>
                )}

                {/* Steps */}
                {selectedUiTest.steps && selectedUiTest.steps.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                      Test Steps ({selectedUiTest.steps.length})
                    </label>
                    <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                      {selectedUiTest.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-medium">
                            {idx + 1}
                          </span>
                          <span className="text-gray-300 text-sm pt-0.5">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acceptance Criteria */}
                {selectedUiTest.acceptanceCriteria && selectedUiTest.acceptanceCriteria.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                      Acceptance Criteria
                    </label>
                    <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                      {selectedUiTest.acceptanceCriteria.map((criteria, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">{criteria}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-5 border-t border-gray-700 bg-gray-800/80">
                <button
                  onClick={() => handleDeleteUiTest(selectedUiTest)}
                  className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowUiTestDetails(false);
                      setSelectedUiTest(null);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleRunUiTest(selectedUiTest);
                      setShowUiTestDetails(false);
                      setSelectedUiTest(null);
                    }}
                    disabled={isRunningTest === selectedUiTest._id || selectedUiTest.status === 'processing'}
                    className="flex items-center space-x-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors"
                  >
                    <Play size={16} />
                    <span>Run Test</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Test Modal */}
        <AddTestModal
          isOpen={showCreateTestModal}
          onClose={() => setShowCreateTestModal(false)}
          onAddTest={(test: NewTest) => {
            console.log('Test added:', test);
          }}
          preSelectedSystem={system.slug ? { name: system.name, slug: system.slug } : undefined}
          onTestCreated={loadSystemTests}
        />

        {/* SSH Test Runner Modal */}
        {sshTestToRun && (
          <SshTestRunner
            isOpen={!!sshTestToRun}
            onClose={handleSshTestClose}
            testId={sshTestToRun._id}
            testTitle={sshTestToRun.title || 'System Test'}
            testType={sshTestToRun.testType}
            steps={sshTestToRun.steps || []}
            systemName={system.name}
          />
        )}
      </div>
    );
  };

  const renderTestHistoryTab = () => {
    const getRunStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'bg-green-500/20 text-green-400';
        case 'failed': return 'bg-red-500/20 text-red-400';
        case 'running': return 'bg-blue-500/20 text-blue-400';
        default: return 'bg-gray-500/20 text-gray-400';
      }
    };

    const formatDuration = (start: string, end?: string) => {
      if (!end) return 'In Progress...';
      const ms = new Date(end).getTime() - new Date(start).getTime();
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <History size={20} className="text-blue-400" />
            <span>Test Execution History</span>
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={loadTestRuns}
              disabled={isLoadingRuns}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isLoadingRuns ? 'Loading...' : '↻ Update'}
            </button>
            <div className="text-sm text-gray-400">
              {testRuns.length} execuções
            </div>
          </div>
        </div>

        {isLoadingRuns ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-400">Loading history...</p>
          </div>
        ) : testRuns.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            <History size={48} className="text-gray-500 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">Sem Histórico de Testes</h3>
            <p className="text-gray-400 text-sm">
              Execute alguns testes para ver o histórico aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {testRuns.map((run: any) => {
              const successCount = run.stepResults?.filter((s: any) => s.status === 'success').length || 0;
              const failedCount = run.stepResults?.filter((s: any) => s.status === 'failed').length || 0;
              const skippedCount = run.stepResults?.filter((s: any) => s.status === 'skipped').length || 0;
              const totalSteps = run.steps?.length || 0;

              return (
                <div key={run._id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">
                            {run.relatedUiTestId?.title || run.testId}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 uppercase">
                            {run.testType || 'test'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                          {new Date(run.createdAt).toLocaleString('en-US')}
                          {run.completedAt && ` • ${formatDuration(run.createdAt, run.completedAt)}`}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRunStatusColor(run.status)}`}>
                        {run.status === 'completed' ? 'SUCCESS' : 
                         run.status === 'failed' ? (run.error?.includes('cancelad') ? 'CANCELLED' : 'FAILED') : 
                         run.status === 'running' ? 'RUNNING' : run.status.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-px bg-gray-700">
                    <div className="bg-gray-800 p-3 text-center">
                      <div className="text-2xl font-bold text-white">{totalSteps}</div>
                      <div className="text-xs text-gray-400">Total</div>
                    </div>
                    <div className="bg-gray-800 p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">{successCount}</div>
                      <div className="text-xs text-gray-400">Success</div>
                    </div>
                    <div className="bg-gray-800 p-3 text-center">
                      <div className="text-2xl font-bold text-red-400">{failedCount}</div>
                      <div className="text-xs text-gray-400">Failed</div>
                    </div>
                    <div className="bg-gray-800 p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-400">{skippedCount}</div>
                      <div className="text-xs text-gray-400">Ignorado</div>
                    </div>
                  </div>

                  {/* Step Results */}
                  {run.stepResults && run.stepResults.length > 0 && (
                    <div className="p-4">
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Terminal size={16} />
                        Comandos Executados
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {run.stepResults.map((step: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${
                              step.status === 'success' ? 'border-green-500/30 bg-green-500/5' :
                              step.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                              step.status === 'skipped' ? 'border-yellow-500/30 bg-yellow-500/5' :
                              'border-gray-700 bg-gray-900'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {step.status === 'success' ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : step.status === 'failed' ? (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                ) : step.status === 'skipped' ? (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
                                )}
                                <code className="text-sm text-gray-300 font-mono">
                                  {step.command}
                                </code>
                              </div>
                              {step.durationMs && (
                                <span className="text-xs text-gray-500">
                                  {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
                                </span>
                              )}
                            </div>
                            {step.stdout && (
                              <pre className="text-xs text-green-300 font-mono bg-black/30 p-2 rounded mt-2 overflow-x-auto whitespace-pre-wrap max-h-24">
                                {step.stdout}
                              </pre>
                            )}
                            {step.stderr && (
                              <pre className="text-xs text-red-300 font-mono bg-black/30 p-2 rounded mt-2 overflow-x-auto whitespace-pre-wrap max-h-24">
                                {step.stderr}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {run.error && (
                    <div className="px-4 pb-4">
                      <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {run.error}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'onboarding':
        return renderOnboardingTab();
      case 'monitoring':
        return <MonitoringAlertsTab system={system} showToast={showToast} />;
      case 'knowledge':
        return renderKnowledgeTab();
      case 'tests':
        return renderTestsTab();
      case 'testHistory':
        return renderTestHistoryTab();
      case 'issuesolver':
        return renderIssueSolverTab();
      default:
        return renderOnboardingTab();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* System Info Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {getTypeIcon(system.type)}
            <div>
              <h1 className="text-2xl font-bold text-white">{system.name}</h1>
              <p className="text-gray-400">{system.ip}</p>
              {system.description && (
                <p className="text-gray-500 text-sm mt-1">{system.description}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm border ${
              system.status === 'online' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
              system.status === 'offline' ? 'bg-red-400/10 text-red-400 border-red-400/20' :
              'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
            }`}>
              {system.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Owner */}
          <div className="p-4 bg-gray-800/60 border border-gray-700/60 rounded-xl shadow-sm hover:border-gray-600/80 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-400/20 flex items-center justify-center">
                <User size={16} className="text-blue-400" />
          </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-400">Owner</p>
                <p className="text-sm text-white truncate" title={system.owner}>{system.owner}</p>
          </div>
          </div>
          </div>

          {/* OS */}
          <div className="p-4 bg-gray-800/60 border border-gray-700/60 rounded-xl shadow-sm hover:border-gray-600/80 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-400/20 flex items-center justify-center">
                <Server size={16} className="text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-400">OS</p>
                <p className="text-sm text-white truncate" title={system.os}>{system.os}</p>
              </div>
            </div>
          </div>

          {/* Last Test */}
          <div className="p-4 bg-gray-800/60 border border-gray-700/60 rounded-xl shadow-sm hover:border-gray-600/80 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/20 flex items-center justify-center">
                <Activity size={16} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-400">Last Test</p>
                <p className="text-sm text-white truncate" title={system.lastTest}>{formatDateTime(system.lastTest)}</p>
              </div>
            </div>
          </div>

          {/* Onboarding */}
          <div className="p-4 bg-gray-800/60 border border-gray-700/60 rounded-xl shadow-sm hover:border-gray-600/80 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-400/20 flex items-center justify-center">
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-400">Onboarding</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${getOnboardingStatusInfo().color.replace('text-','bg-')}`}></span>
                  <span className={`text-sm font-medium ${getOnboardingStatusInfo().color}`}>
              {getOnboardingStatusInfo().text}
                  </span>
          </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-green-400/10 text-green-400 border-b-2 border-green-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* AI Alarm Creation Modal - Moved to component root */}
      {showAIAlarmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ zIndex: 9999 }}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                <Bot size={20} className="text-purple-400" />
                <span>Create Alarm with AI</span>
              </h3>
              <button
                onClick={() => {
                  setShowAIAlarmModal(false);
                  setChatMessages([]);
                  setProposedAlarm(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 bg-gray-900 rounded-lg p-4 mb-4 overflow-y-auto min-h-[300px] max-h-[400px]">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender === 'user' 
                        ? 'bg-green-400 text-black' 
                        : 'bg-gray-700 text-white'
                    }`}>
                      {/* Texto plano */}
                      {message.text && (
                      <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                      )}

                      {/* Rendering estruturado da IA */}
                      {message.sender === 'ai' && message.ai?.structured && (
                        <div className="mt-2 space-y-3">
                          {message.ai.structured.summary && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-300">Resumo</div>
                              <div className="text-sm text-gray-100">{message.ai.structured.summary}</div>
                            </div>
                          )}

                          {Array.isArray(message.ai.structured.likelyCauses) && message.ai.structured.likelyCauses.length > 0 && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Causas prováveis</div>
                              <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                                {message.ai.structured.likelyCauses.map((c: string, i: number) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {Array.isArray(message.ai.structured.investigate) && message.ai.structured.investigate.length > 0 && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Investigar</div>
                              <div className="space-y-1">
                                {message.ai.structured.investigate.map((cmd: string, i: number) => (
                                  <CommandLine key={i} cmd={cmd} />
                                ))}
                              </div>
                            </div>
                          )}

                          {Array.isArray(message.ai.structured.fixes) && message.ai.structured.fixes.length > 0 && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Correções sugeridas</div>
                              <div className="space-y-2">
                                {message.ai.structured.fixes.map((f: any, i: number) => (
                                  <div key={i} className="bg-gray-800/60 rounded p-2 border border-gray-600">
                                    {f.cause && <div className="text-xs text-gray-300 mb-1">Causa: <span className="text-gray-100">{f.cause}</span></div>}
                                    {Array.isArray(f.steps) && (
                                      <ul className="list-decimal list-inside text-sm text-gray-200 space-y-1">
                                        {f.steps.map((s: string, j: number) => <li key={j}>{s}</li>)}
                                      </ul>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {Array.isArray(message.ai.structured.validation) && message.ai.structured.validation.length > 0 && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Validação</div>
                              <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                                {message.ai.structured.validation.map((v: string, i: number) => (
                                  <li key={i}>{v}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {Array.isArray(message.ai.structured.prevention) && message.ai.structured.prevention.length > 0 && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Prevenção</div>
                              <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                                {message.ai.structured.prevention.map((p: string, i: number) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {Array.isArray(message.ai.references) && message.ai.references.length > 0 && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Referências</div>
                              {renderReferencesList(message.ai.references)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-gray-800' : 'text-gray-400'
                      }`}>
                        {message.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isAIThinking && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-white rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Proposed Alarm Preview */}
            {proposedAlarm && (
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="text-white font-medium mb-2">Proposed Alarm Configuration:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-400">Name:</span> <span className="text-white">{proposedAlarm.name}</span></div>
                  <div><span className="text-gray-400">Metric:</span> <span className="text-white">{proposedAlarm.metric}</span></div>
                  <div><span className="text-gray-400">Threshold:</span> <span className="text-white">{proposedAlarm.comparison} {proposedAlarm.threshold}</span></div>
                  <div><span className="text-gray-400">Severity:</span> <span className="text-white">{proposedAlarm.severity}</span></div>
                </div>
              </div>
            )}

            {/* Chat Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Describe the alarm you want to create..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                disabled={isAIThinking}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isAIThinking}
                className="px-4 py-2 bg-purple-400 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
              {proposedAlarm && (
                <button
                  onClick={handleCreateAlarmFromAI}
                  className="px-4 py-2 bg-green-400 hover:bg-green-500 text-black rounded-lg transition-colors"
                >
                  Create Alarm
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SSH Credentials Modal */}
      {showOnboardingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-8 w-full max-w-lg shadow-2xl border border-gray-700/50 transform animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                  <Play size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">SSH Connection</h3>
                  <p className="text-gray-400 text-sm">Configure onboarding credentials</p>
                </div>
              </div>
              <button
                onClick={resetOnboardingModal}
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-lg transition-all duration-200"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* System Info Card */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-400/20 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Server size={16} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-blue-400 font-semibold">{system.name}</h4>
                    <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">{system.type.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1">
                      <Network size={12} className="text-gray-400" />
                      <span className="text-gray-300 text-sm">{system.ip}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Settings size={12} className="text-gray-400" />
                      <span className="text-gray-300 text-sm">{system.os}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mt-2">
                    SSH credentials will be used to connect and run the automated onboarding process
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                  <User size={14} />
                  <span>SSH Username</span>
                </label>
                <input
                  type="text"
                  value={onboardingCredentials.username}
                  onChange={(e) => {
                    setOnboardingCredentials(prev => ({
                      ...prev,
                      username: e.target.value
                    }));
                  }}
                  className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:bg-gray-700 transition-all duration-200"
                  placeholder="ubuntu, root, admin, ec2-user..."
                />
              </div>

              {/* Authentication Method Toggle */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">Authentication Method</label>
                <div className="flex items-center bg-gray-700/50 rounded-xl p-1">
                  <button
                    onClick={() => {
                      setOnboardingCredentials(prev => ({
                        ...prev,
                        usePrivateKey: false
                      }));
                    }}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      !onboardingCredentials.usePrivateKey
                        ? 'bg-gradient-to-r from-green-400 to-green-500 text-black shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                    }`}
                  >
                    <Settings size={14} />
                    <span>Password</span>
                  </button>
                  <button
                    onClick={() => {
                      setOnboardingCredentials(prev => ({
                        ...prev,
                        usePrivateKey: true
                      }));
                    }}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      onboardingCredentials.usePrivateKey
                        ? 'bg-gradient-to-r from-green-400 to-green-500 text-black shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                    }`}
                  >
                    <FileText size={14} />
                    <span>Private Key</span>
                  </button>
                </div>
              </div>

              {/* Password or Private Key Input */}
              <div className="space-y-2">
                {!onboardingCredentials.usePrivateKey ? (
                  <>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                      <Settings size={14} />
                      <span>SSH Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswordVisible ? "text" : "password"}
                        value={onboardingCredentials.password}
                        onChange={(e) => {
                          setOnboardingCredentials(prev => ({
                            ...prev,
                            password: e.target.value
                          }));
                        }}
                        className="w-full px-4 py-3 pr-12 bg-gray-700/70 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:bg-gray-700 transition-all duration-200"
                        placeholder="Enter SSH password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordVisible(!showPasswordVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                        title={showPasswordVisible ? "Esconder password" : "Mostrar password"}
                      >
                        {showPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                      <FileText size={14} />
                      <span>SSH Private Key</span>
                    </label>
                                          <textarea
                        value={onboardingCredentials.privateKey}
                        onChange={(e) => {
                          setOnboardingCredentials(prev => ({
                            ...prev,
                            privateKey: e.target.value
                          }));
                        }}
                        rows={5}
                        className="w-full px-4 py-3 bg-gray-700/70 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:bg-gray-700 transition-all duration-200 font-mono text-xs resize-none"
                        placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEpAIBAAKCAQEA...&#10;-----END RSA PRIVATE KEY-----"
                      />
                    <p className="text-xs text-gray-500 flex items-center space-x-1">
                      <AlertTriangle size={12} />
                      <span>Paste your complete private key content including headers</span>
                    </p>
                  </>
                )}
              </div>

              {/* Connection Test Result */}
              {showConnectionTestResult && connectionTestResult && (
                <div 
                  className={`p-4 rounded-xl border animate-fade-in relative ${
                  connectionTestResult.success 
                    ? 'bg-gradient-to-r from-green-500/10 to-green-400/10 border-green-400/30' 
                    : 'bg-gradient-to-r from-red-500/10 to-red-400/10 border-red-400/30'
                }`}>
                  {/* Close button */}
                  <button
                    onClick={clearConnectionTestResult}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-600/20"
                    title="Close notification"
                  >
                    <X size={14} />
                  </button>
                  
                  <div className="flex items-start space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      connectionTestResult.success ? 'bg-green-400/20' : 'bg-red-400/20'
                    }`}>
                      {connectionTestResult.success ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 pr-6">
                      <p className={`font-medium text-sm ${
                        connectionTestResult.success ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {connectionTestResult.message}
                      </p>
                      {connectionTestResult.responseTime && (
                        <p className="text-gray-400 text-xs mt-1 flex items-center space-x-1">
                          <Clock size={12} />
                          <span>Response time: {connectionTestResult.responseTime}ms</span>
                        </p>
                      )}
                      {connectionTestResult.success ? (
                        <p className="text-green-300 text-xs mt-2 flex items-center space-x-1">
                          <CheckCircle size={12} />
                          <span>Connection verified! You can now start the onboarding process.</span>
                        </p>
                      ) : (
                        <p className="text-red-300 text-xs mt-2 flex items-center space-x-1">
                          <XCircle size={12} />
                          <span>Connection failed. Please check your credentials and try again, or proceed anyway.</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700/50">
              <button
                onClick={handleTestConnection}
                disabled={!onboardingCredentials.username || 
                  (!onboardingCredentials.password && !onboardingCredentials.privateKey) ||
                  isTestingConnection}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:shadow-none"
              >
                {isTestingConnection ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span className="text-sm font-medium">Testing...</span>
                  </>
                ) : (
                  <>
                    <Network size={16} />
                    <span className="text-sm font-medium">Test Connection</span>
                  </>
                )}
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={resetOnboardingModal}
                  className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-200"
                >
                  <span className="text-sm font-medium">Cancel</span>
                </button>
                <button
                  onClick={handleRunOnboarding}
                  disabled={!onboardingCredentials.username || 
                    (!onboardingCredentials.password && !onboardingCredentials.privateKey)}
                  className={`flex items-center space-x-2 px-6 py-2.5 font-semibold rounded-xl transition-all duration-200 shadow-lg transform ${
                    connectionTestResult?.success
                      ? 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-black hover:shadow-xl hover:scale-105'
                      : connectionTestResult?.success === false
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-black hover:shadow-xl hover:scale-105'
                      : 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-black hover:shadow-xl hover:scale-105'
                  } ${
                    (!onboardingCredentials.username || 
                    (!onboardingCredentials.password && !onboardingCredentials.privateKey))
                      ? 'from-gray-600 to-gray-700 cursor-not-allowed transform-none shadow-none'
                      : ''
                  }`}
                >
                  <Play size={16} />
                  <span className="text-sm">
                    {connectionTestResult?.success 
                      ? 'Start Onboarding ✓' 
                      : 'Start Onboarding'
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                <Upload size={20} className="text-purple-400" />
                <span>Upload Document</span>
              </h3>
              <button
                onClick={resetUploadModal}
                className="text-gray-400 hover:text-white"
                disabled={isUploading}
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-purple-400 bg-purple-400/10'
                  : 'border-gray-600 hover:border-gray-500'
              } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    {getDocumentTypeIcon(getFileType(selectedFile.name))}
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-gray-400 text-sm">{formatFileSize(selectedFile.size)}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Type: {getFileType(selectedFile.name).toUpperCase()}
                    </p>
                  </div>
                  
                  {isUploading && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload size={48} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Drag and drop your file here</p>
                    <p className="text-gray-400 text-sm">or click to browse</p>
                  </div>
                  <input
                    type="file"
                    id="fileInput"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.md,.json,.xml,.conf,.cfg,.log"
                  />
                  <button
                    onClick={() => document.getElementById('fileInput')?.click()}
                    className="px-4 py-2 bg-purple-400 hover:bg-purple-500 text-white rounded-lg transition-colors"
                  >
                    Browse Files
                  </button>
                </div>
              )}
            </div>

            {/* Supported file types */}
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-300 text-sm font-medium mb-2">Supported file types:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>• PDF, DOC, DOCX (Manual)</div>
                <div>• TXT, MD (Procedure)</div>
                <div>• JSON, XML, CONF (Config)</div>
                <div>• LOG files (Log)</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={resetUploadModal}
                disabled={isUploading}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="px-4 py-2 bg-purple-400 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={showTemplateSelectionModal}
        onClose={() => setShowTemplateSelectionModal(false)}
        onSelectTemplate={handleTemplateSelected}
        onCreateTemplate={handleCreateTemplate}
        systemId={system.id}
      />

      {/* Create Template Modal */}
      <CreateTemplateModal
        isOpen={showCreateTemplateModal}
        onClose={handleCreateTemplateClose}
        onTemplateCreated={handleTemplateCreated}
        systemId={system.id}
      />
    </div>
  );
}; 