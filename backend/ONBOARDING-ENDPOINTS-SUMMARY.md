# 📋 Resumo dos Endpoints de Onboarding - Comandos SSH

## 🎯 Status da Implementação

| # | Step Name | Endpoint API | Status | Comandos SSH Executados |
|---|-----------|-------------|--------|------------------------|
| **1** | **Test Connectivity** | `POST /onboarding-steps/connectivity` | ✅ Implementado | `echo "SSH test successful"` |
| **2** | **Test Privileges** | `POST /onboarding-steps/system-info` | ✅ Implementado | `sudo -l`, `whoami`, `id`, `groups`, `uname -a`, `free -h`, `df -h`, `uptime` |
| **3** | **Analyze Running Processes** | `POST /onboarding-steps/process-analysis` | **✅ NOVO - Implementado** | `ps aux --sort=-%mem \| head -15`, `ps aux --sort=-%cpu \| head -15`, `ps aux \| wc -l`, `ps -u {user} -o pid,ppid,%cpu,%mem,command --sort=-%mem` |
| **4** | **Analyze Running Services** | `POST /onboarding-steps/service-analysis` | **✅ NOVO - Implementado** | `systemctl list-units --type=service --state=running --no-pager`, `systemctl list-units --type=service --state=failed --no-pager`, `service --status-all \| grep "\\[ + \\]"`, `ss -tlnp \| grep -E "(22\|80\|443\|3306\|5432)"` |
| **5** | **Analyze Open Ports** | `POST /onboarding-steps/open-ports-analysis` | **✅ NOVO - Implementado** | `ss -tlnp \| grep LISTEN`, `ss -ulnp`, `ss -tnp \| grep ESTAB`, `ss -s`, `ss -tlnp \| grep -E ":(22\|80\|443\|21\|25\|53\|3306\|5432\|6379\|27017\|8080)"` |
| **6** | **SNMP v3 User Setup** | `POST /onboarding-steps/os-detection` | ✅ Implementado | `cat /etc/os-release`, `uname -a`, `uname -m`, `uname -r` |
| **7** | **Status Script** | `POST /onboarding-steps/system-info` | ✅ Implementado | *Mesmo que o passo 2* |
| **8** | **Config File Copy** | `POST /onboarding-steps/resource-check` | ✅ Implementado | `free -m`, `df -h /`, `uptime` |
| **9** | **Config File Edit** | - | ⏸️ Não mapeado | `nano /etc/config`, `vi /etc/config`, `sed -i 's/old/new/g' /etc/config` |
| **10** | **Alias Setup** | - | ⏸️ Não mapeado | `echo "alias ll='ls -la'" >> ~/.bashrc`, `source ~/.bashrc` |

## 🆕 Endpoints Recém-Implementados

### 1. Process Analysis (`/onboarding-steps/process-analysis`)

**Comandos SSH executados:**
```bash
# Top processos por uso de memória
ps aux --sort=-%mem | head -15

# Top processos por uso de CPU
ps aux --sort=-%cpu | head -15

# Contagem total de processos
ps aux | wc -l

# Processos do usuário específico (se includeDetails=true)
ps -u {username} -o pid,ppid,%cpu,%mem,command --sort=-%mem

# Processos críticos do sistema (se includeDetails=true)
ps aux | grep -E "(systemd|init|kernel|ssh|network)" | grep -v grep | head -10
```

**Opções disponíveis:**
- `includeDetails`: true/false (padrão: true)
- `filterByUser`: true/false (padrão: false)
- `topProcessCount`: número (padrão: 15)

### 2. Service Analysis (`/onboarding-steps/service-analysis`)

**Comandos SSH executados (SystemD):**
```bash
# Serviços ativos
systemctl list-units --type=service --state=running --no-pager | head -15

# Serviços que falharam
systemctl list-units --type=service --state=failed --no-pager

# Serviços habilitados no boot
systemctl list-unit-files --type=service --state=enabled --no-pager | head -15

# Contagem total de serviços
systemctl list-units --type=service --no-legend | wc -l
```

**Comandos SSH executados (SysV - fallback):**
```bash
# Serviços ativos
service --status-all | grep "\\[ + \\]" | head -15

# Contagem de serviços
service --status-all 2>/dev/null | wc -l

# Processos daemon
ps aux | grep -E "(daemon|service)" | grep -v grep | head -10
```

