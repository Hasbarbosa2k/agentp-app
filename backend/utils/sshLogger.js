const fs = require('fs');
const path = require('path');

class SSHLogger {
  constructor() {
    this.logFile = path.join(__dirname, '..', 'logs', 'ssh_commands.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  maskPassword(password) {
    // Se SSH_DEBUG_PASSWORD estiver definido, mostrar password real
    if (process.env.SSH_DEBUG_PASSWORD === 'true') {
      return password || '***';
    }
    
    if (!password) return '***';
    if (password.length <= 2) return '***';
    return password.charAt(0) + '*'.repeat(password.length - 2) + password.charAt(password.length - 1);
  }

  logSSHCommand(data) {
    const {
      timestamp = this.formatTimestamp(),
      frontendUser,
      sshUser,
      password,
      command,
      output,
      connectionId,
      executionTime,
      status = 'success',
      error = null
    } = data;

    const logEntry = {
      timestamp,
      frontendUser: frontendUser || 'unknown',
      sshUser: sshUser || 'unknown',
      password: this.maskPassword(password),
      command: command || 'N/A',
      output: output || 'N/A',
      connectionId: connectionId || 'N/A',
      executionTime: executionTime || 0,
      status,
      error: error ? error.message || error : null
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('❌ Erro ao escrever no log SSH:', error.message);
    }
  }

  logSSHConnection(data) {
    const {
      timestamp = this.formatTimestamp(),
      frontendUser,
      sshUser,
      password,
      connectionId,
      host,
      port,
      status = 'success',
      error = null
    } = data;

    const logEntry = {
      timestamp,
      type: 'connection',
      frontendUser: frontendUser || 'unknown',
      sshUser: sshUser || 'unknown',
      password: this.maskPassword(password),
      connectionId: connectionId || 'N/A',
      host: host || 'N/A',
      port: port || 22,
      status,
      error: error ? error.message || error : null
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('❌ Erro ao escrever no log SSH:', error.message);
    }
  }

  getRecentLogs(limit = 100) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      return lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (error) {
            return { error: 'Invalid JSON', raw: line };
          }
        });
    } catch (error) {
      console.error('❌ Erro ao ler logs SSH:', error.message);
      return [];
    }
  }

  clearLogs() {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar logs SSH:', error.message);
    }
  }
}

// Instância singleton
const sshLogger = new SSHLogger();

module.exports = sshLogger; 