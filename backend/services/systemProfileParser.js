/**
 * System Profile Parser - Extrai dados estruturados dos outputs de onboarding
 * Preenche aiAnalyzedProfile sem necessidade de AI
 */

const System = require('../models/System');

class SystemProfileParser {
  /**
   * Parse output de processos (ps aux)
   * @param {string} output - Output do comando de análise de processos
   * @returns {Array} Lista de top processes
   */
  parseProcessesOutput(output) {
    const processes = [];
    
    try {
      const lines = output.split('\n').filter(line => line.trim());
      
      // Procurar linhas com formato ps aux: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
      for (const line of lines) {
        // Skip headers
        if (line.includes('USER') && line.includes('PID') && line.includes('%CPU')) continue;
        if (line.includes('Total:') || line.includes('wc -l')) continue;
        
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          const cpu = parts[2];
          const mem = parts[3];
          const command = parts.slice(10).join(' ');
          
          // Extrair nome do processo do comando
          const processName = this.extractProcessName(command);
          
          // Só adicionar se tiver valores válidos e não for processo do sistema trivial
          if (processName && !this.isSystemProcess(processName) && parseFloat(cpu) >= 0) {
            processes.push({
              name: processName,
              cpuUsage: `${cpu}%`,
              memUsage: `${mem}%`
            });
          }
        }
      }
      
      // Ordenar por CPU usage e limitar a 6
      return processes
        .sort((a, b) => parseFloat(b.cpuUsage) - parseFloat(a.cpuUsage))
        .slice(0, 6);
        
    } catch (error) {
      console.error('Erro ao parsear processos:', error.message);
      return [];
    }
  }

  /**
   * Parse output de serviços (systemctl)
   * @param {string} output - Output do comando de análise de serviços
   * @returns {Array} Lista de active services
   */
  parseServicesOutput(output) {
    const services = [];
    
    try {
      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Formato systemctl: UNIT LOAD ACTIVE SUB DESCRIPTION
        // Procurar linhas com .service
        if (line.includes('.service')) {
          // Extrair nome do serviço
          const serviceMatch = line.match(/([a-zA-Z0-9_@-]+\.service)/);
          if (serviceMatch) {
            const serviceName = serviceMatch[1];
            
            // Determinar status
            let status = 'unknown';
            if (line.includes('running')) status = 'running';
            else if (line.includes('active')) status = 'active';
            else if (line.includes('enabled')) status = 'enabled';
            else if (line.includes('failed')) status = 'failed';
            
            // Evitar duplicados
            if (!services.find(s => s.name === serviceName)) {
              services.push({
                name: serviceName,
                status: status
              });
            }
          }
        }
      }
      
      // Priorizar running/active e limitar a 6
      return services
        .sort((a, b) => {
          const priority = { running: 0, active: 1, enabled: 2, failed: 3, unknown: 4 };
          return (priority[a.status] || 4) - (priority[b.status] || 4);
        })
        .slice(0, 6);
        
    } catch (error) {
      console.error('Erro ao parsear serviços:', error.message);
      return [];
    }
  }

  /**
   * Parse output de portas (ss/netstat)
   * @param {string} output - Output do comando de análise de portas
   * @returns {Array} Lista de open ports
   */
  parsePortsOutput(output) {
    const ports = [];
    const seenPorts = new Set();
    
    try {
      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Skip headers e estatísticas
        if (line.includes('State') && line.includes('Recv-Q')) continue;
        if (line.includes('Total:') || line.includes('TCP:') || line.includes('UDP:')) continue;
        
        // Procurar padrão de porta: *:22, 0.0.0.0:80, :::443, etc.
        const portMatches = line.match(/[*0-9.:]+:(\d+)/g) || [];
        
        for (const match of portMatches) {
          const portNum = match.match(/:(\d+)$/)?.[1];
          if (portNum && !seenPorts.has(portNum)) {
            seenPorts.add(portNum);
            
            // Determinar protocolo
            const protocol = line.toLowerCase().includes('udp') ? 'udp' : 'tcp';
            
            // Adicionar nome do serviço comum se conhecido
            const serviceName = this.getServiceName(portNum);
            
            ports.push({
              port: serviceName ? `:${portNum} (${serviceName})` : `:${portNum}`,
              protocol: protocol
            });
          }
        }
      }
      
      // Ordenar por número de porta e limitar a 8
      return ports
        .sort((a, b) => {
          const portA = parseInt(a.port.match(/:(\d+)/)?.[1] || '0');
          const portB = parseInt(b.port.match(/:(\d+)/)?.[1] || '0');
          return portA - portB;
        })
        .slice(0, 8);
        
    } catch (error) {
      console.error('Erro ao parsear portas:', error.message);
      return [];
    }
  }

  /**
   * Parse output de system info (uname, hostname, etc.)
   * @param {string} output - Output do comando de system info
   * @returns {Object} System info estruturado
   */
  parseSystemInfoOutput(output) {
    const systemInfo = {
      kernel: 'N/A',
      architecture: 'N/A',
      loadAverage: 'N/A',
      loggedUsers: 'N/A'
    };
    
    try {
      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Parse uname -a: Linux hostname 5.15.0-91-generic #101-Ubuntu SMP x86_64
        if (line.includes('Linux')) {
          // Kernel version
          const kernelMatch = line.match(/(\d+\.\d+\.\d+[-\w]*)/);
          if (kernelMatch) {
            systemInfo.kernel = kernelMatch[1];
          }
          
          // Arquitectura
          if (line.includes('x86_64')) systemInfo.architecture = 'x86_64';
          else if (line.includes('aarch64')) systemInfo.architecture = 'aarch64';
          else if (line.includes('armv7')) systemInfo.architecture = 'armv7l';
          else if (line.includes('i686')) systemInfo.architecture = 'i686';
        }
        
        // Parse uptime: load average: 0.08, 0.03, 0.01
        if (line.includes('load average')) {
          const loadMatch = line.match(/load average:\s*([0-9., ]+)/);
          if (loadMatch) {
            systemInfo.loadAverage = loadMatch[1].trim();
          }
          
          // Users from uptime line
          const usersMatch = line.match(/(\d+)\s+user/);
          if (usersMatch) {
            systemInfo.loggedUsers = `${usersMatch[1]} logged in`;
          }
        }
      }
      
    } catch (error) {
      console.error('Erro ao parsear system info:', error.message);
    }
    
    return systemInfo;
  }

  /**
   * Extrair nome do processo do comando completo
   */
  extractProcessName(command) {
    if (!command) return null;
    
    // Remover path completo
    const parts = command.split('/');
    let name = parts[parts.length - 1];
    
    // Remover argumentos
    name = name.split(/\s+/)[0];
    
    // Remover caracteres especiais
    name = name.replace(/[\[\]{}()]/g, '');
    
    return name || null;
  }

  /**
   * Verificar se é processo do sistema trivial
   */
  isSystemProcess(name) {
    const systemProcesses = [
      'kworker', 'ksoftirqd', 'migration', 'watchdog', 
      'kthreadd', 'rcu_', 'irq/', 'scsi_', 'ata_'
    ];
    return systemProcesses.some(sp => name.toLowerCase().includes(sp.toLowerCase()));
  }

  /**
   * Obter nome do serviço para porta conhecida
   */
  getServiceName(port) {
    const portMap = {
      '22': 'SSH',
      '80': 'HTTP',
      '443': 'HTTPS',
      '21': 'FTP',
      '25': 'SMTP',
      '53': 'DNS',
      '110': 'POP3',
      '143': 'IMAP',
      '3306': 'MySQL',
      '5432': 'PostgreSQL',
      '6379': 'Redis',
      '27017': 'MongoDB',
      '8080': 'HTTP-Alt',
      '9100': 'Node Exporter',
      '9256': 'Process Exporter',
      '3000': 'App',
      '5000': 'App'
    };
    return portMap[port] || null;
  }

  /**
   * Atualizar perfil do sistema com dados parseados do onboarding
   * @param {string} systemId - ID do sistema
   * @param {string} stepName - Nome do passo do onboarding
   * @param {string} output - Output do comando
   * @returns {Promise<Object>} Sistema atualizado
   */
  async updateSystemProfileFromStep(systemId, stepName, output) {
    try {
      const system = await System.findById(systemId);
      if (!system) {
        throw new Error(`Sistema não encontrado: ${systemId}`);
      }

      // Inicializar aiAnalyzedProfile se não existir
      if (!system.aiAnalyzedProfile) {
        system.aiAnalyzedProfile = {
          topProcesses: [],
          activeServices: [],
          openPorts: [],
          systemInfo: {}
        };
      }

      let updated = false;

      switch (stepName) {
        case 'Analyze Running Processes':
          const processes = this.parseProcessesOutput(output);
          if (processes.length > 0) {
            system.aiAnalyzedProfile.topProcesses = processes;
            updated = true;
            console.log(`📊 Processos parseados: ${processes.length}`);
          }
          break;

        case 'Analyze Running Services':
          const services = this.parseServicesOutput(output);
          if (services.length > 0) {
            system.aiAnalyzedProfile.activeServices = services;
            updated = true;
            console.log(`🔧 Serviços parseados: ${services.length}`);
          }
          break;

        case 'Analyze Open Ports':
          const ports = this.parsePortsOutput(output);
          if (ports.length > 0) {
            system.aiAnalyzedProfile.openPorts = ports;
            updated = true;
            console.log(`🔌 Portas parseadas: ${ports.length}`);
          }
          break;

        case 'System Information':
        case 'Resource Check':
          const sysInfo = this.parseSystemInfoOutput(output);
          // Merge com info existente
          system.aiAnalyzedProfile.systemInfo = {
            ...system.aiAnalyzedProfile.systemInfo,
            ...sysInfo
          };
          // Só marcar updated se tiver algo útil
          if (sysInfo.kernel !== 'N/A' || sysInfo.loadAverage !== 'N/A') {
            updated = true;
            console.log(`💻 System info parseado:`, sysInfo);
          }
          break;

        default:
          // Outros passos não atualizam o perfil
          break;
      }

      if (updated) {
        system.aiAnalyzedProfile.lastAnalyzedAt = new Date();
        system.aiAnalyzedProfile.aiMetadata = {
          ...system.aiAnalyzedProfile.aiMetadata,
          model: 'direct-parse',
          source: 'onboarding-step',
          lastStep: stepName
        };
        
        await system.save();
        console.log(`✅ Perfil do sistema ${system.name} atualizado após ${stepName}`);
      }

      return system;

    } catch (error) {
      console.error(`❌ Erro ao atualizar perfil do sistema:`, error.message);
      throw error;
    }
  }

  /**
   * Parsear todos os dados de um onboarding completo e atualizar perfil
   * @param {Object} onboardingProcess - Processo de onboarding com steps
   * @param {string} systemId - ID do sistema
   * @returns {Promise<Object>} Sistema atualizado
   */
  async parseOnboardingAndUpdateProfile(onboardingProcess, systemId) {
    try {
      const system = await System.findById(systemId);
      if (!system) {
        throw new Error(`Sistema não encontrado: ${systemId}`);
      }

      // Inicializar aiAnalyzedProfile
      system.aiAnalyzedProfile = {
        topProcesses: [],
        activeServices: [],
        openPorts: [],
        systemInfo: {},
        lastAnalyzedAt: new Date(),
        aiMetadata: {
          model: 'direct-parse',
          source: 'onboarding-complete'
        }
      };

      // Processar cada step com sucesso
      for (const step of onboardingProcess.steps) {
        if (step.status !== 'success' || !step.output) continue;

        switch (step.step) {
          case 'Analyze Running Processes':
            const processes = this.parseProcessesOutput(step.output);
            if (processes.length > 0) {
              system.aiAnalyzedProfile.topProcesses = processes;
            }
            break;

          case 'Analyze Running Services':
            const services = this.parseServicesOutput(step.output);
            if (services.length > 0) {
              system.aiAnalyzedProfile.activeServices = services;
            }
            break;

          case 'Analyze Open Ports':
            const ports = this.parsePortsOutput(step.output);
            if (ports.length > 0) {
              system.aiAnalyzedProfile.openPorts = ports;
            }
            break;

          case 'System Information':
          case 'Resource Check':
            const sysInfo = this.parseSystemInfoOutput(step.output);
            system.aiAnalyzedProfile.systemInfo = {
              ...system.aiAnalyzedProfile.systemInfo,
              ...sysInfo
            };
            break;
        }
      }

      await system.save();
      
      console.log(`✅ Perfil completo parseado para sistema ${system.name}:`);
      console.log(`   - ${system.aiAnalyzedProfile.topProcesses.length} processos`);
      console.log(`   - ${system.aiAnalyzedProfile.activeServices.length} serviços`);
      console.log(`   - ${system.aiAnalyzedProfile.openPorts.length} portas`);

      return system;

    } catch (error) {
      console.error(`❌ Erro ao parsear onboarding:`, error.message);
      throw error;
    }
  }
}

module.exports = {
  SystemProfileParser,
  getSystemProfileParser: () => new SystemProfileParser()
};
