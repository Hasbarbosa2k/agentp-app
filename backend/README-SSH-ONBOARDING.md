# 🚀 Sistema de Onboarding via SSH

Sistema completo para execução automática de onboarding de sistemas remotos via SSH, com detecção automática de OS, passos configuráveis e monitoramento em tempo real.

## 📋 Funcionalidades

- ✅ **Conexão SSH automática** com suporte a senha e chave privada
- ✅ **Detecção automática de OS** (Ubuntu, CentOS, Debian, Alpine, etc.)
- ✅ **Passos configuráveis por OS** com comandos específicos
- ✅ **Sistema de retry** automático para comandos que falham
- ✅ **Execução manual de passos** individuais
- ✅ **Monitoramento em tempo real** de processos
- ✅ **Logs detalhados** de execução
- ✅ **Cancelamento de processos** em execução
- ✅ **Teste de conectividade** antes do onboarding

## 🏗️ Arquitetura

```
configs/onboardingSteps.js     - Configuração de comandos por OS
services/sshService.js         - Serviço de conexão e execução SSH
services/onboardingExecutionService.js - Orquestração do processo
utils/osDetector.js            - Detecção automática de sistema operativo
controllers/onboardingExecutionController.js - API endpoints
routes/onboardingExecution.js - Rotas REST
validators/onboardingExecution.js - Validações
```

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
npm install node-ssh
```

### 2. Configurar Sistema

```javascript
// Criar sistema no banco de dados
POST /systems
{
  "name": "Servidor Ubuntu",
  "ip": "192.168.1.100",
  "port": 22,
  "os": "Ubuntu 22.04",
  "owner": "DevOps Team"
}
```

### 3. Executar Onboarding Completo

```javascript
POST /onboarding-execution/run
{
  "systemId": "sistema-id",
  "credentials": {
    "username": "ubuntu",
    "password": "senha-segura"
    // OU
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n..."
    // OU
    "privateKeyPath": "/path/to/key.pem"
  },
  "options": {
    "autoRetry": true,
    "maxRetries": 3,
    "timeout": 30,
    "continueOnFailure": false
  }
}
```

### 4. Testar Conectividade

```javascript
POST /onboarding-execution/test-connection
{
  "host": "192.168.1.100",
  "port": 22,
  "credentials": {
    "username": "ubuntu",
    "password": "senha"
  }
}
```

### 5. Executar Passo Individual

```javascript
POST /onboarding-execution/step
{
  "onboardingId": "processo-id",
  "stepIndex": 0,
  "credentials": {
    "username": "ubuntu",
    "password": "senha"
  }
}
```

## 📊 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/onboarding-execution/run` | Executar onboarding completo |
| `POST` | `/onboarding-execution/step` | Executar passo individual |
| `POST` | `/onboarding-execution/test-connection` | Testar SSH |
| `GET` | `/onboarding-execution/running` | Listar processos ativos |
| `POST` | `/onboarding-execution/cancel` | Cancelar processo |
| `GET` | `/onboarding-execution/configs` | Obter configurações |

## 🖥️ Sistemas Operativos Suportados

### Ubuntu/Debian
- Detecção via `/etc/os-release`
- Comandos: `apt`, `systemctl`, `lscpu`, `ss`
- Verificação de serviços systemd

### CentOS/RHEL/Fedora
- Detecção de sistemas baseados em RedHat
- Comandos: `yum/dnf`, `firewall-cmd`, `getenforce`
- Verificação de SELinux e firewall

### Alpine Linux
- Sistema minimalista
- Comandos: `apk`, `rc-status`
- Serviços OpenRC

### Linux Genérico
- Fallback para sistemas não reconhecidos
- Comandos básicos: `uname`, `ps`, `netstat`

## 🔧 Configuração de Passos

```javascript
// configs/onboardingSteps.js
const UBUNTU_STEPS = [
  {
    step: "OS Detection",
    command: "cat /etc/os-release",
    description: "Detectar distribuição",
    timeout: 5000,
    retryable: true,
    required: true
  },
  {
    step: "System Resources",
    command: "free -h && df -h",
    description: "Verificar recursos",
    timeout: 15000,
    retryable: true
  }
  // ... mais passos
];
```

## 📝 Estrutura de Dados

### Processo de Onboarding
```javascript
{
  "systemId": "ObjectId",
  "status": "in_progress",
  "progress": 45,
  "totalSteps": 10,
  "completedSteps": 4,
  "failedSteps": 1,
  "osInfo": {
    "id": "ubuntu",
    "version": "22.04",
    "prettyName": "Ubuntu 22.04.3 LTS",
    "architecture": "x86_64",
    "kernel": "5.15.0-89-generic"
  },
  "steps": [
    {
      "step": "OS Detection",
      "command": "cat /etc/os-release",
      "status": "success",
      "output": "ID=ubuntu\nVERSION_ID=22.04...",
      "startedAt": "2025-01-15T10:00:00Z",
      "endedAt": "2025-01-15T10:00:02Z",
      "duration": 2000
    }
  ],
  "logs": [
    {
      "timestamp": "2025-01-15T10:00:00Z",
      "level": "info",
      "message": "Processo iniciado",
      "source": "system"
    }
  ]
}
```

