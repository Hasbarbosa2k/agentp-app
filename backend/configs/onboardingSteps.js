/**
 * CONFIGURAÇÃO COMPLETA DE ONBOARDING
 * Inclui TODOS os passos detalhados que aparecem no frontend
 * Cada passo será executado e guardado na base de dados
 */

const COMPLETE_ONBOARDING_STEPS = [
  // PASSO 1: Test Connectivity
  {
    step: "Test Connectivity",
    command: "ping -c 4 {IP} && nc -zv {IP} {PORT}",
    description: "🌐 Verifica se o servidor responde a ping e se a porta SSH está acessível",
    timeout: 15000,
    retryable: true,
    required: true,
    order: 1,
    category: "connectivity"
  },
  
  // PASSO 2: Test Privileges
  {
    step: "Test Privileges",
    command: "sudo -l && whoami && id && groups",
    description: "🔐 Verifica permissões do utilizador: acesso sudo, grupos e privilégios",
    timeout: 10000,
    retryable: true,
    required: true,
    order: 2,
    category: "security"
  },

  // PASSO 3: System Information
  {
    step: "System Information",
    command: "uname -a && hostname && whoami && uptime",
    description: "💻 Recolhe informações básicas: kernel, hostname, utilizador e tempo de actividade",
    timeout: 10000,
    retryable: true,
    required: true,
    order: 3,
    category: "system"
  },

  // PASSO 4: OS Detection
  {
    step: "OS Detection",
    command: "cat /etc/os-release && uname -a",
    description: "🐧 Detecta o sistema operativo: distribuição, versão e arquitectura",
    timeout: 10000,
    retryable: true,
    required: true,
    order: 4,
    category: "system"
  },

  // PASSO 5: Analyze Running Processes
  {
    step: "Analyze Running Processes",
    command: "ps aux --sort=-%mem | head -15 && ps aux | wc -l && ps -u $(whoami) -o pid,ppid,%cpu,%mem,command --sort=-%mem && ps aux | grep -E \"(systemd|init|kernel|ssh|network)\" | grep -v grep | head -10",
    description: "⚙️ Lista os processos em execução ordenados por uso de memória e CPU",
    timeout: 20000,
    retryable: true,
    order: 5,
    category: "analysis"
  },

  // PASSO 6: Analyze Running Services
  {
    step: "Analyze Running Services",
    command: "systemctl list-units --type=service --state=running --no-pager | head -15 && systemctl list-units --type=service --state=failed --no-pager && systemctl list-unit-files --type=service --state=enabled --no-pager | head -15 && ss -tlnp | grep -E \"(22|80|443|3306|5432)\" | head -10",
    description: "🔧 Lista serviços activos, falhados e habilitados no systemd",
    timeout: 25000,
    retryable: true,
    order: 6,
    category: "analysis"
  },

  // PASSO 7: Analyze Open Ports
  {
    step: "Analyze Open Ports",
    command: "ss -tlnp | grep LISTEN && ss -ulnp && ss -tnp | grep ESTAB | head -20 && ss -s && ss -tlnp | grep -E \":(22|80|443|21|25|53|3306|5432|6379|27017|8080)\" | head -15",
    description: "🔌 Analisa portas TCP/UDP abertas e conexões estabelecidas",
    timeout: 20000,
    retryable: true,
    order: 7,
    category: "analysis"
  },

  // PASSO 8: Resource Check
  {
    step: "Resource Check",
    command: "free -m && df -h && uptime",
    description: "📊 Verifica uso de memória RAM, espaço em disco e carga do sistema",
    timeout: 15000,
    retryable: true,
    order: 8,
    category: "system"
  },

  // PASSO 9: Install Node Exporter (Prometheus)
  {
    step: "Install Node Exporter",
    command: `
# Verificar se já está instalado
if systemctl is-active --quiet node_exporter 2>/dev/null; then
  echo "NODE_EXPORTER_STATUS=already_running"
  node_exporter --version 2>&1 | head -1
  exit 0
fi

# Verificar se o binário existe mas não está a correr
if command -v node_exporter &>/dev/null || [ -f /usr/local/bin/node_exporter ]; then
  echo "NODE_EXPORTER_STATUS=installed_not_running"
  /usr/local/bin/node_exporter --version 2>&1 | head -1 || node_exporter --version 2>&1 | head -1
  # Tentar iniciar
  sudo systemctl start node_exporter 2>/dev/null || true
  exit 0
fi

# Instalar node_exporter
echo "NODE_EXPORTER_STATUS=installing"
cd /tmp

# Download da versão mais recente estável
NODE_EXPORTER_VERSION="1.7.0"
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
  ARCH="amd64"
elif [ "$ARCH" = "aarch64" ]; then
  ARCH="arm64"
fi

wget -q https://github.com/prometheus/node_exporter/releases/download/v\${NODE_EXPORTER_VERSION}/node_exporter-\${NODE_EXPORTER_VERSION}.linux-\${ARCH}.tar.gz -O node_exporter.tar.gz

if [ ! -f node_exporter.tar.gz ]; then
  echo "NODE_EXPORTER_STATUS=download_failed"
  exit 1
fi

tar xzf node_exporter.tar.gz
sudo mv node_exporter-\${NODE_EXPORTER_VERSION}.linux-\${ARCH}/node_exporter /usr/local/bin/

# Criar utilizador de sistema
sudo useradd -rs /bin/false node_exporter 2>/dev/null || true

# Criar serviço systemd
sudo tee /etc/systemd/system/node_exporter.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Prometheus Node Exporter
Documentation=https://prometheus.io/docs/guides/node-exporter/
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Activar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter

# Limpar ficheiros temporários
rm -rf /tmp/node_exporter* 2>/dev/null || true

# Verificar se está a funcionar
sleep 2
if systemctl is-active --quiet node_exporter; then
  echo "NODE_EXPORTER_STATUS=installed_successfully"
  /usr/local/bin/node_exporter --version 2>&1 | head -1
  echo "NODE_EXPORTER_PORT=9100"
else
  echo "NODE_EXPORTER_STATUS=install_failed"
  systemctl status node_exporter --no-pager
  exit 1
fi
`,
    description: "📈 Instala o Prometheus Node Exporter para métricas de CPU, RAM, disco e rede (porta 9100)",
    timeout: 120000,
    retryable: true,
    required: false,
    order: 9,
    category: "monitoring"
  },

  // PASSO 10: Install Process Exporter (Prometheus)
  {
    step: "Install Process Exporter",
    command: `
# Verificar se já está instalado
if systemctl is-active --quiet process_exporter 2>/dev/null; then
  echo "PROCESS_EXPORTER_STATUS=already_running"
  process-exporter --version 2>&1 | head -1 || echo "version unknown"
  echo "PROCESS_EXPORTER_PORT=9256"
  exit 0
fi

# Verificar se o binário existe mas não está a correr
if command -v process-exporter &>/dev/null || [ -f /usr/local/bin/process-exporter ]; then
  echo "PROCESS_EXPORTER_STATUS=installed_not_running"
  /usr/local/bin/process-exporter --version 2>&1 | head -1 || echo "version unknown"
  sudo systemctl start process_exporter 2>/dev/null || true
  echo "PROCESS_EXPORTER_PORT=9256"
  exit 0
fi

# Instalar process-exporter
echo "PROCESS_EXPORTER_STATUS=installing"
cd /tmp

# Download da versão mais recente estável
PROCESS_EXPORTER_VERSION="0.8.3"
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
  ARCH="amd64"
elif [ "$ARCH" = "aarch64" ]; then
  ARCH="arm64"
fi

wget -q https://github.com/ncabatoff/process-exporter/releases/download/v\${PROCESS_EXPORTER_VERSION}/process-exporter-\${PROCESS_EXPORTER_VERSION}.linux-\${ARCH}.tar.gz -O process-exporter.tar.gz

if [ ! -f process-exporter.tar.gz ]; then
  echo "PROCESS_EXPORTER_STATUS=download_failed"
  exit 1
fi

tar xzf process-exporter.tar.gz
sudo mv process-exporter-\${PROCESS_EXPORTER_VERSION}.linux-\${ARCH}/process-exporter /usr/local/bin/

# Criar utilizador de sistema
sudo useradd -rs /bin/false process_exporter 2>/dev/null || true

# Criar ficheiro de configuração para monitorizar processos comuns
sudo mkdir -p /etc/process-exporter
sudo tee /etc/process-exporter/config.yml > /dev/null << 'CONFIGEOF'
process_names:
  # Web Servers
  - name: "{{.Comm}}"
    comm:
      - nginx
      - apache2
      - httpd
      - caddy
  
  # Databases
  - name: "{{.Comm}}"
    comm:
      - mysqld
      - postgres
      - mongod
      - redis-server
      - redis
  
  # Application Servers
  - name: "{{.Comm}}"
    comm:
      - node
      - python
      - python3
      - java
      - php-fpm
      - gunicorn
      - uvicorn
  
  # System Services
  - name: "{{.Comm}}"
    comm:
      - sshd
      - cron
      - systemd
      - docker
      - containerd
  
  # Monitoring
  - name: "{{.Comm}}"
    comm:
      - prometheus
      - node_exporter
      - grafana-server
  
  # Catch all other processes by command name
  - name: "{{.Comm}}"
    cmdline:
      - '.+'
CONFIGEOF

# Criar serviço systemd
sudo tee /etc/systemd/system/process_exporter.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Prometheus Process Exporter
Documentation=https://github.com/ncabatoff/process-exporter
Wants=network-online.target
After=network-online.target

[Service]
User=root
Group=root
Type=simple
ExecStart=/usr/local/bin/process-exporter --config.path=/etc/process-exporter/config.yml --web.listen-address=:9256
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Activar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable process_exporter
sudo systemctl start process_exporter

# Limpar ficheiros temporários
rm -rf /tmp/process-exporter* 2>/dev/null || true

# Verificar se está a funcionar
sleep 2
if systemctl is-active --quiet process_exporter; then
  echo "PROCESS_EXPORTER_STATUS=installed_successfully"
  echo "PROCESS_EXPORTER_PORT=9256"
  # Listar processos monitorizados
  echo "MONITORED_PROCESSES:"
  curl -s localhost:9256/metrics 2>/dev/null | grep "namedprocess_namegroup_num_procs{" | head -10 || echo "metrics not available yet"
else
  echo "PROCESS_EXPORTER_STATUS=install_failed"
  systemctl status process_exporter --no-pager
  exit 1
fi
`,
    description: "🔍 Instala o Process Exporter para monitorizar processos específicos (nginx, mysql, node, etc.) na porta 9256",
    timeout: 120000,
    retryable: true,
    required: false,
    order: 10,
    category: "monitoring"
  }
];

