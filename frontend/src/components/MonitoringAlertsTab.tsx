import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Bell, Bot, Send, Check, X,
  RefreshCw, Cpu, Trash2, Power,
  ChevronDown, ChevronUp, Code, Copy, Loader2, Play, Zap
} from 'lucide-react';
import { alertsService, Alert, GeneratedAlert } from '../services/alerts.service';

interface ExporterStatus {
  installed: boolean;
  port: number;
  version?: string;
  status: 'running' | 'stopped' | 'not_installed' | 'error' | 'unknown';
  monitoredProcesses?: string[];
}

interface System {
  id: string;
  _id?: string;
  name: string;
  ip: string;
  status: string;
  nodeExporter?: ExporterStatus;
  processExporter?: ExporterStatus;
}

interface MonitoringAlertsTabProps {
  system: System;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const MonitoringAlertsTab: React.FC<MonitoringAlertsTabProps> = ({ system, showToast }) => {
  // State para alertas
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // State para geração de alertas via AI
  const [prompt, setPrompt] = useState('');
  const [generatedAlert, setGeneratedAlert] = useState<{
    alert: GeneratedAlert;
    yamlPreview: string;
    confidence: number;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showYamlPreview, setShowYamlPreview] = useState(true);

  // State para UI
  const [alertsView, setAlertsView] = useState<'active' | 'all'>('all');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [copiedYaml, setCopiedYaml] = useState(false);

  // State para Prometheus
  const [prometheusStatus, setPrometheusStatus] = useState<{
    health: 'up' | 'down' | 'unknown';
    targetHealth: 'up' | 'down' | 'unknown';
    lastError: string;
    lastScrape: string;
  } | null>(null);
  const [connectivityStatus, setConnectivityStatus] = useState<{
    reachable: boolean;
    status: string;
    message: string;
  } | null>(null);
  const [checkingConnectivity, setCheckingConnectivity] = useState(false);

  // State para teste de alarme
  const [testingAlertId, setTestingAlertId] = useState<string | null>(null);
  const [alertTestResult, setAlertTestResult] = useState<{
    alertId: string;
    alertName: string;
    wouldFire: boolean;
    currentStatus: string;
    results: Array<{ instance: string; value: string; }>;
    message: string;
    testedAt: string;
  } | null>(null);

  // State para refresh de exporters
  const [refreshingExporters, setRefreshingExporters] = useState(false);
  const [exporterStatusData, setExporterStatusData] = useState<{
    nodeExporter?: { installed: boolean; status: string; port?: number; version?: string };
    processExporter?: { installed: boolean; status: string; port?: number; monitoredProcesses?: string[] };
  } | null>(null);

  // State para alertas firing
  const [firingAlerts, setFiringAlerts] = useState<Array<{
    alertName: string;
    severity: string;
    state: string;
    instance: string;
    summary: string;
    description?: string;
    activeAt: string;
  }>>([]);
  const [pendingAlerts, setPendingAlerts] = useState<Array<{
    alertName: string;
    severity: string;
    state: string;
    instance: string;
    summary: string;
    activeAt: string;
  }>>([]);
  const [firingLoading, setFiringLoading] = useState(false);

  const systemId = system.id || system._id || '';

  // Carregar alertas configurados
  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const response = await alertsService.getAlertsBySystem(systemId);
      if (response.success && response.data) {
        setAlerts(response.data.alerts);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  }, [systemId]);

  // Carregar alertas que estão a disparar (FIRING)
  const loadFiringAlerts = useCallback(async () => {
    setFiringLoading(true);
    try {
      const response = await alertsService.getFiringAlerts(systemId);
      if (response.success) {
        setFiringAlerts(response.firing || []);
        setPendingAlerts(response.pending || []);
      }
    } catch (error) {
      console.error('Error loading firing alerts:', error);
    } finally {
      setFiringLoading(false);
    }
  }, [systemId]);

  // Carregar estado do Prometheus
  const loadPrometheusStatus = useCallback(async () => {
    try {
      const response = await alertsService.getPrometheusTargets();
      if (response.success && response.targets) {
        // Encontrar o target deste sistema
        const systemTarget = response.targets.find(t => 
          t.instance.includes(system.ip)
        );
        
        setPrometheusStatus({
          health: response.prometheusHealth === 'up' ? 'up' : 'down',
          targetHealth: systemTarget?.health || 'unknown',
          lastError: systemTarget?.lastError || '',
          lastScrape: systemTarget?.lastScrape || ''
        });
      }
    } catch (error) {
      console.error('Error getting Prometheus status:', error);
    }
  }, [system.ip]);

