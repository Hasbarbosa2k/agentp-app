const Alert = require('../models/Alert');
const System = require('../models/System');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

/**
 * Serviço para gestão de alertas Prometheus
 */
class AlertService {
  constructor() {
    // Caminho para os ficheiros de regras do Prometheus
    this.rulesDir = process.env.PROMETHEUS_RULES_DIR || path.join(__dirname, '../../prometheus/rules');
    this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090';
  }

  /**
   * Gerar expressão PromQL a partir de um prompt usando AI
   * @param {string} prompt - Descrição do alarme em linguagem natural
   * @param {Object} system - Dados do sistema
   * @returns {Promise<Object>} Regra gerada
   */
  async generateAlertFromPrompt(prompt, system) {
    // Determinar severidade a partir do prompt
    const promptLower = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos
    let severity = 'warning';
    if (promptLower.includes('critical') || promptLower.includes('critico') || promptLower.includes('urgente') || promptLower.includes('grave')) {
      severity = 'critical';
    } else if (promptLower.includes('info') || promptLower.includes('informativo')) {
      severity = 'info';
    }
    
    console.log(`🎯 Severidade detectada: ${severity} (prompt: "${prompt}")`);
    

    try {
      // Chamar serviço de AI dedicado para Prometheus
      const aiResponse = await this.callAIPrometheus(
        system.slug || system.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        prompt,
        severity
      );
      
      // Se AI respondeu, processar resposta
      if (aiResponse && aiResponse.parsed) {
        const parsed = aiResponse.parsed;
        
        // Extrair alerta do YAML gerado
        const rule = parsed.groups?.[0]?.rules?.[0];
        
        if (rule) {
          return {
            success: true,
            alert: {
              alertName: rule.alert || 'CustomAlert',
              description: rule.annotations?.description || prompt,
              expr: rule.expr,
              forDuration: rule.for || '5m',
              severity: rule.labels?.severity || severity,
              annotations: {
                summary: rule.annotations?.summary || prompt,
                description: rule.annotations?.description || prompt
              }
            },
            yamlPreview: aiResponse.yaml,
            confidence: 0.9,
            originalPrompt: prompt
          };
        }
      }
      
      // Se AI não disponível ou falhou, usar fallback
      console.log('⚠️ AI não disponível, usando fallback');
      const fallbackConfig = this.generateFallbackAlertConfig(prompt, system, severity);
      const yamlPreview = this.generateYamlPreview(fallbackConfig);

      return {
        success: true,
        alert: {
          alertName: fallbackConfig.alertName,
          description: fallbackConfig.description,
          expr: this.replaceInstancePlaceholder(fallbackConfig.expr, system),
          forDuration: fallbackConfig.forDuration,
          severity: fallbackConfig.severity,
          annotations: {
            summary: fallbackConfig.summary,
            description: fallbackConfig.description
          }
        },
        yamlPreview,
        confidence: fallbackConfig.confidence,
        originalPrompt: prompt,
        usedFallback: true
      };

    } catch (error) {
      console.error('❌ Erro ao gerar alerta via AI:', error);
      return {
        success: false,
        error: error.message,
        originalPrompt: prompt
      };
    }
  }
  
  /**
   * Substituir placeholder de instance pela IP real
   */
  replaceInstancePlaceholder(expr, system) {
    const instance = `${system.ip}:${system.nodeExporter?.port || 9100}`;
    return expr.replace(/\$\{instance\}/g, instance).replace(/instance="[^"]*"/g, `instance="${instance}"`);
  }