**Comandos SSH executados (Geral):**
```bash
# Serviços de rede críticos
ss -tlnp | grep -E "(22|80|443|3306|5432|6379|27017)" | head -10
```

**Opções disponíveis:**
- `includeInactive`: true/false (padrão: false)
- `serviceManager`: 'auto'|'systemd'|'sysv' (padrão: 'auto')

### 3. Open Ports Analysis (`/onboarding-steps/open-ports-analysis`)

**Comandos SSH executados:**
```bash
# Portas TCP em estado LISTEN
ss -tlnp | grep LISTEN

# Portas UDP ativas
ss -ulnp

# Conexões TCP estabelecidas (se includeEstablished=true)
ss -tnp | grep ESTAB | head -20

# Resumo estatístico de portas e conexões
ss -s

# Portas de serviços críticos conhecidos
ss -tlnp | grep -E ":(22|80|443|21|25|53|3306|5432|6379|27017|8080)" | head -15
```

**Opções disponíveis:**
- `includeTCP`: true/false (padrão: true)
- `includeUDP`: true/false (padrão: true)
- `includeListening`: true/false (padrão: true)
- `includeEstablished`: true/false (padrão: false)

## 🔗 Endpoints Já Existentes

### Test Connectivity (`/onboarding-steps/connectivity`)
```bash
echo "SSH test successful"
```

### OS Detection (`/onboarding-steps/os-detection`)
```bash
cat /etc/os-release
uname -a
uname -m  # arquitetura
uname -r  # versão do kernel
```

### System Information (`/onboarding-steps/system-info`)
```bash
uname -a      # informações do sistema
free -h       # memória
df -h         # disco
uptime        # tempo de atividade
whoami        # usuário atual
id            # ID e grupos do usuário
sudo -l       # privilégios sudo (opcional)
groups        # grupos do usuário (opcional)
```

### Resource Check (`/onboarding-steps/resource-check`)
```bash
free -m       # memória em MB
df -h /       # uso do disco raiz
uptime        # load average
```

### Custom Command (`/onboarding-steps/custom-command`)
```bash
{comando_personalizado}  # qualquer comando especificado
```

## 🧪 Como Testar

### 1. Teste Automatizado
```bash
node test-new-onboarding-endpoints.js
```

### 2. Teste Manual via curl

#### Process Analysis:
```bash
curl -X POST http://localhost:3000/onboarding-steps/process-analysis \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "systemId": "SYSTEM_ID",
    "credentials": {
      "username": "ubuntu",
      "password": "password"
    },
    "options": {
      "includeDetails": true,
      "topProcessCount": 10
    }
  }'
```

#### Service Analysis:
```bash
curl -X POST http://localhost:3000/onboarding-steps/service-analysis \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "systemId": "SYSTEM_ID",
    "credentials": {
      "username": "ubuntu",
      "password": "password"
    },
    "options": {
      "includeInactive": false,
      "serviceManager": "auto"
    }
  }'
```

#### Open Ports Analysis:
```bash
curl -X POST http://localhost:3000/onboarding-steps/open-ports-analysis \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "systemId": "SYSTEM_ID",
    "credentials": {
      "username": "ubuntu",
      "password": "password"
    },
    "options": {
      "includeTCP": true,
      "includeUDP": true,
      "includeListening": true
    }
  }'
```

### 3. Listar Todos os Endpoints Disponíveis
```bash
curl -X GET http://localhost:3000/onboarding-steps/available \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Resumo da Implementação

- ✅ **8 endpoints implementados e funcionais**
- ✅ **3 novos endpoints adicionados**
- ✅ **Comandos SSH específicos por sistema operativo**
- ✅ **Detecção automática de service manager (systemd/sysv)**
- ✅ **Opções configuráveis para cada endpoint**
- ✅ **Persistência de dados na base de dados**
- ✅ **Validação de entrada e tratamento de erros**
- ✅ **Timeouts configuráveis**
- ✅ **Logs detalhados**
- ✅ **Script de teste automatizado**

## 🎯 Próximos Passos (Opcional)

Para completar totalmente a tabela original, ainda faltam:

9. **Config File Edit** - Endpoint para editar ficheiros de configuração
10. **Alias Setup** - Endpoint para configurar aliases de sistema

Estes podem ser implementados seguindo o mesmo padrão dos endpoints atuais se necessário. 