  // Verificar conectividade com Node Exporter
  const checkConnectivity = useCallback(async () => {
    setCheckingConnectivity(true);
    try {
      const response = await alertsService.checkNodeExporterConnectivity(systemId);
      if (response.success && response.data) {
        setConnectivityStatus({
          reachable: response.data.reachable,
          status: response.data.status,
          message: response.data.message
        });
      }
    } catch (error) {
      console.error('Error checking connectivity:', error);
    } finally {
      setCheckingConnectivity(false);
    }
  }, [systemId]);

  // Verificar e actualizar estado dos exporters
  const refreshExporterStatus = useCallback(async () => {
    setRefreshingExporters(true);
    try {
      const response = await alertsService.refreshExporterStatus(systemId);
      if (response.success && response.data) {
        setExporterStatusData({
          nodeExporter: response.data.nodeExporter,
          processExporter: response.data.processExporter
        });
        showToast('Exporter status updated', 'success');
      } else {
        showToast(response.error || 'Error checking exporters', 'error');
      }
    } catch (error: any) {
      console.error('Error checking exporters:', error);
      showToast(error.message || 'Error checking exporters', 'error');
    } finally {
      setRefreshingExporters(false);
    }
  }, [systemId, showToast]);

  // Testar alarme
  const handleTestAlert = async (alertId: string) => {
    setTestingAlertId(alertId);
    setAlertTestResult(null);
    
    try {
      const response = await alertsService.testAlert(alertId);
      if (response.success && response.data) {
        setAlertTestResult({
          alertId,
          alertName: response.data.alertName,
          wouldFire: response.data.wouldFire,
          currentStatus: response.data.currentStatus,
          results: response.data.results,
          message: response.data.message,
          testedAt: response.data.testedAt
        });
      } else {
        showToast(response.error || 'Error testing alert', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Error testing alert', 'error');
    } finally {
      setTestingAlertId(null);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadAlerts();
    loadPrometheusStatus();
    loadFiringAlerts();
    // Verificar estado dos exporters automaticamente ao abrir
    refreshExporterStatus();
  }, [loadAlerts, loadPrometheusStatus, loadFiringAlerts, refreshExporterStatus]);

  // Generate alert via AI
  const handleGenerateAlert = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      showToast('Describe the alert with at least 10 characters', 'warning');
      return;
    }

    setGenerating(true);
    setGeneratedAlert(null);

    try {
      const response = await alertsService.generateAlertFromPrompt(systemId, prompt);
      if (response.success && response.data) {
        setGeneratedAlert({
          alert: response.data.alert,
          yamlPreview: response.data.yamlPreview,
          confidence: response.data.confidence
        });
        showToast('Alert generated! Review and approve to activate.', 'success');
      } else {
        showToast(response.error || 'Failed to generate alert', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Error generating alert', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Aprovar alerta gerado (criar e aprovar)
  const handleApproveGenerated = async () => {
    if (!generatedAlert) return;

    try {
      // Primeiro criar
      const createResponse = await alertsService.createAlert(systemId, {
        ...generatedAlert.alert,
        originalPrompt: prompt,
        yamlPreview: generatedAlert.yamlPreview
      });

      if (createResponse.success && createResponse.data?.alert) {
        // Depois aprovar
        const approveResponse = await alertsService.approveAlert(createResponse.data.alert._id);
        
        if (approveResponse.success) {
          showToast('Alert created and activated successfully!', 'success');
          setGeneratedAlert(null);
          setPrompt('');
          loadAlerts();
        } else {
          showToast(approveResponse.error || 'Alert created but failed to activate', 'warning');
          loadAlerts();
        }
      } else {
        showToast(createResponse.error || 'Failed to create alert', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Error approving alert', 'error');
    }
  };

  // Rejeitar/descartar alerta gerado
  const handleRejectGenerated = () => {
    setGeneratedAlert(null);
  };

  // Toggle alerta existente
  const handleToggleAlert = async (alert: Alert) => {
    try {
      const response = await alertsService.toggleAlert(alert._id, !alert.enabled);
      if (response.success) {
        showToast(`Alert ${alert.enabled ? 'deactivated' : 'activated'}`, 'success');
        loadAlerts();
      } else {
        showToast(response.error || 'Failed to change state', 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // Eliminar alerta
  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const response = await alertsService.deleteAlert(alertId);
      if (response.success) {
        showToast('Alert deleted', 'success');
        loadAlerts();
      } else {
        showToast(response.error || 'Failed to delete', 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // Copiar YAML
  const handleCopyYaml = () => {
    if (generatedAlert?.yamlPreview) {
      navigator.clipboard.writeText(generatedAlert.yamlPreview);
      setCopiedYaml(true);
      setTimeout(() => setCopiedYaml(false), 2000);
    }
  };

  // Toggle expandir alerta
  const toggleExpandAlert = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  // Cores por severidade
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 border-red-500/30 text-red-400';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      case 'info': return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
      default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
    }
  };

  // Cores por status
  const getStatusBadge = (status: string, enabled: boolean) => {
    if (!enabled) return 'bg-gray-600 text-gray-300';
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'pending_approval': return 'bg-yellow-500/20 text-yellow-400';
      case 'error': return 'bg-red-500/20 text-red-400';
      case 'disabled': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Filtrar alertas
  const filteredAlerts = alertsView === 'active' 
    ? alerts.filter(a => a.enabled && a.status === 'active')
    : alerts;

  // Usar dados actualizados se disponíveis, senão usar dados do sistema
  const nodeExporterData = exporterStatusData?.nodeExporter || system.nodeExporter;
  const processExporterData = exporterStatusData?.processExporter || system.processExporter;
  
  const hasNodeExporter = nodeExporterData?.installed || nodeExporterData?.status === 'running';
  const hasProcessExporter = processExporterData?.installed || processExporterData?.status === 'running';
  const hasAnyExporter = hasNodeExporter || hasProcessExporter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Activity className="text-green-400" size={24} />
          Monitoring & Alerts
        </h2>
        <button
          onClick={() => { refreshExporterStatus(); loadAlerts(); loadPrometheusStatus(); loadFiringAlerts(); }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={refreshingExporters || alertsLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Exporters Status Cards */}
      <div className="space-y-3">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={refreshExporterStatus}
            disabled={refreshingExporters}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors disabled:opacity-50"
            title="Check current exporter status on server"
          >
            <RefreshCw size={14} className={refreshingExporters ? 'animate-spin' : ''} />
            {refreshingExporters ? 'Checking...' : 'Check Exporters'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Node Exporter Card */}
          <div className={`border rounded-xl p-4 ${
            nodeExporterData?.status === 'running'
              ? 'bg-green-500/10 border-green-500/30'
              : nodeExporterData?.installed
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  nodeExporterData?.status === 'running'
                    ? 'bg-green-500/20'
                    : 'bg-gray-500/20'
                }`}>
                  <Activity size={20} className={
                    nodeExporterData?.status === 'running'
                      ? 'text-green-400'
                      : 'text-gray-400'
                  } />
                </div>
                <div>
                  <h4 className="text-white font-medium">Node Exporter</h4>
                  <p className="text-xs text-gray-400">System metrics (CPU, RAM, Disk)</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                nodeExporterData?.status === 'running'
                  ? 'bg-green-500/20 text-green-400'
                  : nodeExporterData?.installed
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  nodeExporterData?.status === 'running'
                    ? 'bg-green-400 animate-pulse'
                    : nodeExporterData?.installed
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                }`}></span>
                {nodeExporterData?.status === 'running'
                  ? 'ONLINE'
                  : nodeExporterData?.installed
                  ? 'INSTALLED'
                  : 'NOT INSTALLED'}
              </div>
            </div>
            {(nodeExporterData?.installed || nodeExporterData?.status === 'running') && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                  <span className="text-gray-400">Port:</span>
                  <span className="text-white ml-2 font-mono">{nodeExporterData?.port || 9100}</span>
                </div>
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                  <span className="text-gray-400">Version:</span>
                  <span className="text-white ml-2 font-mono">{nodeExporterData?.version || 'N/A'}</span>
                </div>
              </div>
            )}
            {!nodeExporterData?.installed && nodeExporterData?.status !== 'running' && (
              <p className="text-xs text-gray-400 mt-2">
                Run onboarding or click "Check Exporters" to detect
              </p>
            )}
          </div>

          {/* Process Exporter Card */}
          <div className={`border rounded-xl p-4 ${
            processExporterData?.status === 'running'
              ? 'bg-green-500/10 border-green-500/30'
              : processExporterData?.installed
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-gray-500/10 border-gray-500/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  processExporterData?.status === 'running'
                    ? 'bg-purple-500/20'
                    : 'bg-gray-500/20'
                }`}>
                  <Cpu size={20} className={
                    processExporterData?.status === 'running'
                      ? 'text-purple-400'
                      : 'text-gray-400'
                  } />
                </div>
                <div>
                  <h4 className="text-white font-medium">Process Exporter</h4>
                  <p className="text-xs text-gray-400">Process metrics (nginx, mysql, etc.)</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                processExporterData?.status === 'running'
                  ? 'bg-green-500/20 text-green-400'
                  : processExporterData?.installed
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  processExporterData?.status === 'running'
                    ? 'bg-green-400 animate-pulse'
                    : processExporterData?.installed
                    ? 'bg-yellow-400'
                    : 'bg-gray-400'
                }`}></span>
                {processExporterData?.status === 'running'
                  ? 'ONLINE'
                  : processExporterData?.installed
                  ? 'INSTALLED'
                  : 'NOT INSTALLED'}
              </div>
            </div>
            {(processExporterData?.installed || processExporterData?.status === 'running') && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                    <span className="text-gray-400">Port:</span>
                    <span className="text-white ml-2 font-mono">{processExporterData?.port || 9256}</span>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                    <span className="text-gray-400">Processes:</span>
                    <span className="text-white ml-2">{processExporterData?.monitoredProcesses?.length || 0}</span>
                  </div>
                </div>
                {processExporterData?.monitoredProcesses && processExporterData.monitoredProcesses.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {processExporterData.monitoredProcesses.slice(0, 8).map((proc, i) => (
                      <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                        {proc}
                      </span>
                    ))}
                    {processExporterData.monitoredProcesses.length > 8 && (
                      <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded">
                        +{processExporterData.monitoredProcesses.length - 8} mais
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {!processExporterData?.installed && processExporterData?.status !== 'running' && (
              <p className="text-xs text-gray-400 mt-2">
                Run onboarding or click "Check Exporters" to detect
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Prometheus & Connectivity Status */}
      {hasAnyExporter && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prometheus Status */}
          <div className={`border rounded-xl p-4 ${
            prometheusStatus?.targetHealth === 'up' 
              ? 'bg-green-500/10 border-green-500/30' 
              : prometheusStatus?.targetHealth === 'down'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-gray-500/10 border-gray-500/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Activity size={18} />
                Prometheus Status
              </h4>
              <button
                onClick={loadPrometheusStatus}
                className="text-gray-400 hover:text-white p-1"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Target Health:</span>
                <span className={`flex items-center gap-1 font-medium ${
                  prometheusStatus?.targetHealth === 'up' ? 'text-green-400' :
                  prometheusStatus?.targetHealth === 'down' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    prometheusStatus?.targetHealth === 'up' ? 'bg-green-400' :
                    prometheusStatus?.targetHealth === 'down' ? 'bg-red-400' :
                    'bg-gray-400'
                  }`}></span>
                  {prometheusStatus?.targetHealth?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              
              {prometheusStatus?.lastScrape && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Scrape:</span>
                  <span className="text-white text-xs">
                    {new Date(prometheusStatus.lastScrape).toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              {prometheusStatus?.lastError && (
                <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-300">
                  <strong>Error:</strong> {prometheusStatus.lastError}
                </div>
              )}
            </div>
          </div>

          {/* Connectivity Check */}
          <div className={`border rounded-xl p-4 ${
            connectivityStatus?.reachable 
              ? 'bg-green-500/10 border-green-500/30' 
              : connectivityStatus?.reachable === false
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-gray-500/10 border-gray-500/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Activity size={18} />
                Node Exporter Connectivity
              </h4>
              <button
                onClick={checkConnectivity}
                disabled={checkingConnectivity}
                className="text-gray-400 hover:text-white p-1 disabled:opacity-50"
                title="Test connectivity"
              >
                <RefreshCw size={14} className={checkingConnectivity ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {connectivityStatus ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`flex items-center gap-1 font-medium ${
                    connectivityStatus.reachable ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      connectivityStatus.reachable ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    {connectivityStatus.reachable ? 'REACHABLE' : 'UNREACHABLE'}
                  </span>
                </div>
                <div className="text-xs text-gray-300">
                  {connectivityStatus.message}
                </div>
              </div>
            ) : (
              <button
                onClick={checkConnectivity}
                disabled={checkingConnectivity}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg disabled:opacity-50"
              >
                {checkingConnectivity ? 'Checking...' : 'Test Connectivity'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Firing Alerts Section */}
      {(firingAlerts.length > 0 || pendingAlerts.length > 0) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bell className="text-red-400 animate-pulse" size={20} />
              Active Alerts
              <span className="ml-2 px-2 py-0.5 bg-red-500/30 text-red-300 text-sm rounded-full">
                {firingAlerts.length} firing
              </span>
              {pendingAlerts.length > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/30 text-yellow-300 text-sm rounded-full">
                  {pendingAlerts.length} pending
                </span>
              )}
            </h3>
            <button
              onClick={loadFiringAlerts}
              disabled={firingLoading}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={firingLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Firing Alerts */}
            {firingAlerts.map((alert, index) => (
              <div
                key={`firing-${index}`}
                className="bg-red-500/20 border border-red-500/40 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                      <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded uppercase">
                        FIRING
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{alert.alertName}</h4>
                      <p className="text-gray-300 text-sm">{alert.summary}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded uppercase ${
                    alert.severity === 'critical' 
                      ? 'bg-red-500/30 text-red-300' 
                      : 'bg-yellow-500/30 text-yellow-300'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                  <span>Instance: <span className="text-gray-300 font-mono">{alert.instance}</span></span>
                  <span>Active since: <span className="text-gray-300">{new Date(alert.activeAt).toLocaleString()}</span></span>
                </div>
              </div>
            ))}

            {/* Pending Alerts */}
            {pendingAlerts.map((alert, index) => (
              <div
                key={`pending-${index}`}
                className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                      <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs font-bold rounded uppercase">
                        PENDING
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{alert.alertName}</h4>
                      <p className="text-gray-300 text-sm">{alert.summary}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded uppercase ${
                    alert.severity === 'critical' 
                      ? 'bg-red-500/30 text-red-300' 
                      : 'bg-yellow-500/30 text-yellow-300'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                  <span>Instance: <span className="text-gray-300 font-mono">{alert.instance}</span></span>
                  <span>Pending since: <span className="text-gray-300">{new Date(alert.activeAt).toLocaleString()}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Active Alerts Message */}
      {firingAlerts.length === 0 && pendingAlerts.length === 0 && !firingLoading && hasAnyExporter && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check size={20} className="text-green-400" />
            </div>
            <div>
              <h4 className="text-green-400 font-medium">No Active Alerts</h4>
              <p className="text-gray-400 text-sm">All systems are running normally</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Alert Generator */}
      <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Bot className="text-purple-400" size={20} />
          Create Alert with AI
        </h3>

        <div className="space-y-4">
          {/* Prompt Input */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the alert you want to create... E.g: 'Alert when CPU is above 90% for more than 5 minutes' or 'Critical warning when disk is 95% full'"
              className="w-full h-24 px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50 focus:bg-gray-700 transition-all resize-none"
              disabled={generating}
            />
            <button
              onClick={handleGenerateAlert}
              disabled={generating || prompt.length < 10}
              className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Generate Alert
                </>
              )}
            </button>
          </div>

          {/* Generated Alert Preview */}
          {generatedAlert && (
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <Check className="text-green-400" size={18} />
                  Alerta Gerado
                </h4>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(generatedAlert.alert.severity)}`}>
                    {generatedAlert.alert.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    Confiança: {Math.round(generatedAlert.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Alert Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Nome:</span>
                  <div className="text-white font-mono">{generatedAlert.alert.alertName}</div>
                </div>
                <div>
                  <span className="text-gray-400">Duração:</span>
                  <div className="text-white font-mono">{generatedAlert.alert.forDuration}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Descrição:</span>
                  <div className="text-white">{generatedAlert.alert.description}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">PromQL Expression:</span>
                  <div className="text-green-400 font-mono text-xs bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                    {generatedAlert.alert.expr}
                  </div>
                </div>
              </div>

              {/* YAML Preview Toggle */}
              <div>
                <button
                  onClick={() => setShowYamlPreview(!showYamlPreview)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  <Code size={14} />
                  {showYamlPreview ? 'Esconder' : 'Mostrar'} YAML Preview
                  {showYamlPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                {showYamlPreview && (
                  <div className="relative mt-2">
                    <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto font-mono">
                      {generatedAlert.yamlPreview}
                    </pre>
                    <button
                      onClick={handleCopyYaml}
                      className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                      title="Copiar YAML"
                    >
                      {copiedYaml ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Approve/Reject Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-700">
                <button
                  onClick={handleApproveGenerated}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <Check size={18} />
                  Aprovar e Activar
                </button>
                <button
                  onClick={handleRejectGenerated}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert Test Result */}
      {alertTestResult && (
        <div className={`border rounded-xl p-4 ${
          alertTestResult.wouldFire 
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-green-500/10 border-green-500/30'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium flex items-center gap-2">
              <Zap size={18} className={alertTestResult.wouldFire ? 'text-red-400' : 'text-green-400'} />
              Resultado do Teste: {alertTestResult.alertName}
            </h4>
            <button
              onClick={() => setAlertTestResult(null)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Status */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              alertTestResult.wouldFire 
                ? 'bg-red-500/20 text-red-400' 
                : 'bg-green-500/20 text-green-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                alertTestResult.wouldFire ? 'bg-red-400 animate-pulse' : 'bg-green-400'
              }`}></span>
              <span className="font-medium">{alertTestResult.currentStatus}</span>
            </div>

            {/* Message */}
            <p className="text-sm text-gray-300">{alertTestResult.message}</p>

            {/* Results Table */}
            {alertTestResult.results.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs text-gray-400 uppercase mb-2">Valores Actuais:</h5>
                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">Instance</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertTestResult.results.map((r, i) => (
                        <tr key={i} className="border-t border-gray-700/50">
                          <td className="px-3 py-2 text-white font-mono text-xs">{r.instance}</td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${
                            alertTestResult.wouldFire ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {r.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-gray-500">
              Testado em: {new Date(alertTestResult.testedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bell className="text-yellow-400" size={20} />
            Configured Alerts
          </h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAlertsView('active')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                alertsView === 'active' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Active ({alerts.filter(a => a.enabled && a.status === 'active').length})
            </button>
            <button
              onClick={() => setAlertsView('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                alertsView === 'all' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All ({alerts.length})
            </button>
          </div>
        </div>

        {alertsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Bell className="mx-auto mb-3 opacity-50" size={40} />
            <p>No alerts configured</p>
            <p className="text-sm mt-1">Use the AI above to create your first alert</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert._id}
                className={`border rounded-xl overflow-hidden transition-colors ${getSeverityColor(alert.severity)}`}
              >
                {/* Alert Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5"
                  onClick={() => toggleExpandAlert(alert._id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded uppercase ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-white font-medium">{alert.alertName}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${getStatusBadge(alert.status, alert.enabled)}`}>
                      {alert.enabled ? alert.status : 'disabled'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTestAlert(alert._id); }}
                      disabled={testingAlertId === alert._id}
                      className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                      title="Testar alarme"
                    >
                      {testingAlertId === alert._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleAlert(alert); }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        alert.enabled 
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                          : 'bg-gray-600/50 text-gray-400 hover:bg-gray-600'
                      }`}
                      title={alert.enabled ? 'Desactivar' : 'Activar'}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAlert(alert._id); }}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    {expandedAlerts.has(alert._id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Alert Details (Expanded) */}
                {expandedAlerts.has(alert._id) && (
                  <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Description:</span>
                      <p className="text-white text-sm">{alert.description}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Expressão PromQL:</span>
                      <div className="text-green-400 font-mono text-xs bg-gray-900/50 p-2 rounded mt-1">
                        {alert.expr}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white ml-2">{alert.forDuration}</span>
                      </div>
                      {alert.lastSyncAt && (
                        <div>
                          <span className="text-gray-400">Last sync:</span>
                          <span className={`ml-2 ${
                            alert.lastSyncStatus === 'success' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {new Date(alert.lastSyncAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {alert.originalPrompt && (
                      <div>
                        <span className="text-gray-400 text-sm">Prompt original:</span>
                        <p className="text-gray-300 text-sm italic">"{alert.originalPrompt}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Alert Examples */}
      {hasNodeExporter && !generatedAlert && (
        <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">💡 Example prompts:</h4>
          <div className="flex flex-wrap gap-2">
            {[
              'Alert when CPU > 90% for 5 minutes',
              'Critical warning if memory > 95%',
              'Alert when disk is 90% full',
              'Notify if system goes offline',
              'Warning if load average > 5'
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="px-3 py-1.5 text-xs bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