  /**
   * Chamar serviço de AI para gerar alerta Prometheus
   */
  async callAIPrometheus(systemSlug, description, severity = 'warning') {
    try {
      // Usar o endpoint dedicado do serviço de AI
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${aiServiceUrl}/api/prometheus/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemSlug,
          description: description,
          severity: severity
        })
      });

      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('❌ Erro ao chamar serviço de AI:', error);
      return null;
    }
  }

  /**
   * Gerar configuração de alerta básico quando AI não está disponível
   */
  generateFallbackAlertConfig(prompt, system, detectedSeverity = 'warning') {
    const promptLower = prompt.toLowerCase();
    const instance = `${system.ip}:${system.nodeExporter?.port || 9100}`;
    
    let alertConfig = {
      alertName: 'CustomAlert',
      description: prompt,
      expr: `up{instance="${instance}"} == 0`,
      forDuration: '5m',
      severity: detectedSeverity, // Usar severidade detectada
      summary: prompt,
      confidence: 0.5
    };

    // Extrair threshold do prompt (ex: "90%", "85%")
    const thresholdMatch = prompt.match(/(\d+)\s*%/);
    const threshold = thresholdMatch ? parseInt(thresholdMatch[1]) : null;

    // Detectar tipo de alerta baseado em keywords
    if (promptLower.includes('cpu')) {
      const cpuThreshold = threshold || 80;
      alertConfig = {
        alertName: 'HighCpuUsage',
        description: `Uso de CPU acima de ${cpuThreshold}%`,
        expr: `100 - (avg by(instance) (rate(node_cpu_seconds_total{instance="${instance}",mode="idle"}[5m])) * 100) > ${cpuThreshold}`,
        forDuration: detectedSeverity === 'critical' ? '2m' : '5m',
        severity: detectedSeverity, // Usar severidade detectada do prompt
        summary: `CPU acima de ${cpuThreshold}%`,
        confidence: 0.75
      };
    } else if (promptLower.includes('memória') || promptLower.includes('memory') || promptLower.includes('ram')) {
      const memThreshold = threshold || 85;
      alertConfig = {
        alertName: 'HighMemoryUsage',
        description: `Uso de memória acima de ${memThreshold}%`,
        expr: `(1 - (node_memory_MemAvailable_bytes{instance="${instance}"} / node_memory_MemTotal_bytes{instance="${instance}"})) * 100 > ${memThreshold}`,
        forDuration: detectedSeverity === 'critical' ? '2m' : '5m',
        severity: detectedSeverity,
        summary: `Memória acima de ${memThreshold}%`,
        confidence: 0.75
      };
    } else if (promptLower.includes('disco') || promptLower.includes('disk') || promptLower.includes('storage')) {
      const diskThreshold = threshold || 90;
      alertConfig = {
        alertName: 'HighDiskUsage',
        description: `Uso de disco acima de ${diskThreshold}%`,
        expr: `(1 - (node_filesystem_avail_bytes{instance="${instance}",fstype!="tmpfs"} / node_filesystem_size_bytes{instance="${instance}",fstype!="tmpfs"})) * 100 > ${diskThreshold}`,
        forDuration: detectedSeverity === 'critical' ? '5m' : '10m',
        severity: detectedSeverity,
        summary: `Disco acima de ${diskThreshold}%`,
        confidence: 0.75
      };
    } else if (promptLower.includes('offline') || promptLower.includes('down') || promptLower.includes('indisponível')) {
      alertConfig = {
        alertName: 'InstanceDown',
        description: 'Instância não está acessível',
        expr: `up{instance="${instance}"} == 0`,
        forDuration: '2m',
        severity: 'critical', // Este é sempre crítico
        summary: 'Instância offline',
        confidence: 0.85
      };
    } else if (promptLower.includes('load') || promptLower.includes('carga')) {
      const loadThreshold = threshold || 4;
      alertConfig = {
        alertName: 'HighLoadAverage',
        description: `Load average acima de ${loadThreshold}`,
        expr: `node_load5{instance="${instance}"} > ${loadThreshold}`,
        forDuration: '5m',
        severity: detectedSeverity,
        summary: `Load average acima de ${loadThreshold}`,
        confidence: 0.7
      };
    } else if (promptLower.includes('network') || promptLower.includes('rede') || promptLower.includes('bandwidth')) {
      const mbThreshold = threshold || 100;
      alertConfig = {
        alertName: 'HighNetworkTraffic',
        description: `Tráfego de rede acima de ${mbThreshold} MB/s`,
        expr: `rate(node_network_receive_bytes_total{instance="${instance}",device!="lo"}[5m]) / 1024 / 1024 > ${mbThreshold}`,
        forDuration: '5m',
        severity: detectedSeverity,
        summary: `Tráfego de rede elevado`,
        confidence: 0.6
      };
    } 
    // Detectar processos/serviços específicos
    else if (this.detectServiceAlert(promptLower)) {
      alertConfig = this.generateServiceAlertConfig(prompt, system, detectedSeverity, instance);
    }

    return alertConfig;
  }

  /**
   * Detectar se o prompt é sobre um serviço/processo
   */
  detectServiceAlert(promptLower) {
    const serviceKeywords = [
      'processo', 'process', 'serviço', 'servico', 'service',
      'nginx', 'apache', 'httpd', 'mysql', 'postgres', 'mongodb', 'redis',
      'node', 'python', 'java', 'php', 'docker', 'containerd',
      'systemd', 'cron', 'sshd', 'grafana', 'prometheus'
    ];
    return serviceKeywords.some(kw => promptLower.includes(kw));
  }

  /**
   * Gerar configuração de alerta para serviços/processos
   */
  generateServiceAlertConfig(prompt, system, severity, instance) {
    const promptLower = prompt.toLowerCase();
    const processExporterInstance = `${system.ip}:${system.processExporter?.port || 9256}`;

    // Mapear nomes de serviços comuns
    const serviceMap = {
      'nginx': { name: 'nginx', service: 'nginx.service', process: 'nginx' },
      'apache': { name: 'apache', service: 'apache2.service', process: 'apache2' },
      'httpd': { name: 'httpd', service: 'httpd.service', process: 'httpd' },
      'mysql': { name: 'mysql', service: 'mysql.service', process: 'mysqld' },
      'postgres': { name: 'postgresql', service: 'postgresql.service', process: 'postgres' },
      'mongodb': { name: 'mongodb', service: 'mongod.service', process: 'mongod' },
      'redis': { name: 'redis', service: 'redis.service', process: 'redis-server' },
      'docker': { name: 'docker', service: 'docker.service', process: 'dockerd' },
      'node': { name: 'node', service: null, process: 'node' },
      'python': { name: 'python', service: null, process: 'python' },
      'java': { name: 'java', service: null, process: 'java' },
      'php': { name: 'php-fpm', service: 'php-fpm.service', process: 'php-fpm' },
      'sshd': { name: 'sshd', service: 'sshd.service', process: 'sshd' },
      'cron': { name: 'cron', service: 'cron.service', process: 'cron' },
      'grafana': { name: 'grafana', service: 'grafana-server.service', process: 'grafana-server' },
      'prometheus': { name: 'prometheus', service: 'prometheus.service', process: 'prometheus' }
    };

    // Encontrar qual serviço foi mencionado
    let detectedService = null;
    for (const [key, value] of Object.entries(serviceMap)) {
      if (promptLower.includes(key)) {
        detectedService = value;
        break;
      }
    }

    // Se não encontrou serviço específico, criar alerta genérico
    if (!detectedService) {
      return {
        alertName: 'ServiceDown',
        description: 'Serviço ou processo não está a correr',
        expr: `up{instance="${instance}"} == 0`,
        forDuration: '2m',
        severity: severity,
        summary: 'Serviço indisponível',
        confidence: 0.5
      };
    }

    // Verificar se é para "parado" ou "a correr demasiado"
    const isDownAlert = promptLower.includes('parar') || promptLower.includes('deixar') || 
                        promptLower.includes('down') || promptLower.includes('stop') ||
                        promptLower.includes('funcionar') || promptLower.includes('offline');

    if (isDownAlert) {
      // Alerta quando o processo para
      return {
        alertName: `${detectedService.name.charAt(0).toUpperCase() + detectedService.name.slice(1)}Down`,
        description: `O ${detectedService.name} deixou de funcionar`,
        expr: `namedprocess_namegroup_num_procs{instance="${processExporterInstance}",groupname="${detectedService.process}"} == 0`,
        forDuration: '1m',
        severity: severity,
        summary: `${detectedService.name} não está a correr`,
        confidence: 0.8,
        requiresProcessExporter: true
      };
    } else {
      // Alerta sobre uso de recursos do processo
      return {
        alertName: `${detectedService.name.charAt(0).toUpperCase() + detectedService.name.slice(1)}HighCpu`,
        description: `O ${detectedService.name} está a usar muitos recursos`,
        expr: `rate(namedprocess_namegroup_cpu_seconds_total{instance="${processExporterInstance}",groupname="${detectedService.process}"}[5m]) * 100 > 80`,
        forDuration: '5m',
        severity: severity,
        summary: `${detectedService.name} com uso elevado de CPU`,
        confidence: 0.7,
        requiresProcessExporter: true
      };
    }
  }

  /**
   * Gerar preview YAML do alerta
   */
  generateYamlPreview(alertConfig) {
    const rule = {
      groups: [{
        name: 'custom_alerts',
        rules: [{
          alert: alertConfig.alertName,
          expr: alertConfig.expr,
          for: alertConfig.forDuration || '5m',
          labels: {
            severity: alertConfig.severity
          },
          annotations: {
            summary: alertConfig.summary || alertConfig.description,
            description: alertConfig.description
          }
        }]
      }]
    };

    return yaml.dump(rule, { indent: 2, lineWidth: -1 });
  }

  /**
   * Criar alerta no sistema
   */
  async createAlert(systemId, alertData, userId) {
    const system = await System.findById(systemId);
    if (!system) {
      throw new Error('Sistema não encontrado');
    }

    const alert = new Alert({
      systemId,
      alertName: alertData.alertName,
      description: alertData.description,
      expr: alertData.expr,
      forDuration: alertData.forDuration || '5m',
      severity: alertData.severity || 'warning',
      annotations: alertData.annotations || {},
      labels: alertData.labels || {},
      originalPrompt: alertData.originalPrompt,
      generatedYaml: alertData.yamlPreview || this.generateYamlPreview(alertData),
      aiMetadata: alertData.aiMetadata || {},
      status: 'pending_approval',
      createdBy: userId
    });

    alert.addHistory('created', userId, 'Alerta criado');
    await alert.save();

    return alert;
  }

  /**
   * Aprovar e activar alerta
   */
  async approveAlert(alertId, userId) {
    const alert = await Alert.findById(alertId);
    if (!alert) {
      throw new Error('Alerta não encontrado');
    }

    await alert.approve(userId);
    
    // Sincronizar com Prometheus
    await this.syncWithPrometheus();

    return alert;
  }

  /**
   * Listar alertas de um sistema
   */
  async getAlertsBySystem(systemId, filters = {}) {
    const query = { systemId };
    
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.severity) {
      query.severity = filters.severity;
    }
    if (filters.enabled !== undefined) {
      query.enabled = filters.enabled;
    }

    return Alert.find(query)
      .populate('createdBy', 'username email')
      .populate('systemId', 'name ip')
      .sort({ createdAt: -1 });
  }

  /**
   * Obter todos os alertas agrupados por sistema
   */
  async getAllAlertsGroupedBySystem(filters = {}) {
    const query = {};
    
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.severity) {
      query.severity = filters.severity;
    }
    if (filters.enabled !== undefined) {
      query.enabled = filters.enabled;
    }

    const alerts = await Alert.find(query)
      .populate('createdBy', 'username email')
      .populate('systemId', 'name ip environment')
      .sort({ createdAt: -1 });

    // Agrupar por sistema
    const grouped = {};
    for (const alert of alerts) {
      const systemId = alert.systemId._id.toString();
      if (!grouped[systemId]) {
        grouped[systemId] = {
          system: {
            _id: alert.systemId._id,
            name: alert.systemId.name,
            ip: alert.systemId.ip,
            environment: alert.systemId.environment || 'unknown'
          },
          alerts: []
        };
      }
      grouped[systemId].alerts.push(alert);
    }

    // Converter para array e ordenar por nome do sistema
    return Object.values(grouped).sort((a, b) => 
      a.system.name.localeCompare(b.system.name)
    );
  }

  /**
   * Obter alertas do Prometheus agrupados por sistema
   * @param {Object} filters - Filtros opcionais { state: 'firing'|'pending'|'all', severity: 'critical'|'warning'|'info' }
   */
  async getFiringAlertsGroupedBySystem(filters = {}) {
    try {
      console.log('🔔 [ALERTS] Fetching alerts from Prometheus...', filters);
      
      // Obter todos os sistemas activos com alertas configurados
      const systems = await System.find({ isActive: true }).select('_id name ip environment');
      console.log(`🔔 [ALERTS] Found ${systems.length} active systems in database`);
      
      // Obter alertas configurados na BD para cada sistema
      const systemsWithAlerts = await Alert.find({ enabled: true, status: 'active' })
        .populate('systemId', 'name ip environment')
        .select('systemId alertName severity status description expr forDuration annotations');
      
      console.log(`🔔 [ALERTS] Found ${systemsWithAlerts.length} configured alerts in database`);
      
      // Obter todos os alertas do Prometheus
      let alertsResult = { success: true, firing: [], pending: [] };
      try {
        alertsResult = await this.getFiringAlerts();
      } catch (promError) {
        console.warn('⚠️ [ALERTS] Could not fetch from Prometheus, showing configured alerts only:', promError.message);
      }
      
      // Combinar firing e pending (os alertas configurados já foram adicionados acima)
      let allAlerts = [];
      if (filters.state === 'firing' || !filters.state || filters.state === 'all') {
        allAlerts = allAlerts.concat(alertsResult.firing || []);
      }
      if (filters.state === 'pending' || !filters.state || filters.state === 'all') {
        allAlerts = allAlerts.concat(alertsResult.pending || []);
      }
      
      // Filtrar por severidade se especificado (aplicar também aos alertas configurados)
      if (filters.severity) {
        allAlerts = allAlerts.filter(a => a.severity === filters.severity);
        // Filtrar também alertas configurados por severidade
        for (const systemId in grouped) {
          grouped[systemId].alerts = grouped[systemId].alerts.filter(
            a => a.severity === filters.severity || a.state === 'configured'
          );
          // Se não há alertas após filtro, remover sistema
          if (grouped[systemId].alerts.length === 0) {
            delete grouped[systemId];
          }
        }
      }
      
      // Se filtro de estado é 'firing' ou 'pending', remover alertas configurados
      if (filters.state === 'firing' || filters.state === 'pending') {
        for (const systemId in grouped) {
          grouped[systemId].alerts = grouped[systemId].alerts.filter(
            a => a.state !== 'configured' && !a.configured
          );
          // Se não há alertas após filtro, remover sistema
          if (grouped[systemId].alerts.length === 0) {
            delete grouped[systemId];
          }
        }
      }
      
      console.log(`🔔 [ALERTS] Found ${allAlerts.length} alerts from Prometheus (firing: ${alertsResult.firing?.length || 0}, pending: ${alertsResult.pending?.length || 0})`);

      // Criar mapa de IP para sistema
      const ipToSystem = {};
      for (const system of systems) {
        ipToSystem[system.ip] = system;
      }

      // Inicializar grupos com todos os sistemas que têm alertas configurados
      const grouped = {};
      const systemsWithConfiguredAlerts = new Set();
      
      // Adicionar alertas configurados aos grupos
      for (const alert of systemsWithAlerts) {
        if (alert.systemId && typeof alert.systemId === 'object') {
          const systemId = alert.systemId._id.toString();
          systemsWithConfiguredAlerts.add(systemId);
          
          if (!grouped[systemId]) {
            grouped[systemId] = {
              system: {
                _id: alert.systemId._id,
                name: alert.systemId.name,
                ip: alert.systemId.ip,
                environment: alert.systemId.environment || 'unknown'
              },
              alerts: []
            };
          }
          
          // Adicionar alerta configurado (se não estiver firing, mostrar como configured)
          // Criar formato compatível com alertas do Prometheus
          const configuredAlert = {
            alertName: alert.alertName,
            severity: alert.severity || 'warning',
            state: 'configured', // Estado especial para alertas configurados mas não firing
            instance: `${alert.systemId.ip}:9100`, // Assumir porta padrão do node_exporter
            summary: alert.annotations?.summary || alert.description || alert.alertName,
            description: alert.description || alert.alertName,
            activeAt: alert.updatedAt || alert.createdAt,
            configured: true, // Flag para identificar alertas configurados
            alertId: alert._id.toString()
          };
          
          grouped[systemId].alerts.push(configuredAlert);
        }
      }
      
      console.log(`🔔 [ALERTS] Found ${systemsWithConfiguredAlerts.size} systems with ${systemsWithAlerts.length} configured alerts`);

      // Agrupar alertas do Prometheus por sistema e combinar com alertas configurados
      for (const alert of allAlerts) {
        // Extrair IP do instance (formato: "IP:PORT")
        const instance = alert.instance || '';
        const ip = instance.split(':')[0];
        
        // Tentar encontrar sistema pelo IP
        const system = ipToSystem[ip];
        
        if (system) {
          const systemId = system._id.toString();
          if (!grouped[systemId]) {
            grouped[systemId] = {
              system: {
                _id: system._id,
                name: system.name,
                ip: system.ip,
                environment: system.environment || 'unknown'
              },
              alerts: []
            };
          }
          
          // Verificar se já existe um alerta configurado com o mesmo nome
          // Se sim, substituir o configured pelo firing/pending
          const existingIndex = grouped[systemId].alerts.findIndex(
            a => a.alertName === alert.alertName && a.configured
          );
          
          if (existingIndex >= 0) {
            // Substituir alerta configurado pelo firing/pending
            grouped[systemId].alerts[existingIndex] = alert;
          } else {
            // Adicionar novo alerta firing/pending
            grouped[systemId].alerts.push(alert);
          }
        } else {
          // System not found in DB, create generic group
          const unknownKey = `unknown_${ip}`;
          if (!grouped[unknownKey]) {
            grouped[unknownKey] = {
              system: {
                _id: null,
                name: `Unknown System (${ip})`,
                ip: ip,
                environment: 'unknown'
              },
              alerts: []
            };
          }
          grouped[unknownKey].alerts.push(alert);
        }
      }

      // Converter para array e ordenar por nome do sistema
      const result = Object.values(grouped).sort((a, b) => 
        a.system.name.localeCompare(b.system.name)
      );
      
      console.log(`✅ [ALERTS] Grouped ${allAlerts.length} Prometheus alerts into ${result.length} system groups`);
      return result;

    } catch (error) {
      console.error('❌ [ALERTS] Error getting firing alerts grouped:', error);
      throw error;
    }
  }

  /**
   * Sincronizar alertas activos com Prometheus
   */
  async syncWithPrometheus() {
    try {
      // Buscar todos os alertas activos
      const activeAlerts = await Alert.find({ enabled: true, status: 'active' })
        .populate('systemId', 'name ip nodeExporter');

      // Agrupar por sistema
      const alertsBySystem = {};
      for (const alert of activeAlerts) {
        const systemId = alert.systemId._id.toString();
        if (!alertsBySystem[systemId]) {
          alertsBySystem[systemId] = {
            system: alert.systemId,
            alerts: []
          };
        }
        alertsBySystem[systemId].alerts.push(alert);
      }

      // Gerar ficheiro de regras
      const rules = {
        groups: []
      };

      for (const [systemId, data] of Object.entries(alertsBySystem)) {
        const group = {
          name: `system_${data.system.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          rules: data.alerts.map(alert => alert.toPrometheusRule())
        };
        rules.groups.push(group);
      }

      // Garantir que o directório existe
      await fs.mkdir(this.rulesDir, { recursive: true });

      // Escrever ficheiro de regras
      const rulesPath = path.join(this.rulesDir, 'custom_alerts.yml');
      await fs.writeFile(rulesPath, yaml.dump(rules, { indent: 2, lineWidth: -1 }));

      console.log(`✅ Ficheiro de regras escrito: ${rulesPath}`);

      // Fazer reload do Prometheus
      await this.reloadPrometheus();

      // Marcar alertas como sincronizados
      for (const alert of activeAlerts) {
        await alert.markSynced(true);
      }

      return { success: true, alertsCount: activeAlerts.length };

    } catch (error) {
      console.error('❌ Erro ao sincronizar com Prometheus:', error);
      throw error;
    }
  }

  /**
   * Fazer reload do Prometheus
   */
  async reloadPrometheus() {
    try {
      const response = await fetch(`${this.prometheusUrl}/-/reload`, {
        method: 'POST'
      });

      if (!response.ok && response.status !== 200) {
        console.warn(`⚠️ Prometheus reload retornou status ${response.status}`);
      }

      console.log('✅ Prometheus reload executado');
      return true;

    } catch (error) {
      console.warn('⚠️ Não foi possível fazer reload do Prometheus:', error.message);
      return false;
    }
  }

  /**
   * Obter métricas do Node Exporter para um sistema
   */
  async getSystemMetrics(systemIp, nodeExporterPort = 9100) {
    try {
      const axios = require('axios');
      const metricsUrl = `http://${systemIp}:${nodeExporterPort}/metrics`;
      
      console.log(`📊 Fetching metrics from ${metricsUrl}`);
      
      const response = await axios.get(metricsUrl, { timeout: 10000 });
      
      if (response.status !== 200) {
        throw new Error(`Node Exporter returned ${response.status}`);
      }

      const metricsText = response.data;
      
      // Parse básico das métricas mais importantes
      const metrics = this.parseNodeExporterMetrics(metricsText);
      
      console.log(`📊 Metrics parsed: CPU cores=${Object.keys(metrics.cpu).length}, Memory=${metrics.memory.usedPercent}%, Uptime=${metrics.uptime}s`);
      
      return {
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error fetching metrics from ${systemIp}:${nodeExporterPort}:`, error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Parse básico de métricas do Node Exporter
   */
  parseNodeExporterMetrics(metricsText) {
    const lines = metricsText.split('\n');
    const metrics = {
      cpu: {},
      memory: {},
      disk: {},
      network: {},
      load: {},
      uptime: null
    };

    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;

      // CPU idle (para calcular uso)
      if (line.includes('node_cpu_seconds_total') && line.includes('mode="idle"')) {
        const match = line.match(/cpu="(\d+)".*} ([\d.]+)/);
        if (match) {
          metrics.cpu[`cpu${match[1]}_idle`] = parseFloat(match[2]);
        }
      }

      // Memória
      if (line.startsWith('node_memory_MemTotal_bytes')) {
        const match = line.match(/([\d.e+]+)$/);
        if (match) metrics.memory.total = parseFloat(match[1]);
      }
      if (line.startsWith('node_memory_MemAvailable_bytes')) {
        const match = line.match(/([\d.e+]+)$/);
        if (match) metrics.memory.available = parseFloat(match[1]);
      }

      // Load
      if (line.startsWith('node_load1 ')) {
        const match = line.match(/([\d.]+)$/);
        if (match) metrics.load.load1 = parseFloat(match[1]);
      }
      if (line.startsWith('node_load5 ')) {
        const match = line.match(/([\d.]+)$/);
        if (match) metrics.load.load5 = parseFloat(match[1]);
      }
      if (line.startsWith('node_load15 ')) {
        const match = line.match(/([\d.]+)$/);
        if (match) metrics.load.load15 = parseFloat(match[1]);
      }

      // Uptime
      if (line.startsWith('node_boot_time_seconds')) {
        const match = line.match(/([\d.e+]+)$/);
        if (match) {
          const bootTime = parseFloat(match[1]);
          metrics.uptime = Math.floor((Date.now() / 1000) - bootTime);
        }
      }
    }

    // Calcular percentagens
    if (metrics.memory.total && metrics.memory.available) {
      metrics.memory.usedPercent = ((1 - (metrics.memory.available / metrics.memory.total)) * 100).toFixed(1);
    }

    return metrics;
  }

  /**
   * Executar query PromQL no Prometheus
   */
  async executePromQLQuery(expr) {
    try {
      const url = `${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(expr)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Prometheus returned ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(data.error || 'Query failed');
      }

      // Processar resultados
      const results = data.data.result || [];
      
      return {
        success: true,
        resultType: data.data.resultType,
        results: results.map(r => ({
          metric: r.metric,
          value: r.value ? r.value[1] : null,
          timestamp: r.value ? new Date(r.value[0] * 1000).toISOString() : null
        })),
        raw: data.data
      };

    } catch (error) {
      console.error('❌ Erro ao executar query PromQL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter alertas que estão a disparar (FIRING) no Prometheus
   * @param {string} systemIp - IP do sistema para filtrar (opcional)
   */
  async getFiringAlerts(systemIp = null) {
    try {
      const axios = require('axios');
      const url = `${this.prometheusUrl}/api/v1/alerts`;
      
      console.log(`🔔 Fetching firing alerts from ${url}`);
      
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.error || 'Failed to get alerts');
      }

      const alerts = response.data.data.alerts || [];
      
      // Filtrar por sistema se IP fornecido
      let filteredAlerts = alerts;
      if (systemIp) {
        filteredAlerts = alerts.filter(alert => {
          const instance = alert.labels?.instance || '';
          return instance.includes(systemIp);
        });
      }

      // Separar por estado
      const firingAlerts = filteredAlerts.filter(a => a.state === 'firing');
      const pendingAlerts = filteredAlerts.filter(a => a.state === 'pending');

      console.log(`🔔 Found ${firingAlerts.length} firing, ${pendingAlerts.length} pending alerts`);

      return {
        success: true,
        firing: firingAlerts.map(a => ({
          alertName: a.labels?.alertname || 'Unknown',
          severity: a.labels?.severity || 'warning',
          state: a.state,
          instance: a.labels?.instance || '',
          summary: a.annotations?.summary || a.annotations?.description || '',
          description: a.annotations?.description || '',
          activeAt: a.activeAt,
          value: a.value,
          labels: a.labels,
          annotations: a.annotations
        })),
        pending: pendingAlerts.map(a => ({
          alertName: a.labels?.alertname || 'Unknown',
          severity: a.labels?.severity || 'warning',
          state: a.state,
          instance: a.labels?.instance || '',
          summary: a.annotations?.summary || a.annotations?.description || '',
          activeAt: a.activeAt,
          labels: a.labels
        })),
        total: filteredAlerts.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erro ao obter alertas firing:', error.message);
      return {
        success: false,
        error: error.message,
        firing: [],
        pending: [],
        total: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Testar um alarme - executar a query e verificar se dispararia
   */
  async testAlert(alertId) {
    try {
      const alert = await Alert.findById(alertId);
      if (!alert) {
        throw new Error('Alerta não encontrado');
      }

      // Executar a expressão do alarme
      const queryResult = await this.executePromQLQuery(alert.expr);
      
      if (!queryResult.success) {
        return {
          success: false,
          alertName: alert.alertName,
          error: queryResult.error,
          queryValid: false
        };
      }

      // Verificar se o alarme dispararia
      const hasResults = queryResult.results.length > 0;
      const wouldFire = hasResults && queryResult.results.some(r => {
        const value = parseFloat(r.value);
        return !isNaN(value) && value > 0;
      });

      // Formatar valores para display
      const formattedResults = queryResult.results.map(r => {
        const value = parseFloat(r.value);
        let displayValue = r.value;
        
        // Formatar percentagens
        if (!isNaN(value)) {
          if (value > 1 && value <= 100) {
            displayValue = `${value.toFixed(2)}%`;
          } else if (value > 1000000000) {
            displayValue = `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
          } else if (value > 1000000) {
            displayValue = `${(value / 1024 / 1024).toFixed(2)} MB`;
          } else {
            displayValue = value.toFixed(2);
          }
        }

        return {
          instance: r.metric?.instance || 'N/A',
          value: displayValue,
          rawValue: r.value,
          timestamp: r.timestamp
        };
      });

      // Determinar mensagem baseada no contexto
      let message;
      if (wouldFire) {
        message = `⚠️ O alarme DISPARARIA agora! ${formattedResults.length} resultado(s) positivo(s).`;
      } else if (hasResults) {
        message = `✅ Alarme OK. Valor actual não excede o threshold.`;
      } else {
        // Sem resultados pode significar:
        // 1. A condição do alarme não é verdadeira (ex: CPU < 90% quando alarme é > 90%) - isto é OK
        // 2. O target está offline
        // Verificar se é um alarme de threshold (contém >, <, ==)
        const isThresholdAlert = /[><=]/.test(alert.expr);
        if (isThresholdAlert) {
          message = `✅ Alarme OK. A condição não está activa (threshold não excedido).`;
        } else {
          message = `ℹ️ Sem dados retornados. Verificar se o target está online.`;
        }
      }

      return {
        success: true,
        alertName: alert.alertName,
        alertSeverity: alert.severity,
        expression: alert.expr,
        queryValid: true,
        wouldFire,
        currentStatus: wouldFire ? 'FIRING' : 'OK',
        results: formattedResults,
        resultCount: queryResult.results.length,
        testedAt: new Date().toISOString(),
        message
      };

    } catch (error) {
      console.error('❌ Erro ao testar alarme:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter estado dos targets do Prometheus
   */
  async getPrometheusTargets() {
    try {
      const response = await fetch(`${this.prometheusUrl}/api/v1/targets`);
      
      if (!response.ok) {
        throw new Error(`Prometheus returned ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error('Prometheus query failed');
      }

      // Filtrar apenas os targets de node_exporter
      const nodeExporterTargets = data.data.activeTargets
        .filter(t => t.labels.job === 'node_exporter')
        .map(t => ({
          instance: t.labels.instance,
          systemName: t.labels.system_name,
          health: t.health,
          lastScrape: t.lastScrape,
          lastError: t.lastError,
          scrapeUrl: t.scrapeUrl
        }));

      return {
        success: true,
        targets: nodeExporterTargets,
        prometheusHealth: 'up'
      };

    } catch (error) {
      console.error('❌ Erro ao obter targets do Prometheus:', error);
      return {
        success: false,
        error: error.message,
        prometheusHealth: 'unknown'
      };
    }
  }

  /**
   * Verificar conectividade com Node Exporter
   */
  async checkNodeExporterConnectivity(systemIp, port = 9100) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://${systemIp}:${port}/metrics`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          reachable: true,
          status: 'up',
          message: 'Node Exporter acessível'
        };
      } else {
        return {
          reachable: false,
          status: 'error',
          message: `Node Exporter retornou status ${response.status}`
        };
      }
    } catch (error) {
      return {
        reachable: false,
        status: 'down',
        message: error.name === 'AbortError' 
          ? 'Timeout - Node Exporter não responde (firewall ou não está a correr)'
          : `Erro de conexão: ${error.message}`
      };
    }
  }

  /**
   * Sincronizar targets (sistemas com Node/Process Exporter) com Prometheus
   */
  async syncTargets() {
    try {
      // Buscar todos os sistemas activos com exporters instalados
      const systems = await System.find({ 
        isActive: true,
        $or: [
          { 'nodeExporter.installed': true },
          { 'processExporter.installed': true }
        ]
      });

      const targets = [];

      // Adicionar targets de Node Exporter
      const nodeExporterTargets = systems
        .filter(s => s.nodeExporter?.installed)
        .map(system => ({
          targets: [`${system.ip}:${system.nodeExporter.port || 9100}`],
          labels: {
            job: 'node_exporter',
            system_id: system._id.toString(),
            system_name: system.name,
            environment: system.environment || 'unknown'
          }
        }));
      targets.push(...nodeExporterTargets);

      // Adicionar targets de Process Exporter
      const processExporterTargets = systems
        .filter(s => s.processExporter?.installed)
        .map(system => ({
          targets: [`${system.ip}:${system.processExporter.port || 9256}`],
          labels: {
            job: 'process_exporter',
            system_id: system._id.toString(),
            system_name: system.name,
            environment: system.environment || 'unknown'
          }
        }));
      targets.push(...processExporterTargets);

      // Escrever ficheiro de targets
      const targetsDir = process.env.PROMETHEUS_DIR || path.join(__dirname, '../../prometheus');
      await fs.mkdir(targetsDir, { recursive: true });
      
      const targetsPath = path.join(targetsDir, 'targets.json');
      await fs.writeFile(targetsPath, JSON.stringify(targets, null, 2));

      console.log(`✅ Targets sincronizados: ${nodeExporterTargets.length} node_exporter, ${processExporterTargets.length} process_exporter`);

      return { 
        success: true, 
        nodeExporterCount: nodeExporterTargets.length,
        processExporterCount: processExporterTargets.length,
        totalCount: targets.length
      };

    } catch (error) {
      console.error('❌ Erro ao sincronizar targets:', error);
      throw error;
    }
  }
}

module.exports = new AlertService();

