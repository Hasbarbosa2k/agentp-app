const { exec } = require('child_process');
const net = require('net');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ConnectivityService {
  /**
   * Testa conectividade completa (ping + porta)
   */
  async testConnectivity(host, port, options = {}) {
    const {
      pingCount = 4,
      pingTimeout = 5000,
      portTimeout = 5000,
      includeTraceroute = false
    } = options;

    const startTime = Date.now();
    const results = {
      host,
      port,
      timestamp: new Date().toISOString(),
      overall: {
        success: false,
        duration: 0,
        status: 'pending'
      },
      ping: {
        success: false,
        packetsTransmitted: 0,
        packetsReceived: 0,
        packetLoss: 100,
        minTime: null,
        maxTime: null,
        avgTime: null,
        output: '',
        error: ''
      },
      port: {
        success: false,
        open: false,
        duration: 0,
        error: ''
      },
      traceroute: null
    };

    try {
      // Executar ping e teste de porta em paralelo
      const [pingResult, portResult] = await Promise.allSettled([
        this.testPing(host, pingCount, pingTimeout),
        this.testPort(host, port, portTimeout)
      ]);

      // Processar resultado do ping
      if (pingResult.status === 'fulfilled') {
        results.ping = pingResult.value;
      } else {
        results.ping.error = pingResult.reason?.message || 'Ping failed';
      }

      // Processar resultado da porta
      if (portResult.status === 'fulfilled') {
        results.port = portResult.value;
      } else {
        results.port.error = portResult.reason?.message || 'Port test failed';
      }

      // Executar traceroute se solicitado
      if (includeTraceroute && results.ping.success) {
        try {
          results.traceroute = await this.testTraceroute(host);
        } catch (error) {
          results.traceroute = { error: error.message };
        }
      }

      // Determinar status geral
      results.overall.success = results.ping.success && results.port.success;
      results.overall.duration = Date.now() - startTime;
      results.overall.status = results.overall.success ? 'success' : 'failed';

      return results;

    } catch (error) {
      results.overall.duration = Date.now() - startTime;
      results.overall.status = 'error';
      results.overall.error = error.message;
      return results;
    }
  }

  /**
   * Executa teste de ping
   */
  async testPing(host, count = 4, timeout = 5000) {
    const startTime = Date.now();
    
    try {
      // Comando ping para Windows
      const isWindows = process.platform === 'win32';
      const pingCommand = isWindows 
        ? `ping -n ${count} ${host}`
        : `ping -c ${count} -W ${Math.floor(timeout/1000)} ${host}`;

      const { stdout, stderr } = await execAsync(pingCommand, {
        timeout: timeout + 2000 // Timeout extra para o comando
      });

      const duration = Date.now() - startTime;
      const result = this.parsePingOutput(stdout, stderr, isWindows);

      // Heurística mais robusta para Windows: "Destination host unreachable" deve ser considerado falha
      let success;
      if (isWindows) {
        const unreachable = /Destination host unreachable|General failure|TTL expired/i.test(stdout);
        const hasPositiveReply = /Reply from .*?:\s*bytes=\d+.*time=.*ms/i.test(stdout);
        success = hasPositiveReply && !unreachable;
      } else {
        success = result.packetsReceived > 0;
      }

      return {
        success,
        packetsTransmitted: result.packetsTransmitted,
        packetsReceived: result.packetsReceived,
        packetLoss: result.packetLoss,
        minTime: result.minTime,
        maxTime: result.maxTime,
        avgTime: result.avgTime,
        duration,
        output: stdout,
        error: stderr
      };

    } catch (error) {
      return {
        success: false,
        packetsTransmitted: count,
        packetsReceived: 0,
        packetLoss: 100,
        minTime: null,
        maxTime: null,
        avgTime: null,
        duration: Date.now() - startTime,
        output: '',
        error: error.message
      };
    }
  }

  /**
   * Testa se uma porta está aberta (equivalente ao netcat)
   */
  async testPort(host, port, timeout = 5000) {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve({
          success: false,
          open: false,
          duration: Date.now() - startTime,
          error: `Connection timeout after ${timeout}ms`
        });
      }, timeout);

      socket.on('connect', () => {
        clearTimeout(timer);
        cleanup();
        resolve({
          success: true,
          open: true,
          duration: Date.now() - startTime,
          error: ''
        });
      });

      socket.on('error', (error) => {
        clearTimeout(timer);
        cleanup();
        resolve({
          success: false,
          open: false,
          duration: Date.now() - startTime,
          error: error.message
        });
      });

      try {
        socket.connect(port, host);
      } catch (error) {
        clearTimeout(timer);
        cleanup();
        resolve({
          success: false,
          open: false,
          duration: Date.now() - startTime,
          error: error.message
        });
      }
    });
  }

  /**
   * Executa traceroute (opcional)
   */
  async testTraceroute(host, maxHops = 15) {
    try {
      const isWindows = process.platform === 'win32';
      const traceCommand = isWindows 
        ? `tracert -h ${maxHops} ${host}`
        : `traceroute -m ${maxHops} ${host}`;

      const { stdout, stderr } = await execAsync(traceCommand, {
        timeout: 30000 // 30 segundos para traceroute
      });

      return {
        success: true,
        output: stdout,
        error: stderr,
        hops: this.parseTracerouteOutput(stdout, isWindows)
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
        hops: []
      };
    }
  }

  /**
   * Faz parse do output do ping
   */
  parsePingOutput(stdout, stderr, isWindows) {
    const result = {
      packetsTransmitted: 0,
      packetsReceived: 0,
      packetLoss: 100,
      minTime: null,
      maxTime: null,
      avgTime: null
    };

    try {
      if (isWindows) {
        // Parse do ping do Windows
        const sentMatch = stdout.match(/Packets:\s*Sent\s*=\s*(\d+)/i);
        const receivedMatch = stdout.match(/Received\s*=\s*(\d+)/i);
        const lossMatch = stdout.match(/Lost\s*=\s*\d+\s*\((\d+)%/i);
        
        if (sentMatch) result.packetsTransmitted = parseInt(sentMatch[1]);
        if (receivedMatch) result.packetsReceived = parseInt(receivedMatch[1]);
        if (lossMatch) result.packetLoss = parseInt(lossMatch[1]);

        // Extrair tempos (se disponível)
        const timeMatch = stdout.match(/Average\s*=\s*(\d+)ms/i);
        if (timeMatch) {
          result.avgTime = parseInt(timeMatch[1]);
        }

      } else {
        // Parse do ping do Linux/Unix
        const statsMatch = stdout.match(/(\d+) packets transmitted, (\d+) received, (\d+)% packet loss/);
        if (statsMatch) {
          result.packetsTransmitted = parseInt(statsMatch[1]);
          result.packetsReceived = parseInt(statsMatch[2]);
          result.packetLoss = parseInt(statsMatch[3]);
        }

        // Extrair estatísticas de tempo
        const timeMatch = stdout.match(/min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)/);
        if (timeMatch) {
          result.minTime = parseFloat(timeMatch[1]);
          result.avgTime = parseFloat(timeMatch[2]);
          result.maxTime = parseFloat(timeMatch[3]);
        }
      }

    } catch (error) {
      console.error('Erro ao fazer parse do ping:', error);
    }

    return result;
  }

  /**
   * Faz parse do output do traceroute
   */
  parseTracerouteOutput(stdout, isWindows) {
    const hops = [];
    const lines = stdout.split('\n');

    for (const line of lines) {
      try {
        if (isWindows) {
          // Parse tracert do Windows
          const match = line.match(/^\s*(\d+)\s+(.+)/);
          if (match) {
            hops.push({
              hop: parseInt(match[1]),
              raw: match[2].trim()
            });
          }
        } else {
          // Parse traceroute do Linux/Unix
          const match = line.match(/^\s*(\d+)\s+(.+)/);
          if (match) {
            hops.push({
              hop: parseInt(match[1]),
              raw: match[2].trim()
            });
          }
        }
      } catch (error) {
        // Ignorar linhas inválidas
      }
    }

    return hops;
  }

  /**
   * Teste rápido de conectividade (apenas ping)
   */
  async quickPing(host, count = 1) {
    return this.testPing(host, count, 3000);
  }

  /**
   * Teste rápido de porta (apenas netcat)
   */
  async quickPortTest(host, port) {
    return this.testPort(host, port, 3000);
  }

  /**
   * Testa múltiplas portas simultaneamente
   */
  async testMultiplePorts(host, ports, timeout = 5000) {
    const promises = ports.map(port => 
      this.testPort(host, port, timeout)
        .then(result => ({ port, ...result }))
    );

    const results = await Promise.all(promises);
    
    return {
      host,
      totalPorts: ports.length,
      openPorts: results.filter(r => r.success).length,
      closedPorts: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = new ConnectivityService(); 