# 📋 ENDPOINTS DE ONBOARDING - Guia Completo

Este guia mostra todos os endpoints disponíveis para aceder aos dados de onboarding que vês no frontend.

## 🔐 Autenticação

Primeiro, faz login para obter o token:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@exemplo.com",
    "password": "Admin123!"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": "...",
      "username": "admin",
      "email": "admin@exemplo.com"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "..."
    }
  }
}
```

**⚠️ Importante:** Guarda o `accessToken` para usar nos próximos requests.

---

## 📊 ENDPOINTS PRINCIPAIS

### 1. 📋 **Listar Todos os Processos de Onboarding**

```bash
curl -X GET http://localhost:3000/onboarding \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Parâmetros opcionais:**
- `?status=completed` - Filtrar por status
- `?page=1&limit=10` - Paginação

**O que retorna:**
- Lista completa de processos
- Status de cada processo
- Progresso em percentagem
- Informações do sistema
- Datas de início/fim
- Usuário que iniciou

---

### 2. 🔍 **Detalhes Completos de um Processo Específico**

```bash
curl -X GET http://localhost:3000/onboarding/6882ab455044f430037d8e56 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**O que retorna (dados que vês no frontend):**
- ✅ **Status geral:** completed, in_progress, failed
- ✅ **Progresso:** 0-100%
- ✅ **Passos detalhados:** Cada passo executado
- ✅ **Outputs completos:** Resultados de cada comando
- ✅ **Duração:** Tempo de execução de cada passo
- ✅ **OS detectado:** Ubuntu, CentOS, etc.
- ✅ **Logs cronológicos:** Histórico completo
- ✅ **Configurações:** Timeouts, retries, etc.

**Exemplo de resposta:**
```json
{
  "success": true,
  "data": {
    "onboarding": {
      "_id": "6882ab455044f430037d8e56",
      "systemId": {
        "name": "JanvsAI-Ubuntu",
        "ip": "203.0.113.10"
      },
      "status": "completed",
      "progress": 100,
      "totalSteps": 3,
      "completedSteps": 3,
      "failedSteps": 0,
      "osInfo": {
        "prettyName": "Ubuntu 24.04.2 LTS",
        "version": "24.04",
        "architecture": "x86_64"
      },
      "steps": [
        {
          "step": "Test Connectivity",
          "command": "ping 203.0.113.10 && test port 22",
          "status": "success",
          "output": "{\"host\":\"203.0.113.10\",\"port\":{\"success\":true...}}",
          "duration": 33154,
          "startedAt": "2025-07-25T09:56:36.039Z"
        },
        {
          "step": "Test Privileges", 
          "command": "sudo -l && whoami && id && groups",
          "status": "success",
          "output": "[{\"command\":\"sudo -l\",\"success\":true...}]",
          "duration": 2706
        },
        {
          "step": "Analyze Running Processes",
          "command": "ps aux --sort=-%mem | head -15",
          "status": "success", 
          "output": "=== Top Processes by Memory ===...",
          "duration": 1854
        }
      ],
      "logs": [
        {
          "timestamp": "2025-07-24T21:53:09.128Z",
          "level": "info",
          "message": "Passo adicionado: System Information"
        }
      ],
      "startedAt": "2025-07-24T21:53:09.103Z",
      "completedAt": "2025-07-24T21:53:09.131Z"
    }
  }
}
```

---

### 3. 🖥️ **Status por Sistema**

```bash
curl -X GET http://localhost:3000/onboarding/system/6882101cd96c7f1f265e0de4 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 4. 📚 **Passos Disponíveis**

```bash
curl -X GET http://localhost:3000/onboarding-steps/available \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Retorna:**
- Test Connectivity
- OS Detection  
- System Information
- Process Analysis
- Service Analysis
- Open Ports Analysis
- Resource Check
- Custom Command

---

## 🔧 ENDPOINTS ESPECÍFICOS POR PASSO

### **Test Connectivity**
```bash
curl -X POST http://localhost:3000/onboarding-steps/connectivity \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "203.0.113.10",
    "port": 22,
    "options": {
      "pingCount": 4,
      "includeTraceroute": false
    }
  }'
```

### **Test Privileges**
```bash
curl -X POST http://localhost:3000/onboarding-steps/privileges-test \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "systemId": "6882101cd96c7f1f265e0de4",
    "credentials": {
      "username": "root",
      "password": "sua_senha"
    }
  }'
```

---

## 📈 COMO OBTER DADOS ESPECÍFICOS

### **Para replicar o frontend:**

1. **Lista inicial:** `GET /onboarding` - Mostra todos os processos
2. **Detalhes:** `GET /onboarding/{id}` - Dados completos de um processo
3. **Passos:** Dentro da resposta do passo 2, no campo `steps[]`
4. **Outputs:** Dentro de cada step, no campo `output`
5. **Logs:** Dentro da resposta, no campo `logs[]`

### **Dados que correspondem ao frontend:**

| Frontend | Campo na API |
|----------|-------------|
| "Test Connectivity" | `steps[0].step` |
| "Complete" | `steps[0].status` |
| "33154ms" | `steps[0].duration` |
| Output JSON | `steps[0].output` |
| "25/07/2025, 10:57:09" | `steps[0].startedAt` |

---

## 🎯 EXEMPLO PRÁTICO

Para obter exactamente os dados que vês no frontend:

```bash
# 1. Fazer login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@exemplo.com","password":"Admin123!"}' \
  | jq -r '.data.tokens.accessToken')

# 2. Obter ID do processo (do MongoDB Compass)
ONBOARDING_ID="6882ab455044f430037d8e56"

# 3. Obter todos os detalhes
curl -X GET "http://localhost:3000/onboarding/$ONBOARDING_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.onboarding'
```

---

## ✅ CONFIRMAÇÃO

Os dados **ESTÃO TODOS** na base de dados e acessíveis via API:

- ✅ Status e progresso dos processos
- ✅ Detalhes de cada passo executado  
- ✅ Outputs completos em JSON
- ✅ Duração precisa de cada comando
- ✅ Timestamps de execução
- ✅ Logs cronológicos
- ✅ Informações do OS detectado
- ✅ Configurações de retry/timeout

**O frontend obtém TODOS estes dados através destes endpoints!** 🚀 