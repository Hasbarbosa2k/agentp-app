const sshLogger = require('../utils/sshLogger');

console.log('🧪 Testando sistema de logging SSH...\n');

// Teste 1: Log de conexão SSH
console.log('1. Testando log de conexão SSH...');
sshLogger.logSSHConnection({
  frontendUser: 'test-user',
  sshUser: 'root',
  password: 'test-password-123',
  connectionId: 'test-host:22:root',
  host: 'test-host',
  port: 22,
  status: 'success'
});

// Teste 2: Log de comando SSH bem-sucedido
console.log('2. Testando log de comando SSH bem-sucedido...');
sshLogger.logSSHCommand({
  frontendUser: 'test-user',
  sshUser: 'root',
  password: 'test-password-123',
  command: 'ls -la',
  output: 'total 8\ndrwxr-xr-x 2 root root 4096 Jan 15 10:00 .\ndrwxr-xr-x 3 root root 4096 Jan 15 09:59 ..',
  connectionId: 'test-host:22:root',
  executionTime: 150,
  status: 'success'
});

// Teste 3: Log de comando SSH com erro
console.log('3. Testando log de comando SSH com erro...');
sshLogger.logSSHCommand({
  frontendUser: 'test-user',
  sshUser: 'root',
  password: 'test-password-123',
  command: 'invalid-command',
  output: 'command not found: invalid-command',
  connectionId: 'test-host:22:root',
  executionTime: 50,
  status: 'failed',
  error: 'command not found: invalid-command'
});

// Teste 4: Log de conexão SSH falhada
console.log('4. Testando log de conexão SSH falhada...');
sshLogger.logSSHConnection({
  frontendUser: 'test-user',
  sshUser: 'root',
  password: 'wrong-password',
  connectionId: 'test-host:22:root',
  host: 'test-host',
  port: 22,
  status: 'failed',
  error: 'All configured authentication methods failed'
});

// Teste 5: Verificar logs
console.log('5. Verificando logs salvos...');
const logs = sshLogger.getRecentLogs(10);
console.log(`📊 Total de logs encontrados: ${logs.length}`);

logs.forEach((log, index) => {
  console.log(`\n📝 Log ${index + 1}:`);
  console.log(`   Timestamp: ${log.timestamp}`);
  console.log(`   Tipo: ${log.type || 'command'}`);
  console.log(`   Status: ${log.status}`);
  console.log(`   Frontend User: ${log.frontendUser}`);
  console.log(`   SSH User: ${log.sshUser}`);
  console.log(`   Password: ${log.password}`);
  if (log.command) {
    console.log(`   Comando: ${log.command}`);
  }
  if (log.output) {
    console.log(`   Output: ${log.output.substring(0, 100)}${log.output.length > 100 ? '...' : ''}`);
  }
  if (log.error) {
    console.log(`   Erro: ${log.error}`);
  }
});

// Teste 6: Verificar localização do arquivo
console.log('\n6. Verificando localização do arquivo de log...');
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '..', 'logs', 'ssh_commands.log');

if (fs.existsSync(logFile)) {
  const stats = fs.statSync(logFile);
  console.log(`✅ Arquivo de log encontrado: ${logFile}`);
  console.log(`📏 Tamanho: ${stats.size} bytes`);
  console.log(`📅 Última modificação: ${stats.mtime}`);
} else {
  console.log(`❌ Arquivo de log não encontrado: ${logFile}`);
}

console.log('\n✅ Teste de logging SSH concluído!'); 