/**
 * Passos específicos por sistema operativo
 * Adiciona passos extras baseados no OS detectado
 */
const OS_SPECIFIC_ADDITIONAL_STEPS = {
  ubuntu: [
    {
      step: "Package Manager Info",
      command: "apt list --installed | wc -l && apt update && apt list --upgradable | wc -l",
      description: "Informações do gestor de pacotes APT",
      timeout: 30000,
      retryable: true,
      order: 10,
      category: "system"
    },
    {
      step: "System Logs Check",
      command: "journalctl --since \"1 hour ago\" --no-pager | tail -20",
      description: "Verificar logs recentes do sistema",
      timeout: 15000,
      retryable: true,
      order: 11,
      category: "monitoring"
    }
  ],
  
  centos: [
    {
      step: "Package Manager Info",
      command: "rpm -qa | wc -l && (yum check-update || dnf check-update) | wc -l",
      description: "Informações do gestor de pacotes RPM",
      timeout: 30000,
      retryable: true,
      order: 10,
      category: "system"
    },
    {
      step: "SELinux Status",
      command: "getenforce && sestatus",
      description: "Status do SELinux",
      timeout: 10000,
      retryable: true,
      order: 11,
      category: "security"
    }
  ],
  
  debian: [
    {
      step: "Package Manager Info",
      command: "dpkg -l | wc -l && apt list --upgradable | wc -l",
      description: "Informações do gestor de pacotes DPKG",
      timeout: 25000,
      retryable: true,
      order: 10,
      category: "system"
    }
  ]
};

