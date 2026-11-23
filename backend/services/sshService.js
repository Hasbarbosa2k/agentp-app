const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const sshLogger = require('../utils/sshLogger');

/**
 * Serviço SSH para execução remota de comandos
 */
class SSHService {
  constructor() {
    this.activeConnections = new Map();
    this.defaultTimeout = 30000; // 30 segundos
    this.maxRetries = 3;
  }

  /**
   * Criar conexão SSH
   * @param {Object} config - Configuração de conexão
   * @param {string} config.host - IP ou hostname
   * @param {number} config.port - Porta SSH (padrão: 22)
   * @param {string} config.username - Nome de usuário
   * @param {string} config.password - Senha (opcional)
   * @param {string} config.privateKey - Chave privada (opcional)
   * @param {string} config.privateKeyPath - Caminho para chave privada (opcional)
   * @param {number} config.timeout - Timeout de conexão (opcional)
   * @returns {Promise<Object>} Objeto de conexão SSH
   */
  async createConnection(config) {
    const ssh = new NodeSSH();
    const connectionId = `${config.host}:${config.port || 22}:${config.username}`;
    
    try {
      console.log(`🔗 Estabelecendo conexão SSH para ${connectionId}...`);
      
      // Preparar configuração de conexão
      const sshConfig = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
        timeout: config.timeout || this.defaultTimeout,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3
      };

      // Configurar autenticação
      if (config.password) {
        sshConfig.password = config.password;
        console.log(`🔐 Usando autenticação por senha para ${connectionId}`);
      }
      
      if (config.privateKey) {
        sshConfig.privateKey = config.privateKey;
        console.log(`🔑 Usando chave privada fornecida para ${connectionId}`);
      } else if (config.privateKeyPath) {
        if (!fs.existsSync(config.privateKeyPath)) {
          throw new Error(`Arquivo de chave privada não encontrado: ${config.privateKeyPath}`);
        }
        sshConfig.privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
        console.log(`🔑 Usando chave privada do arquivo: ${config.privateKeyPath}`);
      }

      // Conectar
      await ssh.connect(sshConfig);
      
      // Armazenar conexão ativa
      const connectionInfo = {
        ssh,
        config: sshConfig,
        connectedAt: new Date(),
        lastUsed: new Date(),
        commandCount: 0
      };
      
      this.activeConnections.set(connectionId, connectionInfo);
      
      console.log(`✅ Conexão SSH estabelecida com sucesso: ${connectionId}`);
      
      // Log da conexão SSH
      sshLogger.logSSHConnection({
        frontendUser: config.frontendUser || 'unknown',
        sshUser: config.username,
        password: config.password,
        connectionId,
        host: config.host,
        port: config.port || 22,
        status: 'success'
      });
      
      return {
        connectionId,
        ssh,
        isConnected: true
      };
      
    } catch (error) {
      console.error(`❌ Erro ao conectar via SSH para ${connectionId}:`, error.message);
      
      // Log do erro de conexão SSH
      sshLogger.logSSHConnection({
        frontendUser: config.frontendUser || 'unknown',
        sshUser: config.username,
        password: config.password,
        connectionId,
        host: config.host,
        port: config.port || 22,
        status: 'failed',
        error: error.message
      });
      
      throw new Error(`Falha na conexão SSH: ${error.message}`);
    }
  }

  /**
   * Executar comando via SSH
   * @param {string} connectionId - ID da conexão SSH
   * @param {string} command - Comando a executar
   * @param {Object} options - Opções de execução
   * @param {number} options.timeout - Timeout do comando
   * @param {boolean} options.pty - Usar pseudo-terminal
   * @param {string} options.cwd - Diretório de trabalho
   * @returns {Promise<Object>} Resultado da execução
   */
  async executeCommand(connectionId, command, options = {}) {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) {
      throw new Error(`Conexão SSH não encontrada: ${connectionId}`);
    }

    const { ssh, config } = connection;
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Executando comando em ${connectionId}: ${command}`);
      
      // Atualizar estatísticas da conexão
      connection.lastUsed = new Date();
      connection.commandCount++;
      
      // Configurar opções do comando
      const execOptions = {
        execOptions: {
          pty: options.pty || false
        }
      };
      
      if (options.cwd) {
        execOptions.cwd = options.cwd;
      }
      
      // Executar comando com timeout
      const timeoutMs = options.timeout || this.defaultTimeout;
      const result = await Promise.race([
        ssh.execCommand(command, execOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Comando expirou após ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      
      const executionTime = Date.now() - startTime;
      
      // Preparar resultado
      const commandResult = {
        command,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        code: result.code || 0,
        signal: result.signal || null,
        executionTime,
        success: result.code === 0,
        timestamp: new Date()
      };
      
      // Log do comando SSH
      sshLogger.logSSHCommand({
        frontendUser: options.frontendUser || 'unknown',
        sshUser: config.username,
        password: config.password,
        command,
        output: commandResult.success ? commandResult.stdout : commandResult.stderr,
        connectionId,
        executionTime,
        status: commandResult.success ? 'success' : 'failed',
        error: commandResult.success ? null : commandResult.stderr
      });
      
      if (commandResult.success) {
        console.log(`✅ Comando executado com sucesso em ${executionTime}ms: ${command}`);
        if (commandResult.stdout) {
          console.log(`📤 Output: ${commandResult.stdout.substring(0, 200)}${commandResult.stdout.length > 200 ? '...' : ''}`);
        }
      } else {
        console.warn(`⚠️ Comando falhou com código ${commandResult.code}: ${command}`);
        if (commandResult.stderr) {
          console.warn(`📤 Erro: ${commandResult.stderr}`);
        }
      }
      
      return commandResult;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Erro ao executar comando em ${connectionId}: ${error.message}`);
      
      // Log do erro do comando SSH
      sshLogger.logSSHCommand({
        frontendUser: options.frontendUser || 'unknown',
        sshUser: config.username,
        password: config.password,
        command,
        output: error.message,
        connectionId,
        executionTime,
        status: 'error',
        error: error.message
      });
      
      return {
        command,
        stdout: '',
        stderr: error.message,
        code: -1,
        signal: null,
        executionTime,
        success: false,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Executar comando com retry automático
   * @param {string} connectionId - ID da conexão SSH
   * @param {string} command - Comando a executar
   * @param {Object} options - Opções de execução
   * @param {number} options.maxRetries - Número máximo de tentativas
   * @param {number} options.retryDelay - Delay entre tentativas (ms)
   * @returns {Promise<Object>} Resultado da execução
   */
  async executeCommandWithRetry(connectionId, command, options = {}) {
    const maxRetries = options.maxRetries || this.maxRetries;
    const retryDelay = options.retryDelay || 1000;
    
    let lastError;
    let attempts = 0;
    
    while (attempts <= maxRetries) {
      attempts++;
      
      try {
        const result = await this.executeCommand(connectionId, command, options);
        
        if (result.success) {
          if (attempts > 1) {
            console.log(`✅ Comando bem-sucedido na tentativa ${attempts}: ${command}`);
          }
          return result;
        }
        
        lastError = new Error(result.stderr || result.error || 'Comando falhou');
        
        if (attempts <= maxRetries) {
          console.warn(`⚠️ Tentativa ${attempts} falhou, tentando novamente em ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
      } catch (error) {
        lastError = error;
        
        if (attempts <= maxRetries) {
          console.warn(`⚠️ Tentativa ${attempts} falhou com erro: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    console.error(`❌ Comando falhou após ${attempts} tentativas: ${command}`);
    throw lastError;
  }

  /**
   * Testar conectividade SSH
   * @param {string} connectionId - ID da conexão SSH
   * @returns {Promise<boolean>} Se a conexão está ativa
   */
  async testConnection(connectionId) {
    try {
      const result = await this.executeCommand(connectionId, 'echo "ssh_test_ok"', { timeout: 5000 });
      return result.success && result.stdout.includes('ssh_test_ok');
    } catch (error) {
      console.warn(`⚠️ Teste de conectividade falhou para ${connectionId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Fechar conexão SSH
   * @param {string} connectionId - ID da conexão SSH
   * @returns {Promise<boolean>} Se a conexão foi fechada com sucesso
   */
  async closeConnection(connectionId) {
    const connection = this.activeConnections.get(connectionId);
    
    if (!connection) {
      console.warn(`⚠️ Tentativa de fechar conexão inexistente: ${connectionId}`);
      return false;
    }
    
    try {
      console.log(`🔒 Fechando conexão SSH: ${connectionId}`);
      
      await connection.ssh.dispose();
      this.activeConnections.delete(connectionId);
      
      const duration = Date.now() - connection.connectedAt.getTime();
      console.log(`✅ Conexão SSH fechada: ${connectionId} (${connection.commandCount} comandos, ${Math.round(duration/1000)}s)`);
      
      return true;
    } catch (error) {
      console.error(`❌ Erro ao fechar conexão SSH ${connectionId}:`, error.message);
      this.activeConnections.delete(connectionId);
      return false;
    }
  }

  /**
   * Fechar todas as conexões ativas
   * @returns {Promise<number>} Número de conexões fechadas
   */
  async closeAllConnections() {
    const connectionIds = Array.from(this.activeConnections.keys());
    let closedCount = 0;
    
    console.log(`🔒 Fechando ${connectionIds.length} conexões SSH ativas...`);
    
    for (const connectionId of connectionIds) {
      try {
        const success = await this.closeConnection(connectionId);
        if (success) closedCount++;
      } catch (error) {
        console.error(`❌ Erro ao fechar conexão ${connectionId}:`, error.message);
      }
    }
    
    console.log(`✅ ${closedCount}/${connectionIds.length} conexões SSH fechadas`);
    return closedCount;
  }

  /**
   * Obter informações das conexões ativas
   * @returns {Array} Lista de informações das conexões
   */
  getActiveConnections() {
    const connections = [];
    
    for (const [connectionId, connection] of this.activeConnections) {
      connections.push({
        connectionId,
        host: connection.config.host,
        port: connection.config.port,
        username: connection.config.username,
        connectedAt: connection.connectedAt,
        lastUsed: connection.lastUsed,
        commandCount: connection.commandCount,
        uptime: Date.now() - connection.connectedAt.getTime()
      });
    }
    
    return connections;
  }

  /**
   * Limpar conexões inativas
   * @param {number} maxIdleTime - Tempo máximo inativo em ms (padrão: 30 min)
   * @returns {Promise<number>} Número de conexões removidas
   */
  async cleanupIdleConnections(maxIdleTime = 30 * 60 * 1000) {
    const now = Date.now();
    const connectionsToClose = [];
    
    for (const [connectionId, connection] of this.activeConnections) {
      const idleTime = now - connection.lastUsed.getTime();
      if (idleTime > maxIdleTime) {
        connectionsToClose.push(connectionId);
      }
    }
    
    if (connectionsToClose.length > 0) {
      console.log(`🧹 Limpando ${connectionsToClose.length} conexões inativas...`);
      
      for (const connectionId of connectionsToClose) {
        await this.closeConnection(connectionId);
      }
    }
    
    return connectionsToClose.length;
  }
}

// Instância singleton
const sshService = new SSHService();

// Limpeza automática a cada 15 minutos
setInterval(() => {
  sshService.cleanupIdleConnections();
}, 15 * 60 * 1000);

// Fechar todas as conexões ao terminar o processo
process.on('SIGINT', async () => {
  console.log('\n🛑 Fechando todas as conexões SSH...');
  await sshService.closeAllConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Fechando todas as conexões SSH...');
  await sshService.closeAllConnections();
  process.exit(0);
});

module.exports = sshService; 