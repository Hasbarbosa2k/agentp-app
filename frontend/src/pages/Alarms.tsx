import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  RefreshCw,
  Server,
  Filter
} from 'lucide-react';
import { alertsService } from '../services/alerts.service';
import { useToast } from '../contexts/ToastContext';

interface FiringAlert {
  alertName: string;
  severity: string;
  state: string;
  instance: string;
  summary: string;
  description?: string;
  activeAt: string;
  value?: string;
  labels?: Record<string, string>;
}

interface AlertGroup {
  system: {
    _id: string | null;
    name: string;
    ip: string;
    environment?: string;
  };
  alerts: FiringAlert[];
}

interface AlertsStats {
  totalSystems: number;
  totalAlerts: number;
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  byState: {
    firing: number;
    pending: number;
  };
}

export const Alarms: React.FC = () => {
  const { showToast } = useToast();
  const [groups, setGroups] = useState<AlertGroup[]>([]);
  const [stats, setStats] = useState<AlertsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{
    state?: 'firing' | 'pending' | 'all';
    severity?: 'critical' | 'warning' | 'info';
  }>({ state: 'all' });
  const [showFilters, setShowFilters] = useState(false);

  const loadAlarms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await alertsService.getFiringAlertsGrouped(filters);
      if (response.success && response.data) {
        setGroups(response.data.groups);
        setStats(response.data.stats);
        // Expandir todos os sistemas por padrão
        const allSystemKeys = new Set(
          response.data.groups.map(g => g.system._id || g.system.ip)
        );
        setExpandedSystems(allSystemKeys);
      } else {
        if (response.error) {
          showToast(`Error loading alarms: ${response.error}`, 'error');
        } else {
          // No alarms is normal, not an error
          setGroups([]);
          setStats({
            totalSystems: 0,
            totalAlerts: 0,
            bySeverity: { critical: 0, warning: 0, info: 0 },
            byState: { firing: 0, pending: 0 }
          });
        }
      }
    } catch (error) {
      console.error('Error loading alarms:', error);
      showToast('Error loading alarms', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  const toggleSystem = (systemKey: string) => {
    const newExpanded = new Set(expandedSystems);
    if (newExpanded.has(systemKey)) {
      newExpanded.delete(systemKey);
    } else {
      newExpanded.add(systemKey);
    }
    setExpandedSystems(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500/50 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'info':
        return 'border-blue-500/50 bg-blue-500/10';
      default:
        return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="text-red-400" size={18} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-400" size={18} />;
      case 'info':
        return <Info className="text-blue-400" size={18} />;
      default:
        return <Bell className="text-gray-400" size={18} />;
    }
  };

  const formatDuration = (activeAt: string) => {
    try {
      const activeTime = new Date(activeAt).getTime();
      const now = Date.now();
      const diffMs = now - activeTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        return `${diffDays}d ${diffHours % 24}h`;
      } else if (diffHours > 0) {
        return `${diffHours}h ${diffMins % 60}m`;
      } else {
        return `${diffMins}m`;
      }
    } catch {
      return 'N/A';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'firing':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'configured':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStateLabel = (state: string) => {
    if (state === 'configured') {
      return 'CONFIGURED';
    }
    return state.toUpperCase();
  };

  const clearFilters = () => {
    setFilters({ state: 'all' });
    setShowFilters(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-green-400" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Alarms</h1>
          <p className="text-gray-400">All alerts from Prometheus API</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Filter size={18} />
            <span>Filters</span>
          </button>
          <button
            onClick={loadAlarms}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">State</label>
              <select
                value={filters.state || 'all'}
                onChange={(e) => setFilters({ ...filters, state: e.target.value as 'firing' | 'pending' | 'all' })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="all">All States</option>
                <option value="firing">Firing</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Severity</label>
              <select
                value={filters.severity || ''}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value as 'critical' | 'warning' | 'info' || undefined })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Systems</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalSystems}</p>
              </div>
              <Server className="text-blue-400" size={32} />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Alarms</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalAlerts}</p>
              </div>
              <Bell className="text-yellow-400" size={32} />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Firing</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.byState.firing}</p>
              </div>
              <AlertCircle className="text-red-400" size={32} />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Critical</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.bySeverity.critical}</p>
              </div>
              <AlertCircle className="text-red-400" size={32} />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Warning</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.bySeverity.warning}</p>
              </div>
              <AlertTriangle className="text-yellow-400" size={32} />
            </div>
          </div>
        </div>
      )}


      {/* Alarms List by System */}
      {groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <Bell className="mx-auto mb-4 opacity-50" size={64} />
          <p className="text-gray-400 text-lg">No alarms found</p>
          <p className="text-gray-500 text-sm mt-2">
            {Object.keys(filters).length > 0 && filters.state !== 'all'
              ? 'Try adjusting the filters'
              : 'All systems are operating normally'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const systemKey = group.system._id || group.system.ip;
            const isExpanded = expandedSystems.has(systemKey);
            const criticalCount = group.alerts.filter(a => a.severity === 'critical').length;
            const warningCount = group.alerts.filter(a => a.severity === 'warning').length;
            const firingCount = group.alerts.filter(a => a.state === 'firing').length;
            const pendingCount = group.alerts.filter(a => a.state === 'pending').length;
            const configuredCount = group.alerts.filter(a => a.state === 'configured' || (a as any).configured).length;

            return (
              <div
                key={systemKey}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
              >
                {/* System Header */}
                <button
                  onClick={() => toggleSystem(systemKey)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="text-gray-400" size={20} />
                    ) : (
                      <ChevronRight className="text-gray-400" size={20} />
                    )}
                    <Server className="text-blue-400" size={20} />
                    <div className="flex-1 text-left">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-white">{group.system.name}</h3>
                        {group.system.environment && (
                          <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                            {group.system.environment}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{group.system.ip}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {criticalCount > 0 && (
                        <span className="flex items-center space-x-1 px-2 py-1 rounded bg-red-500/20 text-red-400 text-sm">
                          <AlertCircle size={14} />
                          <span>{criticalCount}</span>
                        </span>
                      )}
                      {warningCount > 0 && (
                        <span className="flex items-center space-x-1 px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-sm">
                          <AlertTriangle size={14} />
                          <span>{warningCount}</span>
                        </span>
                      )}
                      {firingCount > 0 && (
                        <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs">
                          {firingCount} firing
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                          {pendingCount} pending
                        </span>
                      )}
                      {configuredCount > 0 && firingCount === 0 && pendingCount === 0 && (
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                          {configuredCount} configured
                        </span>
                      )}
                      <span className="text-gray-400 text-sm">
                        {group.alerts.length} alarm{group.alerts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Alarms List */}
                {isExpanded && (
                  <div className="border-t border-gray-700">
                    <div className="p-4 space-y-3">
                      {group.alerts.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No alarms for this system</p>
                      ) : (
                        group.alerts.map((alert, index) => (
                          <div
                            key={`${alert.alertName}-${alert.instance}-${index}`}
                            className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  {getSeverityIcon(alert.severity)}
                                  <h4 className="font-semibold text-white">{alert.alertName}</h4>
                                  <span className={`px-2 py-1 text-xs rounded border ${getStateColor(alert.state)}`}>
                                    {getStateLabel(alert.state)}
                                  </span>
                                </div>
                                <p className="text-gray-300 text-sm mb-2">
                                  {alert.description || alert.summary}
                                </p>
                                {alert.value && (
                                  <p className="text-gray-400 text-xs mb-2">
                                    Value: {alert.value}
                                  </p>
                                )}
                                <div className="flex items-center space-x-4 text-xs text-gray-400">
                                  {alert.instance && (
                                    <span>Instance: {alert.instance}</span>
                                  )}
                                  {alert.activeAt && (
                                    <>
                                      {alert.state === 'configured' || (alert as any).configured ? (
                                        <span>
                                          Configured: {new Date(alert.activeAt).toLocaleDateString('en-US', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      ) : (
                                        <>
                                          <span>Active for: {formatDuration(alert.activeAt)}</span>
                                          <span>
                                            Since: {new Date(alert.activeAt).toLocaleDateString('en-US', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
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