/**
 * Obter passos completos de onboarding para um OS específico
 * @param {string} osId - ID do sistema operativo
 * @returns {Array} Lista completa de passos
 */
function getCompleteStepsForOS(osId = 'linux') {
  const normalizedOsId = osId.toLowerCase();
  let allSteps = [...COMPLETE_ONBOARDING_STEPS];
  
  // Adicionar passos específicos do OS se existirem
  if (OS_SPECIFIC_ADDITIONAL_STEPS[normalizedOsId]) {
    allSteps = allSteps.concat(OS_SPECIFIC_ADDITIONAL_STEPS[normalizedOsId]);
  } else if (normalizedOsId.includes('ubuntu')) {
    allSteps = allSteps.concat(OS_SPECIFIC_ADDITIONAL_STEPS.ubuntu);
  } else if (normalizedOsId.includes('debian')) {
    allSteps = allSteps.concat(OS_SPECIFIC_ADDITIONAL_STEPS.debian);
  } else if (normalizedOsId.includes('centos') || normalizedOsId.includes('rhel') || normalizedOsId.includes('fedora')) {
    allSteps = allSteps.concat(OS_SPECIFIC_ADDITIONAL_STEPS.centos);
  }
  
  // Ordenar passos pela ordem definida
  return allSteps.sort((a, b) => (a.order || 999) - (b.order || 999));
}

