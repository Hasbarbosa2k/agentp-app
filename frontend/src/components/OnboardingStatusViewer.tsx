import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Monitor, 
  Wifi, 
  Terminal,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink
} from 'lucide-react';
import { 
  onboardingService, 
  type OnboardingStatusResponse,
  type OnboardingData,
  type OnboardingStatusStep 
} from '../services';

interface OnboardingStatusViewerProps {
  systemId: string;
}

const OnboardingStatusViewer: React.FC<OnboardingStatusViewerProps> = ({ systemId }) => {
  const [statusData, setStatusData] = useState<OnboardingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadOnboardingStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [OnboardingStatusViewer] Loading status for system:', systemId);
      const response = await onboardingService.getOnboardingStatus(systemId);
      setStatusData(response);
      console.log('✅ [OnboardingStatusViewer] Status loaded successfully');
    } catch (err: any) {
      setError(err.message || 'Error loading onboarding status');
      console.error('❌ [OnboardingStatusViewer] Failed to load onboarding status:', err);
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  useEffect(() => {
    if (systemId) {
      loadOnboardingStatus();
    }
  }, [systemId, loadOnboardingStatus]);

  // Debug effect to track expandedSteps changes
  useEffect(() => {
    console.log('🔍 [OnboardingStatusViewer] expandedSteps changed:', Array.from(expandedSteps));
  }, [expandedSteps]);

  // Memoized helper functions for better performance
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'in_progress': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-400" size={16} />;
      case 'in_progress': return <Clock className="text-blue-400 animate-pulse" size={16} />;
      case 'failed': return <XCircle className="text-red-400" size={16} />;
      case 'pending': return <Clock className="text-yellow-400" size={16} />;
      default: return <AlertCircle className="text-gray-400" size={16} />;
    }
  }, []);

  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  // Optimized toggle function for step expansion
  const toggleStepExpansion = useCallback((stepName: string) => {
    console.log('🔄 [OnboardingStatusViewer] Toggling step expansion for:', stepName);
    console.log('🔍 [OnboardingStatusViewer] Current expandedSteps before toggle:', Array.from(expandedSteps));
    
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      const isCurrentlyExpanded = newSet.has(stepName);
      
      if (isCurrentlyExpanded) {
        console.log('📦 [OnboardingStatusViewer] Collapsing step:', stepName);
        newSet.delete(stepName);
      } else {
        console.log('📂 [OnboardingStatusViewer] Expanding step:', stepName);
        newSet.add(stepName);
      }
      
      console.log('🔍 [OnboardingStatusViewer] New expanded steps:', Array.from(newSet));
      
      // Force re-render by returning new Set even if no changes
      return new Set(newSet);
    });
  }, [expandedSteps]);

  // Copy to clipboard functionality
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(`${type}_${Date.now()}`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }, []);

  // Memoized steps with sorting and filtering for better performance
  const sortedSteps = useMemo(() => {
    if (!statusData?.data.onboarding?.steps || !Array.isArray(statusData.data.onboarding.steps)) return [];
    
    let filteredSteps = [...statusData.data.onboarding.steps];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredSteps = filteredSteps.filter(step => step.status === statusFilter);
    }
    
    return filteredSteps.sort((a, b) => {
      // Sort by completion status first, then by start time
      const statusOrder = { 'completed': 0, 'in_progress': 1, 'failed': 2, 'pending': 3 };
      const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
      const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
    });
  }, [statusData?.data.onboarding?.steps, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-800 rounded-lg">
        <RefreshCw className="animate-spin text-blue-400 mr-2" size={20} />
        <span className="text-white">Loading onboarding status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-400/20 rounded-lg">
        <div className="flex items-center mb-3">
          <XCircle className="text-red-400 mr-2" size={20} />
          <h3 className="text-red-400 font-semibold">Error Loading Status</h3>
        </div>
        <p className="text-red-300 mb-4">{error}</p>
        <button
          onClick={loadOnboardingStatus}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 rounded-lg text-red-300 transition-all duration-200 hover:scale-105"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!statusData?.data.hasOnboarding) {
    return (
      <div className="p-6 bg-yellow-900/20 border border-yellow-400/20 rounded-lg">
        <div className="flex items-center mb-3">
          <AlertCircle className="text-yellow-400 mr-2" size={20} />
          <h3 className="text-yellow-400 font-semibold">Onboarding Não Iniciado</h3>
        </div>
        <p className="text-yellow-300">
          Este sistema ainda não possui processo de onboarding iniciado.
        </p>
        {statusData?.data.needsOnboarding && (
          <p className="text-yellow-300 mt-2">
            É necessário executar o onboarding para configurar o sistema.
          </p>
        )}
      </div>
    );
  }

  const { onboarding } = statusData.data;
  if (!onboarding) {
    console.log('❌ [OnboardingStatusViewer] No onboarding data found');
    return null;
  }

  console.log('✅ [OnboardingStatusViewer] Rendering with onboarding data:', onboarding);
  console.log('✅ [OnboardingStatusViewer] Onboarding keys:', Object.keys(onboarding));
  console.log('✅ [OnboardingStatusViewer] Onboarding status:', typeof onboarding.status, onboarding.status);
  console.log('✅ [OnboardingStatusViewer] Onboarding detailedStatus:', typeof onboarding.detailedStatus, onboarding.detailedStatus);

  return (
    <div className="space-y-6">
      {/* Status Geral */}
      <div className="p-6 bg-gray-700 rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(onboarding.status)}
            <div>
              <h2 className="text-xl font-semibold text-white">Status do Onboarding</h2>
              <p className={`text-sm ${getStatusColor(onboarding.status)}`}>
                {typeof onboarding.detailedStatus === 'string' 
                  ? onboarding.detailedStatus 
                  : JSON.stringify(onboarding.detailedStatus)
                }
              </p>
            </div>
          </div>
          <button
            onClick={loadOnboardingStatus}
            className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="text-gray-400" size={16} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Progresso</span>
            <span>{typeof onboarding.progress === 'number' ? onboarding.progress : 0}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                onboarding.status === 'completed' ? 'bg-green-400' :
                onboarding.status === 'failed' ? 'bg-red-400' : 'bg-blue-400'
              }`}
              style={{ width: `${typeof onboarding.progress === 'number' ? onboarding.progress : 0}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-gray-600 p-3 rounded-lg">
            <div className="text-lg font-semibold text-green-400">
              {typeof onboarding.completedSteps === 'number' ? onboarding.completedSteps : 0}
            </div>
            <div className="text-xs text-gray-400">Completados</div>
          </div>
          <div className="bg-gray-600 p-3 rounded-lg">
            <div className="text-lg font-semibold text-red-400">
              {typeof onboarding.failedSteps === 'number' ? onboarding.failedSteps : 0}
            </div>
            <div className="text-xs text-gray-400">Failed</div>
          </div>
          <div className="bg-gray-600 p-3 rounded-lg">
            <div className="text-lg font-semibold text-blue-400">{sortedSteps.filter(s => s.status === 'in_progress').length}</div>
            <div className="text-xs text-gray-400">In Progress</div>
          </div>
          <div className="bg-gray-600 p-3 rounded-lg">
            <div className="text-lg font-semibold text-white">
              {formatDuration(typeof onboarding.totalDuration === 'number' ? onboarding.totalDuration : 0)}
            </div>
            <div className="text-xs text-gray-400">Duração Total</div>
          </div>
        </div>
      </div>

      {/* System Info */}
      {(onboarding.osInfo || onboarding.networkInfo) && (
        <div className="p-6 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Monitor className="mr-2" size={18} />
            Informações do Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {onboarding.osInfo && (
              <div className="bg-gray-600 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Sistema Operativo</h4>
                <div className="space-y-1 text-sm text-white">
                  <div><strong>OS:</strong> {onboarding.osInfo.prettyName}</div>
                  <div><strong>Versão:</strong> {onboarding.osInfo.version}</div>
                  <div><strong>Kernel:</strong> {onboarding.osInfo.kernel}</div>
                  <div><strong>Arquitetura:</strong> {onboarding.osInfo.architecture}</div>
                </div>
              </div>
            )}
            {onboarding.networkInfo && (
              <div className="bg-gray-600 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Wifi className="mr-1" size={14} />
                  Conectividade
                </h4>
                <div className="space-y-1 text-sm text-white">
                  <div className="flex items-center">
                    <strong>Status:</strong>
                    <span className={`ml-2 ${onboarding.networkInfo.connectivity ? 'text-green-400' : 'text-red-400'}`}>
                      {onboarding.networkInfo.connectivity ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  <div><strong>Ping:</strong> {onboarding.networkInfo.responseTime}ms</div>
                  <div><strong>Último teste:</strong> {formatDateTime(onboarding.networkInfo.lastPingAt)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Info */}
      {onboarding.initiatedBy && (
        <div className="p-6 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <User className="mr-2" size={18} />
            Iniciado Por
          </h3>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {onboarding.initiatedBy.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-white font-medium">{onboarding.initiatedBy.displayName}</div>
              <div className="text-gray-400 text-sm">{onboarding.initiatedBy.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Timing */}
      <div className="p-6 bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Clock className="mr-2" size={18} />
          Cronologia
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Iniciado:</span>
            <span className="text-white">{formatDateTime(onboarding.startedAt)}</span>
          </div>
          {onboarding.completedAt && (
            <div className="flex justify-between">
              <span className="text-gray-400">Concluído:</span>
              <span className="text-white">{formatDateTime(onboarding.completedAt)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Duração Total:</span>
            <span className="text-white">{formatDuration(onboarding.totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Steps Detalhados */}
      <div className="p-6 bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Terminal className="mr-2" size={18} />
            Passos Executados ({Array.isArray(onboarding.steps) ? onboarding.steps.length : 0})
          </h3>
          <div className="flex items-center space-x-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-gray-600 border border-gray-500 rounded text-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
            >
              <option value="all">All ({Array.isArray(onboarding.steps) ? onboarding.steps.length : 0})</option>
              <option value="completed">Completed ({typeof onboarding.completedSteps === 'number' ? onboarding.completedSteps : 0})</option>
              <option value="failed">Failed ({typeof onboarding.failedSteps === 'number' ? onboarding.failedSteps : 0})</option>
              <option value="in_progress">In Progress ({Array.isArray(onboarding.steps) ? onboarding.steps.filter(s => s.status === 'in_progress').length : 0})</option>
              <option value="pending">Pending ({Array.isArray(onboarding.steps) ? onboarding.steps.filter(s => s.status === 'pending').length : 0})</option>
            </select>
            
            <button
              onClick={() => {
                console.log('🔄 [OnboardingStatusViewer] Expand/Collapse all clicked');
                console.log('📊 [OnboardingStatusViewer] Current sortedSteps:', sortedSteps.map(s => s.step));
                console.log('📊 [OnboardingStatusViewer] Current expandedSteps size:', expandedSteps.size);
                console.log('📊 [OnboardingStatusViewer] sortedSteps length:', sortedSteps.length);
                
                if (expandedSteps.size === sortedSteps.length) {
                  console.log('📦 [OnboardingStatusViewer] Collapsing all steps');
                  setExpandedSteps(new Set());
                } else {
                  console.log('📂 [OnboardingStatusViewer] Expanding all steps');
                  const allSteps = new Set(sortedSteps.map(step => step.step));
                  console.log('📂 [OnboardingStatusViewer] All steps to expand:', Array.from(allSteps));
                  setExpandedSteps(allSteps);
                }
              }}
              className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded-lg text-gray-300 hover:text-white transition-all duration-200 flex items-center"
              title={expandedSteps.size === sortedSteps.length ? "Recolher todos" : "Expandir todos"}
            >
              {expandedSteps.size === sortedSteps.length ? (
                <>
                  <ChevronUp className="mr-1" size={12} />
                  Recolher Todos
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1" size={12} />
                  Expandir Todos
                </>
              )}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {sortedSteps.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Terminal className="mx-auto mb-2" size={24} />
              <p>Nenhum step encontrado com o filtro "{statusFilter === 'all' ? 'todos' : statusFilter}"</p>
            </div>
          ) : (
            sortedSteps.map((step, index) => (
            <div key={index} className="bg-gray-600/80 rounded-lg border border-gray-500/50 transition-all duration-200 hover:border-gray-400/50 hover:shadow-lg">
              <div
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-500/20 transition-all duration-200 rounded-lg"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('👆 [OnboardingStatusViewer] Step clicked:', step.step, 'status:', step.status);
                  toggleStepExpansion(step.step);
                }}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getStatusIcon(step.status)}
                  </div>
                                     <div className="flex-1 min-w-0">
                     <div className="flex items-center space-x-2">
                       <div className="text-white font-medium truncate">{step.step}</div>
                       {expandedSteps.has(step.step) && (
                         <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs">
                           Expandido
                         </span>
                       )}
                       {step.duration > 30000 && (
                         <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs">
                           Lento
                         </span>
                       )}
                       {step.status === 'in_progress' && (
                         <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs animate-pulse">
                           Ativo
                         </span>
                       )}
                     </div>
                     <div className="text-gray-400 text-sm truncate">{step.description}</div>
                     {step.status === 'failed' && step.error && (
                       <div className="text-red-400 text-xs mt-1 truncate">
                         Erro: {step.error.split('\n')[0]}
                       </div>
                     )}
                   </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
                  <div className="text-right">
                    <div className="text-gray-400 text-sm">{formatDuration(step.duration)}</div>
                    {step.retryCount !== undefined && step.retryCount > 0 && (
                      <div className="text-yellow-400 text-xs">
                        {step.retryCount} tentativas
                      </div>
                    )}
                  </div>
                  <div className="transition-transform duration-200">
                    {expandedSteps.has(step.step) ? (
                      <ChevronUp className="text-gray-400 group-hover:text-white" size={16} />
                    ) : (
                      <ChevronDown className="text-gray-400 group-hover:text-white" size={16} />
                    )}
                  </div>
                </div>
              </div>
              
              {expandedSteps.has(step.step) && (
                <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-1 duration-200">
                  {/* Command Section */}
                  <div className="bg-gray-700/50 rounded-lg p-3 group/command">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-white flex items-center">
                        <Terminal className="mr-1" size={14} />
                        Command
                      </h5>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(step.command, `command_${index}`);
                        }}
                        className="text-gray-400 hover:text-white hover:bg-gray-600 transition-all p-1.5 rounded opacity-0 group-hover/command:opacity-100"
                        title="Copiar comando"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="bg-gray-800 p-3 rounded border border-gray-600 text-xs text-green-400 font-mono relative group/code">
                      <code className="whitespace-pre-wrap break-all">{step.command}</code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(step.command, `command_${index}`);
                        }}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-all p-1.5 rounded opacity-0 group-hover/code:opacity-100"
                        title="Copiar comando"
                      >
                        <Copy size={14} />
                      </button>
                      {copiedText === `command_${index}` && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-sans">
                          ✓ Copiado!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Output Section */}
                  <div className="bg-gray-700/50 rounded-lg p-3 group/output">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-white flex items-center">
                        <ExternalLink className="mr-1" size={14} />
                        Output
                        <span className="ml-2 text-xs text-gray-400">
                          ({step.output?.length || 0} caracteres)
                        </span>
                      </h5>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(step.output || '', `output_${index}`);
                        }}
                        className="text-gray-400 hover:text-white hover:bg-gray-600 transition-all p-1.5 rounded opacity-0 group-hover/output:opacity-100"
                        title="Copiar output"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="bg-gray-800 p-3 rounded border border-gray-600 text-xs text-gray-300 font-mono max-h-48 overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 group/outputcode">
                      <pre className="whitespace-pre-wrap break-words">{step.output}</pre>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(step.output || '', `output_${index}`);
                        }}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-all p-1.5 rounded opacity-0 group-hover/outputcode:opacity-100 sticky"
                        title="Copiar output"
                      >
                        <Copy size={14} />
                      </button>
                      {copiedText === `output_${index}` && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-sans">
                          ✓ Copiado!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error Section (if exists) */}
                  {step.error && (
                    <div className="bg-red-900/20 rounded-lg p-3 border border-red-400/30 group/error">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-red-400 flex items-center">
                          <AlertCircle className="mr-1" size={14} />
                          Erro
                        </h5>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(step.error!, `error_${index}`);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-all p-1.5 rounded opacity-0 group-hover/error:opacity-100"
                          title="Copiar erro"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      <div className="bg-red-950/50 p-3 rounded border border-red-600/20 text-xs text-red-300 font-mono max-h-32 overflow-y-auto relative group/errorcode">
                        <pre className="whitespace-pre-wrap break-words">{step.error}</pre>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(step.error!, `error_${index}`);
                          }}
                          className="absolute top-2 right-2 text-red-400 hover:text-red-300 hover:bg-red-900/50 transition-all p-1.5 rounded opacity-0 group-hover/errorcode:opacity-100"
                          title="Copiar erro"
                        >
                          <Copy size={14} />
                        </button>
                        {copiedText === `error_${index}` && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-sans">
                            ✓ Copiado!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata Section */}
                  <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-400 pt-3 border-t border-gray-600 space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Monitor className="mr-1" size={12} />
                        {step.category}
                      </span>
                      {step.retryCount !== undefined && step.retryCount > 0 && (
                        <span className="flex items-center text-yellow-400">
                          <RefreshCw className="mr-1" size={12} />
                          {step.retryCount} tentativas
                        </span>
                      )}
                      {step.required && (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs">
                          Obrigatório
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center">
                        <Clock className="mr-1" size={12} />
                        {formatDateTime(step.startedAt)}
                      </span>
                      {step.endedAt && (
                        <>
                          <span>→</span>
                          <span>{formatDateTime(step.endedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            ))
          )}
        </div>
      </div>

      {/* Logs (se existirem) */}
      {Array.isArray(onboarding.logs) && onboarding.logs.length > 0 && (
        <div className="p-6 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">
            Logs do Sistema ({onboarding.logs.length})
          </h3>
          <div className="bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="space-y-2 font-mono text-xs">
              {onboarding.logs.map((log, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-gray-500 shrink-0">
                    {formatDateTime(log.timestamp)}
                  </span>
                  <span className={`shrink-0 ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                  }`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingStatusViewer; 