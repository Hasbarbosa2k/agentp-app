const alertService = require('../services/alertService');
const Alert = require('../models/Alert');
const System = require('../models/System');

/**
 * Gerar alerta a partir de prompt usando AI
 */
const generateAlertFromPrompt = async (req, res) => {
  try {
    const { systemId } = req.params;
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Prompt deve ter pelo menos 10 caracteres'
      });
    }

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    console.log(`🤖 Gerando alerta para sistema ${system.name} com prompt: "${prompt}"`);

    const result = await alertService.generateAlertFromPrompt(prompt, system);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Falha ao gerar alerta',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Alerta gerado com sucesso',
      data: {
        alert: result.alert,
        yamlPreview: result.yamlPreview,
        confidence: result.confidence,
        originalPrompt: result.originalPrompt
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao gerar alerta',
      error: error.message
    });
  }
};

/**
 * Criar alerta (guardar no sistema)
 */
const createAlert = async (req, res) => {
  try {
    const { systemId } = req.params;
    const alertData = req.body;
    const userId = req.user._id;

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    // Verificar se já existe alerta com mesmo nome
    const existingAlert = await Alert.findOne({ 
      systemId, 
      alertName: alertData.alertName 
    });
    
    if (existingAlert) {
      return res.status(409).json({
        success: false,
        message: `Já existe um alerta com o nome "${alertData.alertName}" para este sistema`
      });
    }

    const alert = await alertService.createAlert(systemId, alertData, userId);

    res.status(201).json({
      success: true,
      message: 'Alerta criado com sucesso',
      data: { alert }
    });

  } catch (error) {
    console.error('❌ Erro ao criar alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao criar alerta',
      error: error.message
    });
  }
};

/**
 * Aprovar e activar alerta
 */
const approveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.user._id;

    const alert = await alertService.approveAlert(alertId, userId);

    res.json({
      success: true,
      message: 'Alerta aprovado e activado',
      data: { alert }
    });

  } catch (error) {
    console.error('❌ Erro ao aprovar alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao aprovar alerta',
      error: error.message
    });
  }
};

/**
 * Rejeitar alerta
 */
const rejectAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerta não encontrado'
      });
    }

    await alert.reject(userId, reason);

    res.json({
      success: true,
      message: 'Alerta rejeitado',
      data: { alert }
    });

  } catch (error) {
    console.error('❌ Erro ao rejeitar alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao rejeitar alerta',
      error: error.message
    });
  }
};

/**
 * Listar alertas de um sistema
 */
const getAlertsBySystem = async (req, res) => {
  try {
    const { systemId } = req.params;
    const { status, severity, enabled } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    if (enabled !== undefined) filters.enabled = enabled === 'true';

    const alerts = await alertService.getAlertsBySystem(systemId, filters);

    res.json({
      success: true,
      data: {
        alerts,
        total: alerts.length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao listar alertas',
      error: error.message
    });
  }
};

/**
 * Obter detalhes de um alerta
 */
const getAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findById(alertId)
      .populate('systemId', 'name ip')
      .populate('createdBy', 'username email')
      .populate('history.userId', 'username');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerta não encontrado'
      });
    }

    res.json({
      success: true,
      data: { alert }
    });

  } catch (error) {
    console.error('❌ Erro ao obter alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao obter alerta',
      error: error.message
    });
  }
};

/**
 * Actualizar alerta
 */
const updateAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerta não encontrado'
      });
    }

    // Campos que podem ser actualizados
    const allowedUpdates = ['description', 'expr', 'forDuration', 'severity', 'annotations', 'labels'];
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        alert[key] = updates[key];
      }
    }

    // Regenerar YAML
    alert.generatedYaml = alertService.generateYamlPreview(alert);
    alert.updatedBy = userId;
    alert.addHistory('updated', userId, 'Alerta actualizado');

    await alert.save();

    res.json({
      success: true,
      message: 'Alerta actualizado',
      data: { alert }
    });

  } catch (error) {
    console.error('❌ Erro ao actualizar alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao actualizar alerta',
      error: error.message
    });
  }
};