/**
 * Processar comando antes da execução
 * Substitui variáveis como {IP} e {PORT}
 * @param {string} command - Comando original
 * @param {Object} system - Dados do sistema
 * @returns {string} Comando processado
 */
function processCommand(command, system) {
  if (!command || typeof command !== 'string') {
    return command;
  }
  
  return command
    .replace(/\{IP\}/g, system.ip || 'localhost')
    .replace(/\{PORT\}/g, system.port || '22')
    .replace(/\{HOST\}/g, system.name || 'unknown');
}

/**
 * Executar processamento específico para outputs
 * Formatar e estruturar dados de diferentes tipos de passos
 * @param {string} stepName - Nome do passo
 * @param {string} output - Output bruto do comando
 * @returns {Object} Output processado
 */
function processStepOutput(stepName, output) {
  const processedOutput = {
    raw: output,
    processed: null,
    structured: false,
    timestamp: new Date().toISOString()
  };

  try {
    switch (stepName) {
      case 'Test Connectivity':
        processedOutput.processed = parseConnectivityOutput(output);
        processedOutput.structured = true;
        break;
        
      case 'Test Privileges':
        processedOutput.processed = parsePrivilegesOutput(output);
        processedOutput.structured = true;
        break;
        
      case 'Analyze Running Processes':
        processedOutput.processed = parseProcessOutput(output);
        processedOutput.structured = true;
        break;
        
      case 'Analyze Running Services':
        processedOutput.processed = parseServicesOutput(output);
        processedOutput.structured = true;
        break;
        
      case 'Analyze Open Ports':
        processedOutput.processed = parsePortsOutput(output);
        processedOutput.structured = true;
        break;
        
      case 'OS Detection':
        processedOutput.processed = parseOSOutput(output);
        processedOutput.structured = true;
        break;
        
      case 'Resource Check':
        processedOutput.processed = parseResourceOutput(output);
        processedOutput.structured = true;
        break;

      case 'Install Node Exporter':
        processedOutput.processed = parseNodeExporterOutput(output);
        processedOutput.structured = true;
        break;

      case 'Install Process Exporter':
        processedOutput.processed = parseProcessExporterOutput(output);
        processedOutput.structured = true;
        break;
        
      default:
        processedOutput.processed = output;
        break;
    }
  } catch (error) {
    console.warn(`Erro ao processar output do passo ${stepName}:`, error.message);
    processedOutput.processed = output;
    processedOutput.error = error.message;
  }

  return processedOutput;
}

