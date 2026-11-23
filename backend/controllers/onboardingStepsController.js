const connectivityService = require('../services/connectivityService');
const sshService = require('../services/sshService');
const { detectOS } = require('../utils/osDetector');
const OnboardingProcess = require('../models/OnboardingProcess');
const System = require('../models/System');
const onboardingPersistenceService = require('../services/onboardingPersistenceService');

/**
 * PASSO 1: TESTE DE CONECTIVIDADE
 * Endpoint: POST /onboarding-steps/connectivity
 */
const testConnectivity = async (req, res) => {
  try {
    const { host, port, options = {} } = req.body;

    if (!host || !port) {
      return res.status(400).json({
        success: false,
        message: 'Host e porta são obrigatórios',
        errors: {
          host: !host ? 'Host é obrigatório' : null,
          port: !port ? 'Porta é obrigatória' : null
        }
      });
    }

    // Executar teste de conectividade
    const connectivityResult = await connectivityService.testConnectivity(
      host, 
      parseInt(port), 
      {
        pingCount: options.pingCount || 4,
        pingTimeout: options.pingTimeout || 5000,
        portTimeout: options.portTimeout || 5000,
        includeTraceroute: options.includeTraceroute || false
      }
    );

    // Determinar se o teste passou
    const stepStatus = connectivityResult.overall.success ? 'success' : 'failed';
    const stepOutput = JSON.stringify(connectivityResult, null, 2);
    const stepError = connectivityResult.overall.success ? '' : 
      `Ping: ${connectivityResult.ping.success ? 'OK' : 'FAILED'}, Porta: ${connectivityResult.port.success ? 'OK' : 'FAILED'}`;

    res.json({
      success: true,
      message: `Teste de conectividade ${stepStatus === 'success' ? 'passou' : 'falhou'}`,
      data: {
        step: {
          name: 'Connectivity Test',
          status: stepStatus,
          command: `ping ${host} && test port ${port}`,
          output: stepOutput,
          error: stepError,
          duration: connectivityResult.overall.duration,
          timestamp: connectivityResult.timestamp
        },
        details: connectivityResult
      }
    });

  } catch (error) {
    console.error('Erro no teste de conectividade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no teste de conectividade',
      error: error.message
    });
  }
};

/**
 * PASSO 2: DETECÇÃO DE OS
 * Endpoint: POST /onboarding-steps/os-detection
 */