/**
 * Eliminar alerta
 */
const deleteAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findByIdAndDelete(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerta não encontrado'
      });
    }

    // Sincronizar com Prometheus (remover regra)
    await alertService.syncWithPrometheus();

    res.json({
      success: true,
      message: 'Alerta eliminado',
      data: { alertId }
    });

  } catch (error) {
    console.error('❌ Erro ao eliminar alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao eliminar alerta',
      error: error.message
    });
  }
};

/**
 * Activar/Desactivar alerta
 */
const toggleAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { enabled } = req.body;
    const userId = req.user._id;

    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerta não encontrado'
      });
    }

    if (enabled) {
      alert.enabled = true;
      alert.status = 'active';
      alert.addHistory('enabled', userId, 'Alerta activado');
    } else {
      await alert.disable(userId);
    }

    await alert.save();

    // Sincronizar com Prometheus
    await alertService.syncWithPrometheus();

    res.json({
      success: true,
      message: enabled ? 'Alerta activado' : 'Alerta desactivado',
      data: { alert }
    });

  } catch (error) {
    console.error('❌ Erro ao alterar estado do alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno',
      error: error.message
    });
  }
};

/**
 * Sincronizar alertas com Prometheus
 */
const syncWithPrometheus = async (req, res) => {
  try {
    const result = await alertService.syncWithPrometheus();

    res.json({
      success: true,
      message: 'Sincronização concluída',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao sincronizar com Prometheus:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar com Prometheus',
      error: error.message
    });
  }
};

/**
 * Obter métricas do Node Exporter
 */
const getSystemMetrics = async (req, res) => {
  try {
    const { systemId } = req.params;

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    if (!system.nodeExporter?.installed) {
      return res.status(400).json({
        success: false,
        message: 'Node Exporter não está instalado neste sistema'
      });
    }

    const metrics = await alertService.getSystemMetrics(
      system.ip, 
      system.nodeExporter.port || 9100
    );

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Erro ao obter métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter métricas',
      error: error.message
    });
  }
};

/**
 * Testar um alarme - executar query e ver resultado
 */
const testAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const result = await alertService.testAlert(alertId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao testar alarme:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Executar query PromQL arbitrária
 */
const executeQuery = async (req, res) => {
  try {
    const { expr } = req.body;

    if (!expr) {
      return res.status(400).json({
        success: false,
        message: 'Expressão PromQL é obrigatória'
      });
    }

    const result = await alertService.executePromQLQuery(expr);

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao executar query:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obter estado dos targets do Prometheus
 */
const getPrometheusTargets = async (req, res) => {
  try {
    const result = await alertService.getPrometheusTargets();
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao obter targets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obter alertas que estão a disparar (FIRING) no Prometheus
 */
const getFiringAlerts = async (req, res) => {
  try {
    const { systemId } = req.params;
    
    let systemIp = null;
    if (systemId) {
      const system = await System.findById(systemId);
      if (system) {
        systemIp = system.ip;
      }
    }

    const result = await alertService.getFiringAlerts(systemIp);
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao obter alertas firing:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      firing: [],
      pending: []
    });
  }
};

/**
 * Verificar conectividade com Node Exporter de um sistema
 */
const checkNodeExporterConnectivity = async (req, res) => {
  try {
    const { systemId } = req.params;

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    const port = system.nodeExporter?.port || 9100;
    const result = await alertService.checkNodeExporterConnectivity(system.ip, port);

    res.json({
      success: true,
      data: {
        systemId,
        systemName: system.name,
        ip: system.ip,
        port,
        ...result
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar conectividade:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Sincronizar targets (sistemas) com Prometheus
 */
const syncTargets = async (req, res) => {
  try {
    const result = await alertService.syncTargets();

    res.json({
      success: true,
      message: 'Targets sincronizados',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao sincronizar targets:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar targets',
      error: error.message
    });
  }
};

/**
 * Obter todos os alertas agrupados por sistema
 */
const getAllAlertsGrouped = async (req, res) => {
  try {
    const { status, severity, enabled } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    if (enabled !== undefined) filters.enabled = enabled === 'true';

    const groupedAlerts = await alertService.getAllAlertsGroupedBySystem(filters);

    // Calcular estatísticas
    const stats = {
      totalSystems: groupedAlerts.length,
      totalAlerts: groupedAlerts.reduce((sum, group) => sum + group.alerts.length, 0),
      bySeverity: {
        critical: 0,
        warning: 0,
        info: 0
      },
      byStatus: {
        active: 0,
        pending_approval: 0,
        disabled: 0,
        draft: 0,
        error: 0
      }
    };

    for (const group of groupedAlerts) {
      for (const alert of group.alerts) {
        stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
        stats.byStatus[alert.status] = (stats.byStatus[alert.status] || 0) + 1;
      }
    }

    res.json({
      success: true,
      data: {
        groups: groupedAlerts,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar todos os alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao listar alertas',
      error: error.message
    });
  }
};

/**
 * Obter alertas do Prometheus agrupados por sistema
 */
const getFiringAlertsGrouped = async (req, res) => {
  try {
    const { state, severity } = req.query;
    
    const filters = {};
    if (state && ['firing', 'pending', 'all'].includes(state)) {
      filters.state = state;
    }
    if (severity && ['critical', 'warning', 'info'].includes(severity)) {
      filters.severity = severity;
    }

    const groupedAlerts = await alertService.getFiringAlertsGroupedBySystem(filters);

    // Calcular estatísticas
    const stats = {
      totalSystems: groupedAlerts.length,
      totalAlerts: groupedAlerts.reduce((sum, group) => sum + group.alerts.length, 0),
      bySeverity: {
        critical: 0,
        warning: 0,
        info: 0
      },
      byState: {
        firing: 0,
        pending: 0
      }
    };

    for (const group of groupedAlerts) {
      for (const alert of group.alerts) {
        const alertSeverity = alert.severity || 'warning';
        stats.bySeverity[alertSeverity] = (stats.bySeverity[alertSeverity] || 0) + 1;
        
        const alertState = alert.state || 'firing';
        if (alertState === 'firing' || alertState === 'pending') {
          stats.byState[alertState] = (stats.byState[alertState] || 0) + 1;
        }
      }
    }

    res.json({
      success: true,
      data: {
        groups: groupedAlerts,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter alertas agrupados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao obter alertas',
      error: error.message,
      data: {
        groups: [],
        stats: {
          totalSystems: 0,
          totalAlerts: 0,
          bySeverity: { critical: 0, warning: 0, info: 0 },
          byState: { firing: 0, pending: 0 }
        }
      }
    });
  }
};

/**
 * Verificar e actualizar estado dos exporters de um sistema
 * Faz requests HTTP directamente aos exporters para verificar se estão online
 */
const refreshExporterStatus = async (req, res) => {
  try {
    const { systemId } = req.params;

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    console.log(`🔍 Verificando estado dos exporters para ${system.name} (${system.ip})...`);

    const axios = require('axios');
    const results = {
      nodeExporter: null,
      processExporter: null
    };

    // Verificar Node Exporter (porta 9100)
    const nodeExporterPort = system.nodeExporter?.port || 9100;
    try {
      const nodeResponse = await axios.get(
        `http://${system.ip}:${nodeExporterPort}/metrics`,
        { timeout: 5000 }
      );
      
      if (nodeResponse.status === 200 && nodeResponse.data) {
        // Extrair versão do output de métricas
        const versionMatch = nodeResponse.data.match(/node_exporter_build_info\{[^}]*version="([^"]+)"/);
        const version = versionMatch ? versionMatch[1] : system.nodeExporter?.version || null;

        system.nodeExporter = {
          installed: true,
          port: nodeExporterPort,
          version,
          installedAt: system.nodeExporter?.installedAt || new Date(),
          lastCheckedAt: new Date(),
          status: 'running'
        };
        
        results.nodeExporter = {
          status: 'running',
          version,
          port: nodeExporterPort
        };
        console.log(`✅ Node Exporter a correr em ${system.ip}:${nodeExporterPort}`);
      }
    } catch (nodeError) {
      // Node Exporter não acessível
      system.nodeExporter = {
        ...system.nodeExporter,
        lastCheckedAt: new Date(),
        status: nodeError.code === 'ECONNREFUSED' ? 'stopped' : 'error'
      };
      results.nodeExporter = {
        status: system.nodeExporter.status,
        error: nodeError.message
      };
      console.log(`⚠️ Node Exporter não acessível em ${system.ip}:${nodeExporterPort}: ${nodeError.message}`);
    }

    // Verificar Process Exporter (porta 9256)
    const processExporterPort = system.processExporter?.port || 9256;
    try {
      const processResponse = await axios.get(
        `http://${system.ip}:${processExporterPort}/metrics`,
        { timeout: 5000 }
      );
      
      if (processResponse.status === 200 && processResponse.data) {
        // Extrair processos monitorizados
        const processMatches = processResponse.data.match(/namedprocess_namegroup_num_procs\{[^}]*groupname="([^"]+)"/g);
        const monitoredProcesses = processMatches 
          ? [...new Set(processMatches.map(m => m.match(/groupname="([^"]+)"/)[1]))]
          : [];

        system.processExporter = {
          installed: true,
          port: processExporterPort,
          installedAt: system.processExporter?.installedAt || new Date(),
          lastCheckedAt: new Date(),
          status: 'running',
          monitoredProcesses
        };
        
        results.processExporter = {
          status: 'running',
          port: processExporterPort,
          monitoredProcesses
        };
        console.log(`✅ Process Exporter a correr em ${system.ip}:${processExporterPort} (${monitoredProcesses.length} processos)`);
      }
    } catch (processError) {
      // Process Exporter não acessível
      system.processExporter = {
        ...system.processExporter,
        lastCheckedAt: new Date(),
        status: processError.code === 'ECONNREFUSED' ? 'stopped' : 'error'
      };
      results.processExporter = {
        status: system.processExporter.status,
        error: processError.message
      };
      console.log(`⚠️ Process Exporter não acessível em ${system.ip}:${processExporterPort}: ${processError.message}`);
    }

    await system.save();

    // Sincronizar targets com Prometheus se algum exporter foi detectado
    if (results.nodeExporter?.status === 'running' || results.processExporter?.status === 'running') {
      try {
        await alertService.syncTargets();
        console.log('📊 Targets do Prometheus actualizados');
      } catch (syncError) {
        console.warn('⚠️ Erro ao sincronizar targets:', syncError.message);
      }
    }

    res.json({
      success: true,
      message: 'Estado dos exporters actualizado',
      data: {
        systemId,
        systemName: system.name,
        ip: system.ip,
        nodeExporter: {
          installed: system.nodeExporter?.installed || false,
          status: system.nodeExporter?.status || 'not_installed',
          port: system.nodeExporter?.port,
          version: system.nodeExporter?.version,
          lastCheckedAt: system.nodeExporter?.lastCheckedAt
        },
        processExporter: {
          installed: system.processExporter?.installed || false,
          status: system.processExporter?.status || 'not_installed',
          port: system.processExporter?.port,
          monitoredProcesses: system.processExporter?.monitoredProcesses || [],
          lastCheckedAt: system.processExporter?.lastCheckedAt
        },
        checkResults: results
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar estado dos exporters:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar estado dos exporters',
      error: error.message
    });
  }
};

module.exports = {
  generateAlertFromPrompt,
  createAlert,
  approveAlert,
  rejectAlert,
  getAlertsBySystem,
  getAllAlertsGrouped,
  getFiringAlertsGrouped,
  getAlert,
  updateAlert,
  deleteAlert,
  toggleAlert,
  testAlert,
  executeQuery,
  syncWithPrometheus,
  syncTargets,
  getPrometheusTargets,
  getFiringAlerts,
  checkNodeExporterConnectivity,
  refreshExporterStatus,
  getSystemMetrics
};