// Funções auxiliares de parsing
function parseConnectivityOutput(output) {
  return {
    type: 'connectivity_test',
    success: !output.includes('failed') && !output.includes('unreachable'),
    details: output.split('\n').filter(line => line.trim())
  };
}

function parsePrivilegesOutput(output) {
  const lines = output.split('\n');
  return {
    type: 'privileges_test',
    sudo_available: output.includes('(ALL'),
    current_user: lines.find(l => l.match(/^[a-zA-Z0-9_-]+$/))?.trim(),
    groups: output.match(/groups=(.+)/)?.[1]?.split(',') || []
  };
}

function parseProcessOutput(output) {
  const sections = output.split('&&').map(s => s.trim());
  return {
    type: 'process_analysis',
    top_processes: sections[0]?.split('\n').slice(1, 16) || [],
    total_processes: parseInt(sections[1]) || 0,
    user_processes: sections[2]?.split('\n').slice(1) || [],
    system_processes: sections[3]?.split('\n') || []
  };
}

function parseServicesOutput(output) {
  const sections = output.split('&&').map(s => s.trim());
  return {
    type: 'service_analysis',
    running_services: sections[0]?.split('\n').slice(1, 16) || [],
    failed_services: sections[1]?.split('\n').slice(1) || [],
    enabled_services: sections[2]?.split('\n').slice(1, 16) || [],
    network_services: sections[3]?.split('\n') || []
  };
}

function parsePortsOutput(output) {
  const sections = output.split('&&').map(s => s.trim());
  return {
    type: 'ports_analysis',
    tcp_listening: sections[0]?.split('\n') || [],
    udp_ports: sections[1]?.split('\n') || [],
    established_connections: sections[2]?.split('\n').slice(0, 20) || [],
    port_statistics: sections[3]?.split('\n') || [],
    critical_ports: sections[4]?.split('\n') || []
  };
}

function parseOSOutput(output) {
  const osReleaseMatch = output.match(/ID=([^\n\r]+)/);
  const versionMatch = output.match(/VERSION_ID="([^"]+)"/);
  const nameMatch = output.match(/PRETTY_NAME="([^"]+)"/);
  
  return {
    type: 'os_detection',
    id: osReleaseMatch?.[1]?.replace(/"/g, '') || 'unknown',
    version: versionMatch?.[1] || 'unknown',
    pretty_name: nameMatch?.[1] || 'Unknown OS',
    full_output: output
  };
}

function parseResourceOutput(output) {
  const sections = output.split('&&').map(s => s.trim());
  return {
    type: 'resource_check',
    memory: sections[0]?.split('\n') || [],
    disk_usage: sections[1]?.split('\n') || [],
    system_load: sections[2]?.split('\n') || []
  };
}

function parseNodeExporterOutput(output) {
  // Extrair TODOS os status e usar o ÚLTIMO (o mais recente/final)
  const statusMatches = output.match(/NODE_EXPORTER_STATUS=(\w+)/g);
  let status = 'unknown';
  if (statusMatches && statusMatches.length > 0) {
    const lastMatch = statusMatches[statusMatches.length - 1];
    status = lastMatch.replace('NODE_EXPORTER_STATUS=', '');
  }
  
  // Extrair versão
  const versionMatch = output.match(/node_exporter,?\s*version\s*([\d.]+)/i) || 
                       output.match(/version\s*([\d.]+)/i);
  const version = versionMatch ? versionMatch[1] : null;
  
  // Extrair porta
  const portMatch = output.match(/NODE_EXPORTER_PORT=(\d+)/);
  const port = portMatch ? parseInt(portMatch[1], 10) : 9100;
  
  // Determinar se está instalado e a correr
  const installed = ['already_running', 'installed_not_running', 'installed_successfully'].includes(status);
  const running = status === 'already_running' || status === 'installed_successfully';
  
  // Mensagem clara para o utilizador
  const statusMessages = {
    'already_running': '✅ Node Exporter já estava instalado e a correr',
    'installed_not_running': '⚠️ Node Exporter instalado mas não está a correr - tentando iniciar...',
    'installed_successfully': '✅ Node Exporter instalado e iniciado com sucesso!',
    'installing': '🔄 A instalar Node Exporter...',
    'download_failed': '❌ Falha no download do Node Exporter',
    'install_failed': '❌ Falha na instalação do Node Exporter',
    'unknown': '❓ Estado desconhecido'
  };
  
  return {
    type: 'node_exporter_install',
    status,
    statusMessage: statusMessages[status] || statusMessages['unknown'],
    installed,
    running,
    version,
    port,
    raw_output: output,
    summary: installed 
      ? `Node Exporter v${version || '?'} ${running ? 'a correr' : 'parado'} na porta ${port}`
      : 'Node Exporter não instalado',
    details: {
      was_already_installed: status === 'already_running',
      was_installed_now: status === 'installed_successfully',
      needs_start: status === 'installed_not_running',
      failed: ['download_failed', 'install_failed'].includes(status)
    }
  };
}