const detectOperatingSystem = async (req, res) => {
  try {
    const { systemId, credentials } = req.body;

    if (!systemId || !credentials) {
      return res.status(400).json({
        success: false,
        message: 'SystemId e credenciais são obrigatórias'
      });
    }

    // Buscar sistema
    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    let connectionId;
    const startTime = Date.now();

    try {
      // Conectar via SSH
      const sshConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey
      };

      const connection = await sshService.createConnection(sshConfig);
      connectionId = connection.connectionId;

      // Detectar OS
      const osInfo = await detectOS(sshService, connectionId);
      const duration = Date.now() - startTime;

      // Fechar conexão
      await sshService.closeConnection(connectionId);

      // 💾 PERSISTIR DADOS NA BASE DE DADOS
      const userId = req.user?.userId || req.user?._id;
      
      try {
        // Guardar informações do OS detectado
        await onboardingPersistenceService.updateOSInfo(systemId, userId, osInfo);
        
        // Guardar step do onboarding
        if (osInfo.detectionMethod !== 'failed') {
          await onboardingPersistenceService.completeStep(
            systemId, 
            userId, 
            'OS Detection', 
            'cat /etc/os-release && uname -a',
            JSON.stringify(osInfo, null, 2),
            duration
          );
          console.log('💾 Dados do OS salvos na base de dados');
        } else {
          await onboardingPersistenceService.failStep(
            systemId,
            userId,
            'OS Detection',
            'cat /etc/os-release && uname -a',
            'Falha na detecção do sistema operativo',
            duration
          );
          console.log('⚠️ Falha na detecção do OS registada na base de dados');
        }
      } catch (dbError) {
        console.error('❌ Erro ao guardar dados do OS na base de dados:', dbError.message);
      }

      res.json({
        success: true,
        message: 'OS detectado com sucesso',
        data: {
          step: {
            name: 'OS Detection',
            status: osInfo.detectionMethod !== 'failed' ? 'success' : 'failed',
            command: 'cat /etc/os-release && uname -a',
            output: JSON.stringify(osInfo, null, 2),
            error: osInfo.detectionMethod === 'failed' ? 'Falha na detecção do OS' : '',
            duration,
            timestamp: new Date().toISOString()
          },
          osInfo
        }
      });

    } catch (sshError) {
      if (connectionId) {
        await sshService.closeConnection(connectionId);
      }

      const duration = Date.now() - startTime;
      res.status(400).json({
        success: false,
        message: 'Falha na detecção de OS via SSH',
        data: {
          step: {
            name: 'OS Detection',
            status: 'failed',
            command: 'cat /etc/os-release && uname -a',
            output: '',
            error: sshError.message,
            duration,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('Erro na detecção de OS:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na detecção de OS',
      error: error.message
    });
  }
};

/**
 * PASSO 3: INFORMAÇÕES DO SISTEMA
 * Endpoint: POST /onboarding-steps/system-info
 */
const getSystemInformation = async (req, res) => {
  try {
    const { systemId, credentials, commands = [] } = req.body;

    if (!systemId || !credentials) {
      return res.status(400).json({
        success: false,
        message: 'SystemId e credenciais são obrigatórias'
      });
    }

    // Comandos padrão se não especificados
    const defaultCommands = [
      'uname -a',
      'free -h',
      'df -h',
      'uptime',
      'whoami',
      'id'
    ];

    const commandsToRun = commands.length > 0 ? commands : defaultCommands;
    const system = await System.findById(systemId);
    
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    let connectionId;
    const startTime = Date.now();
    const results = [];

    try {
      // Conectar via SSH
      const sshConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey
      };

      const connection = await sshService.createConnection(sshConfig);
      connectionId = connection.connectionId;

      // Executar comandos
      for (const command of commandsToRun) {
        try {
          const result = await sshService.executeCommand(connectionId, command, {
            timeout: 10000
          });
          
          results.push({
            command,
            success: true,
            output: result.stdout,
            error: result.stderr,
            exitCode: result.code
          });

        } catch (cmdError) {
          results.push({
            command,
            success: false,
            output: '',
            error: cmdError.message,
            exitCode: 1
          });
        }
      }

      await sshService.closeConnection(connectionId);
      const duration = Date.now() - startTime;

      // Verificar se pelo menos um comando funcionou
      const successfulCommands = results.filter(r => r.success).length;
      const stepStatus = successfulCommands > 0 ? 'success' : 'failed';

      // 💾 PERSISTIR DADOS NA BASE DE DADOS
      const userId = req.user?.userId || req.user?._id;
      
      try {
        const output = JSON.stringify(results, null, 2);
        
        if (stepStatus === 'success') {
          await onboardingPersistenceService.completeStep(
            systemId,
            userId,
            'System Information',
            commandsToRun.join(' && '),
            output,
            duration
          );
          console.log('💾 Informações do sistema salvas na base de dados');
        } else {
          await onboardingPersistenceService.failStep(
            systemId,
            userId,
            'System Information',
            commandsToRun.join(' && '),
            'Nenhum comando executado com sucesso',
            duration
          );
          console.log('⚠️ Falha nas informações do sistema registada na base de dados');
        }
      } catch (dbError) {
        console.error('❌ Erro ao guardar informações do sistema na base de dados:', dbError.message);
      }

      res.json({
        success: true,
        message: `Informações do sistema obtidas: ${successfulCommands}/${results.length} comandos executados`,
        data: {
          step: {
            name: 'System Information',
            status: stepStatus,
            command: commandsToRun.join(' && '),
            output: JSON.stringify(results, null, 2),
            error: stepStatus === 'failed' ? 'Nenhum comando executado com sucesso' : '',
            duration,
            timestamp: new Date().toISOString()
          },
          commandResults: results,
          summary: {
            totalCommands: results.length,
            successfulCommands,
            failedCommands: results.length - successfulCommands
          }
        }
      });

    } catch (sshError) {
      if (connectionId) {
        await sshService.closeConnection(connectionId);
      }

      const duration = Date.now() - startTime;
      res.status(400).json({
        success: false,
        message: 'Falha na obtenção de informações do sistema',
        data: {
          step: {
            name: 'System Information',
            status: 'failed',
            command: commandsToRun.join(' && '),
            output: '',
            error: sshError.message,
            duration,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('Erro na obtenção de informações do sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na obtenção de informações do sistema',
      error: error.message
    });
  }
};

/**
 * PASSO 4: VERIFICAÇÃO DE RECURSOS
 * Endpoint: POST /onboarding-steps/resource-check
 */
const checkSystemResources = async (req, res) => {
  try {
    const { systemId, credentials, thresholds = {} } = req.body;

    if (!systemId || !credentials) {
      return res.status(400).json({
        success: false,
        message: 'SystemId e credenciais são obrigatórias'
      });
    }

    // Thresholds padrão
    const defaultThresholds = {
      minMemoryMB: 512,
      maxCpuLoad: 80,
      minDiskSpaceGB: 1,
      maxDiskUsage: 90
    };

    const finalThresholds = { ...defaultThresholds, ...thresholds };
    const system = await System.findById(systemId);
    
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    let connectionId;
    const startTime = Date.now();
    const checks = [];

    try {
      // Conectar via SSH
      const sshConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey
      };

      const connection = await sshService.createConnection(sshConfig);
      connectionId = connection.connectionId;

      // Check 1: Memória
      try {
        const memResult = await sshService.executeCommand(connectionId, 'free -m', { timeout: 5000 });
        const memMatch = memResult.stdout.match(/Mem:\s+(\d+)\s+(\d+)\s+(\d+)/);
        
        if (memMatch) {
          const totalMem = parseInt(memMatch[1]);
          const usedMem = parseInt(memMatch[2]);
          const freeMem = parseInt(memMatch[3]);
          
          checks.push({
            name: 'Memory Check',
            success: totalMem >= finalThresholds.minMemoryMB,
            details: {
              totalMB: totalMem,
              usedMB: usedMem,
              freeMB: freeMem,
              threshold: finalThresholds.minMemoryMB,
            },
            output: memResult.stdout
          });
        }
      } catch (error) {
        checks.push({
          name: 'Memory Check',
          success: false,
          error: error.message,
          output: ''
        });
      }

      // Check 2: Disco
      try {
        const diskResult = await sshService.executeCommand(connectionId, 'df -h /', { timeout: 5000 });
        const diskMatch = diskResult.stdout.match(/(\d+)%/);
        
        if (diskMatch) {
          const diskUsage = parseInt(diskMatch[1]);
          
          checks.push({
            name: 'Disk Check',
            success: diskUsage <= finalThresholds.maxDiskUsage,
            details: {
              usagePercent: diskUsage,
              threshold: finalThresholds.maxDiskUsage
            },
            output: diskResult.stdout
          });
        }
      } catch (error) {
        checks.push({
          name: 'Disk Check',
          success: false,
          error: error.message,
          output: ''
        });
      }

      // Check 3: Load Average
      try {
        const loadResult = await sshService.executeCommand(connectionId, 'uptime', { timeout: 5000 });
        const loadMatch = loadResult.stdout.match(/load average: ([\d.]+)/);
        
        if (loadMatch) {
          const loadAvg = parseFloat(loadMatch[1]);
          
          checks.push({
            name: 'Load Average Check',
            success: loadAvg <= (finalThresholds.maxCpuLoad / 100),
            details: {
              loadAverage: loadAvg,
              threshold: finalThresholds.maxCpuLoad / 100
            },
            output: loadResult.stdout
          });
        }
      } catch (error) {
        checks.push({
          name: 'Load Average Check',
          success: false,
          error: error.message,
          output: ''
        });
      }

      await sshService.closeConnection(connectionId);
      const duration = Date.now() - startTime;

      // Verificar se todos os checks passaram
      const successfulChecks = checks.filter(c => c.success).length;
      const stepStatus = successfulChecks === checks.length ? 'success' : 'failed';

      // 💾 PERSISTIR DADOS NA BASE DE DADOS
      const userId = req.user?.userId || req.user?._id;
      
      try {
        const output = JSON.stringify(checks, null, 2);
        
        if (stepStatus === 'success') {
          await onboardingPersistenceService.completeStep(
            systemId,
            userId,
            'Resource Check',
            'free -m && df -h && uptime',
            output,
            duration
          );
          console.log('💾 Verificação de recursos salva na base de dados');
        } else {
          await onboardingPersistenceService.failStep(
            systemId,
            userId,
            'Resource Check',
            'free -m && df -h && uptime',
            'Alguns recursos não atendem aos requisitos',
            duration
          );
          console.log('⚠️ Falha na verificação de recursos registada na base de dados');
        }
      } catch (dbError) {
        console.error('❌ Erro ao guardar verificação de recursos na base de dados:', dbError.message);
      }

      res.json({
        success: true,
        message: `Verificação de recursos: ${successfulChecks}/${checks.length} checks passaram`,
        data: {
          step: {
            name: 'Resource Check',
            status: stepStatus,
            command: 'free -m && df -h && uptime',
            output: JSON.stringify(checks, null, 2),
            error: stepStatus === 'failed' ? 'Alguns recursos não atendem aos requisitos' : '',
            duration,
            timestamp: new Date().toISOString()
          },
          checks,
          thresholds: finalThresholds,
          summary: {
            totalChecks: checks.length,
            passedChecks: successfulChecks,
            failedChecks: checks.length - successfulChecks
          }
        }
      });

    } catch (sshError) {
      if (connectionId) {
        await sshService.closeConnection(connectionId);
      }

      const duration = Date.now() - startTime;
      res.status(400).json({
        success: false,
        message: 'Falha na verificação de recursos',
        data: {
          step: {
            name: 'Resource Check',
            status: 'failed',
            command: 'free -m && df -h && uptime',
            output: '',
            error: sshError.message,
            duration,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('Erro na verificação de recursos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na verificação de recursos',
      error: error.message
    });
  }
};

/**
 * PASSO 5: COMANDO CUSTOMIZADO
 * Endpoint: POST /onboarding-steps/custom-command
 */
const executeCustomCommand = async (req, res) => {
  try {
    const { systemId, credentials, command, options = {} } = req.body;

    if (!systemId || !credentials || !command) {
      return res.status(400).json({
        success: false,
        message: 'SystemId, credenciais e comando são obrigatórios'
      });
    }

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    let connectionId;
    const startTime = Date.now();

    try {
      // Conectar via SSH
      const sshConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey
      };

      const connection = await sshService.createConnection(sshConfig);
      connectionId = connection.connectionId;

      // Executar comando
      const result = await sshService.executeCommand(connectionId, command, {
        timeout: options.timeout || 30000
      });

      await sshService.closeConnection(connectionId);
      const duration = Date.now() - startTime;

      const stepStatus = result.code === 0 ? 'success' : 'failed';

      res.json({
        success: true,
        message: `Comando ${stepStatus === 'success' ? 'executado com sucesso' : 'falhou'}`,
        data: {
          step: {
            name: 'Custom Command',
            status: stepStatus,
            command: command,
            output: result.stdout,
            error: result.stderr,
            exitCode: result.exitCode,
            duration,
            timestamp: new Date().toISOString()
          }
        }
      });

    } catch (sshError) {
      if (connectionId) {
        await sshService.closeConnection(connectionId);
      }

      const duration = Date.now() - startTime;
      res.status(400).json({
        success: false,
        message: 'Falha na execução do comando',
        data: {
          step: {
            name: 'Custom Command',
            status: 'failed',
            command: command,
            output: '',
            error: sshError.message,
            duration,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('Erro na execução de comando customizado:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na execução do comando',
      error: error.message
    });
  }
};

/**
 * ENDPOINT PARA LISTAR PASSOS DISPONÍVEIS
 * Endpoint: GET /onboarding-steps/available
 */
const getAvailableSteps = async (req, res) => {
  const availableSteps = [
    {
      id: 'connectivity',
      name: 'Connectivity Test',
      description: 'Testa conectividade de rede com ping e verificação de porta',
      endpoint: 'POST /onboarding-steps/connectivity',
      required: true,
      order: 1,
      commands: ['ping -c 4 {host}', 'telnet {host} {port}'],
      parameters: [
        { name: 'host', type: 'string', required: true, description: 'IP ou hostname do sistema' },
        { name: 'port', type: 'number', required: true, description: 'Porta SSH (geralmente 22)' },
        { name: 'options.pingCount', type: 'number', required: false, default: 4 },
        { name: 'options.pingTimeout', type: 'number', required: false, default: 5000 },
        { name: 'options.portTimeout', type: 'number', required: false, default: 5000 },
        { name: 'options.includeTraceroute', type: 'boolean', required: false, default: false }
      ]
    },
    {
      id: 'os-detection',
      name: 'OS Detection',
      description: 'Detecta o sistema operacional via SSH',
      endpoint: 'POST /onboarding-steps/os-detection',
      required: true,
      order: 2,
      commands: ['cat /etc/os-release', 'uname -a', 'uname -m', 'uname -r'],
      parameters: [
        { name: 'systemId', type: 'string', required: true },
        { name: 'credentials', type: 'object', required: true }
      ]
    },
    {
      id: 'system-info',
      name: 'System Information',
      description: 'Coleta informações básicas do sistema (incluindo privilégios)',
      endpoint: 'POST /onboarding-steps/system-info',
      required: true,
      order: 3,
      commands: ['uname -a', 'free -h', 'df -h', 'uptime', 'whoami', 'id', 'sudo -l', 'groups'],
      parameters: [
        { name: 'systemId', type: 'string', required: true },
        { name: 'credentials', type: 'object', required: true },
        { name: 'commands', type: 'array', required: false }
      ]
    },
    {
      id: 'process-analysis',
      name: 'Process Analysis',
      description: '✅ Analisa processos em execução no sistema',
      endpoint: 'POST /onboarding-steps/process-analysis',
      required: false,
      order: 4,
      commands: ['ps aux --sort=-%mem | head -15', 'ps aux --sort=-%cpu | head -15', 'ps aux | wc -l', 'ps -u {user} -o pid,ppid,%cpu,%mem,command --sort=-%mem'],
      parameters: [
        { name: 'systemId', type: 'string', required: true },
        { name: 'credentials', type: 'object', required: true },
        { name: 'options.includeDetails', type: 'boolean', required: false, default: true },
        { name: 'options.filterByUser', type: 'boolean', required: false, default: false },
        { name: 'options.topProcessCount', type: 'number', required: false, default: 15 }
      ]
    },
    {
      id: 'service-analysis',
      name: 'Service Analysis',
      description: '✅ Analisa serviços em execução no sistema',
      endpoint: 'POST /onboarding-steps/service-analysis',
      required: false,
      order: 5,
      commands: ['systemctl list-units --type=service --state=running --no-pager', 'systemctl list-units --type=service --state=failed --no-pager', 'service --status-all', 'ss -tlnp | grep -E "(22|80|443|3306|5432)"'],
      parameters: [
        { name: 'systemId', type: 'string', required: true },
        { name: 'credentials', type: 'object', required: true },
        { name: 'options.includeInactive', type: 'boolean', required: false, default: false },
        { name: 'options.serviceManager', type: 'string', required: false, default: 'auto', enum: ['auto', 'systemd', 'sysv'] }
      ]
    },
    {
      id: 'open-ports-analysis',
      name: 'Open Ports Analysis',
      description: '✅ Analisa portas abertas no sistema',
      endpoint: 'POST /onboarding-steps/open-ports-analysis',
      required: false,
      order: 6,
      commands: ['ss -tlnp | grep LISTEN', 'ss -ulnp', 'ss -tnp | grep ESTAB', 'ss -s', 'netstat -tulnp', 'lsof -i'],
      parameters: [
        { name: 'systemId', type: 'string', required: true },
        { name: 'credentials', type: 'object', required: true },
        { name: 'options.includeTCP', type: 'boolean', required: false, default: true },
        { name: 'options.includeUDP', type: 'boolean', required: false, default: true },
        { name: 'options.includeListening', type: 'boolean', required: false, default: true },
        { name: 'options.includeEstablished', type: 'boolean', required: false, default: false }
      ]
    },
    {
      id: 'resource-check',
      name: 'Resource Check',
      description: 'Verifica recursos do sistema (memória, disco, CPU)',
      endpoint: 'POST /onboarding-steps/resource-check',
      required: false,
      order: 7,
      commands: ['free -m', 'df -h /', 'uptime'],
      parameters: [
        { name: 'systemId', type: 'string', required: true },
        { name: 'credentials', type: 'object', required: true },
        { name: 'thresholds', type: 'object', required: false }
      ]
    },
    {
      id: 'custom-command',
      name: 'Custom Command',
      description: 'Executa um comando personalizado',
      endpoint: 'POST /onboarding-steps/custom-command',
      required: false,
      order: 99,
      commands: ['{custom_command}'],
      parameters: [
        { name: 'systemId', type: 'string', required: true },
        { name: 'credentials', type: 'object', required: true },
        { name: 'command', type: 'string', required: true },
        { name: 'options.timeout', type: 'number', required: false, default: 30000 }
      ]
    }
  ];

  res.json({
    success: true,
    message: 'Passos disponíveis listados com sucesso',
    data: {
      steps: availableSteps,
      totalSteps: availableSteps.length,
      requiredSteps: availableSteps.filter(s => s.required).length,
      optionalSteps: availableSteps.filter(s => !s.required).length
    }
  });
};

/**
 * PASSO 3: ANÁLISE DE PROCESSOS
 * Endpoint: POST /onboarding-steps/process-analysis
 */
const analyzeRunningProcesses = async (req, res) => {
  try {
    const { systemId, credentials, options = {} } = req.body;
    const { includeDetails = true, filterByUser = false, topProcessCount = 15 } = options;

    if (!systemId || !credentials) {
      return res.status(400).json({
        success: false,
        message: 'SystemId e credenciais são obrigatórias'
      });
    }

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    let connectionId;
    const startTime = Date.now();

    try {
      // Conectar via SSH
      const sshConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        privateKeyPath: credentials.privateKeyPath
      };

      const connection = await sshService.createConnection(sshConfig);
      connectionId = connection.connectionId;

      const processAnalysis = [];

      // Análise 1: Top processos por uso de memória
      try {
        const memProcessesCmd = `ps aux --sort=-%mem | head -${topProcessCount}`;
        const memResult = await sshService.executeCommand(connectionId, memProcessesCmd, { timeout: 10000 });
        
        processAnalysis.push({
          type: 'memory_usage',
          command: memProcessesCmd,
          success: memResult.success,
          output: memResult.stdout || memResult.output || '',
          error: memResult.stderr || memResult.error || '',
          rawOutput: memResult.stdout || memResult.output || '', // Output literal do comando
          description: 'Processos ordenados por uso de memória'
        });
      } catch (error) {
        processAnalysis.push({
          type: 'memory_usage',
          command: 'ps aux --sort=-%mem',
          success: false,
          output: '',
          error: error.message,
          rawOutput: '',
          description: 'Processos ordenados por uso de memória'
        });
      }

      // Análise 2: Top processos por uso de CPU
      try {
        const cpuProcessesCmd = `ps aux --sort=-%cpu | head -${topProcessCount}`;
        const cpuResult = await sshService.executeCommand(connectionId, cpuProcessesCmd, { timeout: 10000 });
        
        processAnalysis.push({
          type: 'cpu_usage',
          command: cpuProcessesCmd,
          success: cpuResult.success,
          output: cpuResult.stdout || cpuResult.output || '',
          error: cpuResult.stderr || cpuResult.error || '',
          rawOutput: cpuResult.stdout || cpuResult.output || '', // Output literal do comando
          description: 'Processos ordenados por uso de CPU'
        });
      } catch (error) {
        processAnalysis.push({
          type: 'cpu_usage',
          command: 'ps aux --sort=-%cpu',
          success: false,
          output: '',
          error: error.message,
          rawOutput: '',
          description: 'Processos ordenados por uso de CPU'
        });
      }

      // Análise 3: Contagem total de processos
      try {
        const countCmd = filterByUser ? `ps -u ${credentials.username} | wc -l` : 'ps aux | wc -l';
        const countResult = await sshService.executeCommand(connectionId, countCmd, { timeout: 5000 });
        const rawOutput = countResult.stdout || countResult.output || '';
        const processCount = rawOutput ? parseInt(rawOutput.trim()) - 1 : 0; // Subtrair header
        
        processAnalysis.push({
          type: 'process_count',
          command: countCmd,
          success: countResult.success,
          output: `Total de processos: ${processCount}`,
          error: countResult.stderr || countResult.error || '',
          rawOutput: rawOutput, // Output literal do comando
          processCount: processCount,
          description: 'Contagem total de processos'
        });
      } catch (error) {
        processAnalysis.push({
          type: 'process_count',
          command: 'ps aux | wc -l',
          success: false,
          output: '',
          error: error.message,
          rawOutput: '',
          processCount: 0,
          description: 'Contagem total de processos'
        });
      }

      // Análise 4: Processos do usuário atual (se solicitado)
      if (includeDetails) {
        try {
          const userProcessesCmd = `ps -u ${credentials.username} -o pid,ppid,%cpu,%mem,command --sort=-%mem`;
          const userResult = await sshService.executeCommand(connectionId, userProcessesCmd, { timeout: 8000 });
          
          processAnalysis.push({
            type: 'user_processes',
            command: userProcessesCmd,
            success: userResult.success,
            output: userResult.stdout || userResult.output || '',
            error: userResult.stderr || userResult.error || '',
            rawOutput: userResult.stdout || userResult.output || '', // Output literal do comando
            description: `Processos do usuário ${credentials.username}`
          });
        } catch (error) {
          processAnalysis.push({
            type: 'user_processes',
            command: `ps -u ${credentials.username}`,
            success: false,
            output: '',
            error: error.message,
            rawOutput: '',
            description: `Processos do usuário ${credentials.username}`
          });
        }

        // Análise 5: Processos críticos do sistema
        try {
          const systemProcessesCmd = 'ps aux | grep -E "(systemd|init|kernel|ssh|network)" | grep -v grep | head -10';
          const systemResult = await sshService.executeCommand(connectionId, systemProcessesCmd, { timeout: 6000 });
          
          processAnalysis.push({
            type: 'system_processes',
            command: systemProcessesCmd,
            success: systemResult.success,
            output: systemResult.stdout || systemResult.output || '',
            error: systemResult.stderr || systemResult.error || '',
            rawOutput: systemResult.stdout || systemResult.output || '', // Output literal do comando
            description: 'Processos críticos do sistema'
          });
        } catch (error) {
          processAnalysis.push({
            type: 'system_processes',
            command: 'ps aux | grep systemd',
            success: false,
            output: '',
            error: error.message,
            rawOutput: '',
            description: 'Processos críticos do sistema'
          });
        }
      }

      await sshService.closeConnection(connectionId);
      const duration = Date.now() - startTime;

      const successfulAnalyses = processAnalysis.filter(a => a.success).length;
      const stepStatus = successfulAnalyses > 0 ? 'success' : 'failed';

      // 💾 PERSISTIR DADOS NA BASE DE DADOS
      const userId = req.user?.userId || req.user?._id;
      
      try {
        const output = JSON.stringify(processAnalysis, null, 2);
        
        if (stepStatus === 'success') {
          await onboardingPersistenceService.completeStep(
            systemId,
            userId,
            'Process Analysis',
            'ps aux --sort=-%mem && ps aux --sort=-%cpu',
            output,
            duration
          );
          console.log('💾 Análise de processos salva na base de dados');
        } else {
          await onboardingPersistenceService.failStep(
            systemId,
            userId,
            'Process Analysis',
            'ps aux --sort=-%mem && ps aux --sort=-%cpu',
            'Falha na análise de processos',
            duration
          );
        }
      } catch (dbError) {
        console.error('❌ Erro ao guardar análise de processos na base de dados:', dbError.message);
      }

      res.json({
        success: true,
        message: `Análise de processos: ${successfulAnalyses}/${processAnalysis.length} análises bem-sucedidas`,
        data: {
          step: {
            name: 'Process Analysis',
            status: stepStatus,
            command: 'process_analysis',
            output: `Analyzed ${processAnalysis.length} process categories`,
            error: stepStatus === 'failed' ? 'Falha na análise de processos' : '',
            duration,
            timestamp: new Date().toISOString()
          },
          processAnalysis,
          summary: {
            totalAnalyses: processAnalysis.length,
            successfulAnalyses,
            failedAnalyses: processAnalysis.length - successfulAnalyses,
            includeDetails,
            filterByUser
          }
        }
      });

    } catch (sshError) {
      if (connectionId) {
        await sshService.closeConnection(connectionId);
      }

      const duration = Date.now() - startTime;
      res.status(400).json({
        success: false,
        message: 'Falha na análise de processos via SSH',
        data: {
          step: {
            name: 'Process Analysis',
            status: 'failed',
            command: 'process_analysis',
            output: '',
            error: sshError.message,
            duration,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('Erro na análise de processos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na análise de processos',
      error: error.message
    });
  }
};

/**
 * PASSO 4: ANÁLISE DE SERVIÇOS
 * Endpoint: POST /onboarding-steps/service-analysis
 */
const analyzeRunningServices = async (req, res) => {
  try {
    const { systemId, credentials, options = {} } = req.body;
    const { includeInactive = false, serviceManager = 'auto' } = options;

    if (!systemId || !credentials) {
      return res.status(400).json({
        success: false,
        message: 'SystemId e credenciais são obrigatórias'
      });
    }

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'  
      });
    }

    let connectionId;
    const startTime = Date.now();

    try {
      // Conectar via SSH
      const sshConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        privateKeyPath: credentials.privateKeyPath
      };

      const connection = await sshService.createConnection(sshConfig);
      connectionId = connection.connectionId;

      const serviceAnalysis = [];

      // Detectar o service manager disponível
      let detectedServiceManager = serviceManager;
      if (serviceManager === 'auto') {
        try {
          const systemdCheck = await sshService.executeCommand(connectionId, 'which systemctl', { timeout: 3000 });
          detectedServiceManager = systemdCheck.success ? 'systemd' : 'sysv';
        } catch (error) {
          detectedServiceManager = 'sysv';
        }
      }

      // Análise 1: Serviços ativos
      try {
        let activeServicesCmd;
        if (detectedServiceManager === 'systemd') {
          activeServicesCmd = includeInactive 
            ? 'systemctl list-units --type=service --no-pager | head -20'
            : 'systemctl list-units --type=service --state=running --no-pager | head -15';
        } else {
          activeServicesCmd = 'service --status-all | grep "\\[ + \\]" | head -15';
        }
        
        const activeResult = await sshService.executeCommand(connectionId, activeServicesCmd, { timeout: 12000 });
        
        serviceAnalysis.push({
          type: 'active_services',
          command: activeServicesCmd,
          success: activeResult.success,
          output: activeResult.stdout || activeResult.output || '',
          error: activeResult.stderr || activeResult.error || '',
          rawOutput: activeResult.stdout || activeResult.output || '', // Output literal do comando
          serviceManager: detectedServiceManager,
          description: 'Serviços ativos no sistema'
        });
      } catch (error) {
        serviceAnalysis.push({
          type: 'active_services',
          command: 'systemctl list-units --type=service',
          success: false,
          output: '',
          error: error.message,
          rawOutput: '',
          serviceManager: detectedServiceManager,
          description: 'Serviços ativos no sistema'
        });
      }

      // Análise 2: Serviços falhos (só para systemd)
      if (detectedServiceManager === 'systemd') {
        try {
          const failedServicesCmd = 'systemctl list-units --type=service --state=failed --no-pager';
          const failedResult = await sshService.executeCommand(connectionId, failedServicesCmd, { timeout: 8000 });
          const rawOutput = failedResult.stdout || failedResult.output || '';
          
          serviceAnalysis.push({
            type: 'failed_services',
            command: failedServicesCmd,
            success: failedResult.success,
            output: rawOutput || 'Nenhum serviço falhou',
            error: failedResult.stderr || failedResult.error || '',
            rawOutput: rawOutput, // Output literal do comando
            serviceManager: detectedServiceManager,
            description: 'Serviços que falharam'
          });
        } catch (error) {
          serviceAnalysis.push({
            type: 'failed_services',
            command: 'systemctl list-units --state=failed',
            success: false,
            output: '',
            error: error.message,
            rawOutput: '',
            serviceManager: detectedServiceManager,
            description: 'Serviços que falharam'
          });
        }
      }

      // Análise 3: Serviços de rede críticos
      try {
        const networkServicesCmd = 'ss -tlnp | grep -E "(22|80|443|3306|5432|6379|27017)" | head -10';
        const networkResult = await sshService.executeCommand(connectionId, networkServicesCmd, { timeout: 8000 });
        const rawOutput = networkResult.stdout || networkResult.output || '';
        
        serviceAnalysis.push({
          type: 'network_services',
          command: networkServicesCmd,
          success: networkResult.success,
          output: rawOutput || 'Nenhum serviço de rede crítico detectado',
          error: networkResult.stderr || networkResult.error || '',
          rawOutput: rawOutput, // Output literal do comando
          description: 'Serviços de rede críticos'
        });
      } catch (error) {
        serviceAnalysis.push({
          type: 'network_services',
          command: 'ss -tlnp',
          success: false,
          output: '',
          error: error.message,
          rawOutput: '',
          description: 'Serviços de rede críticos'
        });
      }

      // Análise 4: Contagem de serviços
      try {
        let countCmd;
        if (detectedServiceManager === 'systemd') {
          countCmd = 'systemctl list-units --type=service --no-legend | wc -l';
        } else {
          countCmd = 'service --status-all 2>/dev/null | wc -l';
        }
        
        const countResult = await sshService.executeCommand(connectionId, countCmd, { timeout: 5000 });
        const rawOutput = countResult.stdout || countResult.output || '';
        const serviceCount = rawOutput ? parseInt(rawOutput.trim()) : 0;
        
        serviceAnalysis.push({
          type: 'service_count', 
          command: countCmd,
          success: countResult.success,
          output: `Total de serviços: ${serviceCount}`,
          error: countResult.stderr || countResult.error || '',
          rawOutput: rawOutput, // Output literal do comando
          serviceCount: serviceCount,
          serviceManager: detectedServiceManager,
          description: 'Contagem total de serviços'
        });
      } catch (error) {
        serviceAnalysis.push({
          type: 'service_count',
          command: 'service count',
          success: false,
          output: '',
          error: error.message,
          rawOutput: '',
          serviceCount: 0,
          serviceManager: detectedServiceManager,
          description: 'Contagem total de serviços'
        });
      }

      await sshService.closeConnection(connectionId);
      const duration = Date.now() - startTime;

      const successfulAnalyses = serviceAnalysis.filter(a => a.success).length;
      const stepStatus = successfulAnalyses > 0 ? 'success' : 'failed';

      // 💾 PERSISTIR DADOS NA BASE DE DADOS
      const userId = req.user?.userId || req.user?._id;
      
      try {
        const output = JSON.stringify(serviceAnalysis, null, 2);
        
        if (stepStatus === 'success') {
          await onboardingPersistenceService.completeStep(
            systemId,
            userId,
            'Service Analysis',
            'systemctl list-units --type=service',
            output,
            duration
          );  
          console.log('💾 Análise de serviços salva na base de dados');
        } else {
          await onboardingPersistenceService.failStep(
            systemId,
            userId,
            'Service Analysis',
            'systemctl list-units --type=service',
            'Falha na análise de serviços',
            duration
          );
        }
      } catch (dbError) {
        console.error('❌ Erro ao guardar análise de serviços na base de dados:', dbError.message);
      }

      res.json({
        success: true,
        message: `Análise de serviços: ${successfulAnalyses}/${serviceAnalysis.length} análises bem-sucedidas`,
        data: {
          step: {
            name: 'Service Analysis',
            status: stepStatus,
            command: 'service_analysis',
            output: `Analyzed ${serviceAnalysis.length} service categories using ${detectedServiceManager}`,
            error: stepStatus === 'failed' ? 'Falha na análise de serviços' : '',
            duration,
            timestamp: new Date().toISOString()
          },
          serviceAnalysis,
          summary: {
            totalAnalyses: serviceAnalysis.length,
            successfulAnalyses,
            failedAnalyses: serviceAnalysis.length - successfulAnalyses,
            serviceManager: detectedServiceManager,
            includeInactive
          }
        }
      });

    } catch (sshError) {
      if (connectionId) {
        await sshService.closeConnection(connectionId);
      }

      const duration = Date.now() - startTime;
      res.status(400).json({
        success: false,
        message: 'Falha na análise de serviços via SSH',
        data: {
          step: {
            name: 'Service Analysis',
            status: 'failed',
            command: 'service_analysis', 
            output: '',
            error: sshError.message,
            duration,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('Erro na análise de serviços:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na análise de serviços',
      error: error.message
    });
  }
};

/**
 * PASSO 5: ANÁLISE DE PORTAS ABERTAS
 * Endpoint: POST /onboarding-steps/open-ports-analysis
 */
const analyzeOpenPorts = async (req, res) => {
  try {
    const { systemId, credentials, options = {} } = req.body;
    const { includeTCP = true, includeUDP = true, includeListening = true, includeEstablished = false } = options;

    if (!systemId || !credentials) {
      return res.status(400).json({
        success: false,
        message: 'SystemId e credenciais são obrigatórias'
      });
    }

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    let connectionId;
    const startTime = Date.now();

    try {
      // Conectar via SSH
      const sshConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        privateKeyPath: credentials.privateKeyPath
      };

      const connection = await sshService.createConnection(sshConfig);
      connectionId = connection.connectionId;

      const portAnalysis = [];

      // Análise 1: Portas TCP em listening
      if (includeTCP && includeListening) {
        try {
          const tcpListeningCmd = 'ss -tlnp | grep LISTEN';
          const tcpResult = await sshService.executeCommand(connectionId, tcpListeningCmd, { timeout: 10000 });
          const rawOutput = tcpResult.stdout || tcpResult.output || '';
          
          portAnalysis.push({
            type: 'tcp_listening',
            command: tcpListeningCmd,
            success: tcpResult.success,
            output: rawOutput || 'Nenhuma porta TCP em listening',
            error: tcpResult.stderr || tcpResult.error || '',
            rawOutput: rawOutput, // Output literal do comando
            protocol: 'TCP',
            state: 'LISTEN',
            description: 'Portas TCP em estado LISTEN'
          });
        } catch (error) {
          portAnalysis.push({
            type: 'tcp_listening',
            command: 'ss -tlnp | grep LISTEN',
            success: false,
            output: '',
            error: error.message,
            rawOutput: '',
            protocol: 'TCP',
            state: 'LISTEN',
            description: 'Portas TCP em estado LISTEN'
          });
        }
      }

      // Análise 2: Portas UDP
      if (includeUDP) {
        try {
          const udpCmd = 'ss -ulnp';
          const udpResult = await sshService.executeCommand(connectionId, udpCmd, { timeout: 10000 });
          const rawOutput = udpResult.stdout || udpResult.output || '';
          
          portAnalysis.push({
            type: 'udp_ports',
            command: udpCmd,
            success: udpResult.success,
            output: rawOutput || 'Nenhuma porta UDP encontrada',
            error: udpResult.stderr || udpResult.error || '',
            rawOutput: rawOutput, // Output literal do comando
            protocol: 'UDP',
            state: 'LISTEN',
            description: 'Portas UDP ativas'
          });
        } catch (error) {
          portAnalysis.push({
            type: 'udp_ports',
            command: 'ss -ulnp',
            success: false,
            output: '',
            error: error.message,
            rawOutput: '',
            protocol: 'UDP',
            state: 'LISTEN',
            description: 'Portas UDP ativas'
          });
        }
      }

      // Análise 3: Conexões TCP estabelecidas
      if (includeTCP && includeEstablished) {
        try {
          const establishedCmd = 'ss -tnp | grep ESTAB | head -20';
          const establishedResult = await sshService.executeCommand(connectionId, establishedCmd, { timeout: 8000 });
          const rawOutput = establishedResult.stdout || establishedResult.output || '';
          
          portAnalysis.push({
            type: 'tcp_established',
            command: establishedCmd,
            success: establishedResult.success,
            output: rawOutput || 'Nenhuma conexão TCP estabelecida',
            error: establishedResult.stderr || establishedResult.error || '',
            rawOutput: rawOutput, // Output literal do comando
            protocol: 'TCP',
            state: 'ESTABLISHED',
            description: 'Conexões TCP estabelecidas'
          });
        } catch (error) {
          portAnalysis.push({
            type: 'tcp_established',
            command: 'ss -tnp | grep ESTAB',
            success: false,
            output: '',
            error: error.message,
            rawOutput: '',
            protocol: 'TCP', 
            state: 'ESTABLISHED',
            description: 'Conexões TCP estabelecidas'
          });
        }
      }

      // Análise 4: Resumo estatístico
      try {
        const statsCmd = 'ss -s';
        const statsResult = await sshService.executeCommand(connectionId, statsCmd, { timeout: 5000 });
        const rawOutput = statsResult.stdout || statsResult.output || '';
        
        portAnalysis.push({
          type: 'port_statistics',
          command: statsCmd,
          success: statsResult.success,
          output: rawOutput || 'Estatísticas não disponíveis',
          error: statsResult.stderr || statsResult.error || '',
          rawOutput: rawOutput, // Output literal do comando
          protocol: 'ALL',
          state: 'SUMMARY',
          description: 'Resumo estatístico de portas e conexões'
        });
      } catch (error) {
        portAnalysis.push({
          type: 'port_statistics',
          command: 'ss -s',
          success: false,
          output: '',
          error: error.message,
          rawOutput: '',
          protocol: 'ALL',
          state: 'SUMMARY',
          description: 'Resumo estatístico de portas e conexões'
        });
      }

      // Análise 5: Portas críticas conhecidas
      try {
        const criticalPortsCmd = 'ss -tlnp | grep -E ":(22|80|443|21|25|53|3306|5432|6379|27017|8080)" | head -15';
        const criticalResult = await sshService.executeCommand(connectionId, criticalPortsCmd, { timeout: 8000 });
        const rawOutput = criticalResult.stdout || criticalResult.output || '';
        
        portAnalysis.push({
          type: 'critical_ports',
          command: criticalPortsCmd,
          success: criticalResult.success,
          output: rawOutput || 'Nenhuma porta crítica detectada',
          error: criticalResult.stderr || criticalResult.error || '',
          rawOutput: rawOutput, // Output literal do comando
          protocol: 'TCP',
          state: 'CRITICAL',
          description: 'Portas de serviços críticos conhecidos'
        });
      } catch (error) {
        portAnalysis.push({
          type: 'critical_ports',
          command: 'ss -tlnp | grep critical-ports',
          success: false,
          output: '',
          error: error.message,
          rawOutput: '',
          protocol: 'TCP',
          state: 'CRITICAL',
          description: 'Portas de serviços críticos conhecidos'
        });
      }

      await sshService.closeConnection(connectionId);
      const duration = Date.now() - startTime;

      const successfulAnalyses = portAnalysis.filter(a => a.success).length;
      const stepStatus = successfulAnalyses > 0 ? 'success' : 'failed';

      // 💾 PERSISTIR DADOS NA BASE DE DADOS
      const userId = req.user?.userId || req.user?._id;
      
      try {
        const output = JSON.stringify(portAnalysis, null, 2);
        
        if (stepStatus === 'success') {
          await onboardingPersistenceService.completeStep(
            systemId,
            userId,
            'Open Ports Analysis',
            'ss -tlnp && ss -ulnp',
            output,
            duration
          );
          console.log('💾 Análise de portas abertas salva na base de dados');
        } else {
          await onboardingPersistenceService.failStep(
            systemId,
            userId,
            'Open Ports Analysis',
            'ss -tlnp && ss -ulnp',
            'Falha na análise de portas abertas',
            duration
          );
        }
      } catch (dbError) {
        console.error('❌ Erro ao guardar análise de portas na base de dados:', dbError.message);
      }

      res.json({
        success: true,
        message: `Análise de portas abertas: ${successfulAnalyses}/${portAnalysis.length} análises bem-sucedidas`,
        data: {
          step: {
            name: 'Open Ports Analysis',
            status: stepStatus,
            command: 'port_analysis',
            output: `Analyzed ${portAnalysis.length} port categories`,
            error: stepStatus === 'failed' ? 'Falha na análise de portas abertas' : '',
            duration,
            timestamp: new Date().toISOString()
          },
          portAnalysis,
          summary: {
            totalAnalyses: portAnalysis.length,
            successfulAnalyses,
            failedAnalyses: portAnalysis.length - successfulAnalyses,
            includeTCP,
            includeUDP,
            includeListening,
            includeEstablished
          }
        }
      });

    } catch (sshError) {
      if (connectionId) {
        await sshService.closeConnection(connectionId);
      }

      const duration = Date.now() - startTime;
      res.status(400).json({
        success: false,
        message: 'Falha na análise de portas abertas via SSH',
        data: {
          step: {
            name: 'Open Ports Analysis',
            status: 'failed',
            command: 'port_analysis',
            output: '',
            error: sshError.message,
            duration,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('Erro na análise de portas abertas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na análise de portas abertas',
      error: error.message
    });
  }
};

module.exports = {
  testConnectivity,
  detectOperatingSystem,
  getSystemInformation,
  checkSystemResources,
  executeCustomCommand,
  getAvailableSteps,
  analyzeRunningProcesses,
  analyzeRunningServices,
  analyzeOpenPorts
}; 