## 🔐 Tipos de Autenticação SSH

### 1. Autenticação por Senha
```javascript
{
  "username": "ubuntu",
  "password": "senha-segura"
}
```

### 2. Chave Privada (String)
```javascript
{
  "username": "ubuntu", 
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA..."
}
```

### 3. Arquivo de Chave
```javascript
{
  "username": "ubuntu",
  "privateKeyPath": "/home/user/.ssh/id_rsa"
}
```

## ⚙️ Opções de Execução

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `autoRetry` | boolean | true | Retry automático em falhas |
| `maxRetries` | number | 3 | Máximo de tentativas |
| `timeout` | number | 30 | Timeout por comando (segundos) |
| `continueOnFailure` | boolean | false | Continuar mesmo com falhas |
| `connectionTimeout` | number | 30000 | Timeout de conexão SSH (ms) |
| `retryDelay` | number | 2000 | Delay entre tentativas (ms) |

## 🔍 Monitoramento

### Verificar Processos Ativos
```javascript
GET /onboarding-execution/running

Resposta:
{
  "runningProcesses": [
    {
      "systemId": "sistema-id",
      "status": "executing", 
      "currentStep": 3,
      "stepName": "Check System Resources",
      "duration": 45000,
      "durationFormatted": "45s"
    }
  ],
  "totalRunning": 1,
  "summary": {
    "connecting": 0,
    "executing": 1,
    "other": 0
  }
}
```

### Cancelar Processo
```javascript
POST /onboarding-execution/cancel
{
  "systemId": "sistema-id",
  "reason": "Manutenção programada"
}
```

## 🚀 Exemplo Completo

```javascript
// 1. Testar conectividade
const testResult = await fetch('/onboarding-execution/test-connection', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: JSON.stringify({
    host: '192.168.1.100',
    credentials: { username: 'ubuntu', password: 'senha' }
  })
});

// 2. Executar onboarding se conectividade OK
if (testResult.success) {
  const onboardingResult = await fetch('/onboarding-execution/run', {
    method: 'POST', 
    headers: { 'Authorization': 'Bearer token' },
    body: JSON.stringify({
      systemId: 'sistema-id',
      credentials: { username: 'ubuntu', password: 'senha' },
      options: { autoRetry: true, maxRetries: 3 }
    })
  });
}

// 3. Monitorar progresso
setInterval(async () => {
  const status = await fetch('/onboarding-execution/running');
  console.log('Processos ativos:', status.data.totalRunning);
}, 5000);
```

## 📈 Logs e Debugging

### Logs do Sistema
- Conexões SSH estabelecidas/fechadas
- Comandos executados com timing
- Falhas e retries
- Detecção de OS

### Logs do Processo
- Cada passo executado
- Outputs dos comandos
- Erros detalhados
- Estatísticas finais

## 🛡️ Segurança

- ✅ Credenciais SSH nunca logadas em texto plano
- ✅ Validação rigorosa de inputs
- ✅ Timeouts para evitar processos infinitos
- ✅ Limpeza automática de conexões inativas
- ✅ Sanitização de dados sensíveis

## 🧪 Testes

```bash
# Executar teste completo
node test-ssh-onboarding.js

# Instalar dependências se necessário
npm install node-ssh
```

## 💡 Próximos Passos

1. **Configurar credenciais reais** para sistemas de teste
2. **Customizar passos** por tipo de sistema/aplicação
3. **Implementar webhooks** para notificações
4. **Adicionar métricas** de performance
5. **Criar interface web** para monitoramento
6. **Implementar agendamento** de onboarding

## 🔗 Integração com Frontend

```javascript
// Exemplo de uso no frontend
class OnboardingSSHManager {
  async startOnboarding(systemId, credentials) {
    const result = await this.api.post('/onboarding-execution/run', {
      systemId,
      credentials,
      options: { autoRetry: true }
    });
    
    // Monitorar progresso
    this.monitorProgress(result.onboardingId);
    return result;
  }
  
  monitorProgress(onboardingId) {
    const interval = setInterval(async () => {
      const status = await this.api.get(`/onboarding/${onboardingId}`);
      this.updateUI(status.data);
      
      if (['completed', 'failed', 'cancelled'].includes(status.data.status)) {
        clearInterval(interval);
      }
    }, 2000);
  }
}
```

---

**Sistema de onboarding SSH completo e pronto para produção! 🎉** 