function parseProcessExporterOutput(output) {
  // Extrair TODOS os status e usar o ÚLTIMO (o mais recente/final)
  const statusMatches = output.match(/PROCESS_EXPORTER_STATUS=(\w+)/g);
  let status = 'unknown';
  if (statusMatches && statusMatches.length > 0) {
    const lastMatch = statusMatches[statusMatches.length - 1];
    status = lastMatch.replace('PROCESS_EXPORTER_STATUS=', '');
  }
  
  // Extrair porta
  const portMatch = output.match(/PROCESS_EXPORTER_PORT=(\d+)/);
  const port = portMatch ? parseInt(portMatch[1], 10) : 9256;
  
  // Extrair processos monitorizados
  const processesMatch = output.match(/namedprocess_namegroup_num_procs\{groupname="([^"]+)"/g);
  const monitoredProcesses = processesMatch 
    ? [...new Set(processesMatch.map(m => m.match(/groupname="([^"]+)"/)[1]))]
    : [];
  
  // Determinar se está instalado e a correr
  const installed = ['already_running', 'installed_not_running', 'installed_successfully'].includes(status);
  const running = status === 'already_running' || status === 'installed_successfully';
  
  // Mensagem clara para o utilizador
  const statusMessages = {
    'already_running': '✅ Process Exporter já estava instalado e a correr',
    'installed_not_running': '⚠️ Process Exporter instalado mas não está a correr - tentando iniciar...',
    'installed_successfully': '✅ Process Exporter instalado e iniciado com sucesso!',
    'installing': '🔄 A instalar Process Exporter...',
    'download_failed': '❌ Falha no download do Process Exporter',
    'install_failed': '❌ Falha na instalação do Process Exporter',
    'unknown': '❓ Estado desconhecido'
  };
  
  return {
    type: 'process_exporter_install',
    status,
    statusMessage: statusMessages[status] || statusMessages['unknown'],
    installed,
    running,
    port,
    monitoredProcesses,
    raw_output: output,
    summary: installed 
      ? `Process Exporter ${running ? 'a correr' : 'parado'} na porta ${port} (${monitoredProcesses.length} processos)`
      : 'Process Exporter não instalado',
    details: {
      was_already_installed: status === 'already_running',
      was_installed_now: status === 'installed_successfully',
      needs_start: status === 'installed_not_running',
      failed: ['download_failed', 'install_failed'].includes(status)
    }
  };
}

/**
 * Validar estrutura de passo
 * @param {Object} step - Passo a validar
 * @returns {boolean} Se é válido
 */
function validateStep(step) {
  return step && 
         typeof step.step === 'string' && 
         typeof step.command === 'string' && 
         step.step.length > 0 && 
         step.command.length > 0;
}

module.exports = {
  COMPLETE_ONBOARDING_STEPS,
  OS_SPECIFIC_ADDITIONAL_STEPS,
  getCompleteStepsForOS,
  processCommand,
  processStepOutput,
  parseProcessExporterOutput,
  validateStep
}; 