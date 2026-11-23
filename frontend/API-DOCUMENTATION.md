# 📚 Documentação da API Backend

## ⚠️ **ENDPOINTS DISPONÍVEIS**

### ✅ Endpoints Implementados e Funcionais
- `/auth/*` - Autenticação (register, login, logout, refresh)
- `/profile/*` - Gestão de perfil do utilizador
- `/admin/*` - Administração de utilizadores (admin apenas)
- `/settings/*` - Configurações do sistema (admin apenas)
- `/systems/health` - Health check do sistema
- `/systems/stats` - Estatísticas do sistema
- `/systems` - **Gestão de sistemas** (listar, criar)

### 🚫 REGRA CRÍTICA
**APENAS usar endpoints que estejam implementados e funcionais no backend.**
**NUNCA implementar funcionalidades com dados mock ou fallback.**

### ✅ TODOS OS ENDPOINTS DE ONBOARDING IMPLEMENTADOS!

**NOTA:** O teste de privilégios usa o endpoint `/onboarding-steps/system-info` (já implementado)

**🎉 ATUALIZAÇÃO:** Os seguintes endpoints foram implementados no backend:
- ✅ `/onboarding-steps/process-analysis` - Análise de processos
- ✅ `/onboarding-steps/service-analysis` - Análise de serviços  
- ✅ `/onboarding-steps/open-ports-analysis` - Análise de portas abertas

---

## 🌐 Base URL
```
http://localhost:3000
```

## 🔑 Autenticação
Todos os endpoints (exceto `/auth/register` e `/auth/login`) requerem autenticação via JWT token no header:
```
Authorization: Bearer <jwt_token>
```

---

## 🔐 **AUTENTICAÇÃO** (`/auth`)

### 1. Registo de Utilizador
```http
POST /auth/register
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "Nome do Utilizador"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Utilizador criado com sucesso",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "displayName": "Nome do Utilizador",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login
```http
POST /auth/login
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login efectuado com sucesso",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "displayName": "Nome do Utilizador",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout efectuado com sucesso"
}
```

### 4. Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 👤 **PERFIL DO UTILIZADOR** (`/profile`)

### 1. Obter Perfil
```http
GET /profile
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "displayName": "Nome do Utilizador",
    "team": "Frontend",
    "role": "user",
    "lastLoginAt": "2023-12-07T10:30:00.000Z"
  }
}
```

### 2. Actualizar Perfil
```http
PUT /profile
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "displayName": "Novo Nome",
  "email": "novoemail@example.com",
  "team": "Backend"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Perfil actualizado com sucesso",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "novoemail@example.com",
    "displayName": "Novo Nome",
    "team": "Backend",
    "role": "user"
  }
}
```

### 3. Obter Preferências
```http
GET /profile/preferences
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": {
      "testCompletion": true,
      "systemAlerts": true,
      "emailReports": false
    },
    "appearance": {
      "theme": "dark",
      "accentColor": "#007bff"
    },
    "advanced": {
      "debugMode": false,
      "detailedLogs": true
    }
  }
}
```

### 4. Actualizar Preferências
```http
PUT /profile/preferences
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "notifications": {
    "testCompletion": false,
    "systemAlerts": true,
    "emailReports": true
  },
  "appearance": {
    "theme": "light",
    "accentColor": "#28a745"
  },
  "advanced": {
    "debugMode": true,
    "detailedLogs": false
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Preferências actualizadas com sucesso",
  "data": {
    "notifications": {
      "testCompletion": false,
      "systemAlerts": true,
      "emailReports": true
    },
    "appearance": {
      "theme": "light",
      "accentColor": "#28a745"
    },
    "advanced": {
      "debugMode": true,
      "detailedLogs": false
    }
  }
}
```

---

## ⚙️ **CONFIGURAÇÕES DO SISTEMA** (`/settings`) - **ADMIN APENAS**

### 1. Obter Todas as Configurações
```http
GET /settings
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "database": {
      "backupFrequency": "daily",
      "autoCleanup": true,
      "retentionDays": 30
    },
    "security": {
      "sessionTimeout": 3600,
      "maxLoginAttempts": 5,
      "passwordExpiration": 90,
      "twoFactorRequired": false
    },
    "system": {
      "maintenanceMode": false,
      "allowRegistration": true,
      "defaultUserRole": "user"
    },
    "notifications": {
      "emailEnabled": true,
      "slackEnabled": false,
      "discordEnabled": false
    },
    "monitoring": {
      "logLevel": "info",
      "enableMetrics": true,
      "alertThresholds": {
        "cpu": 80,
        "memory": 85,
        "disk": 90
      }
    }
  }
}
```

### 2. Resumo das Configurações
```http
GET /settings/summary
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "systemStatus": "operational",
    "lastBackup": "2023-12-07T02:00:00.000Z",
    "activeUsers": 25,
    "totalUsers": 150,
    "systemHealth": {
      "cpu": 45,
      "memory": 62,
      "disk": 38
    }
  }
}
```

### 3. Actualizar Configurações de Base de Dados
```http
PUT /settings/database
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "backupFrequency": "weekly",
  "autoCleanup": false,
  "retentionDays": 60
}
```

### 4. Actualizar Configurações de Aparência
```http
PUT /settings/appearance
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "defaultTheme": "light",
  "defaultAccentColor": "#007bff",
  "allowCustomThemes": true
}
```

### 5. Actualizar Configurações Avançadas
```http
PUT /settings/advanced
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "debugMode": true,
  "detailedLogs": true,
  "maintenanceMode": false
}
```

### 6. Actualizar Configurações de Segurança
```http
PUT /settings/security
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "sessionTimeout": 7200,
  "maxLoginAttempts": 3,
  "passwordExpiration": 60,
  "twoFactorRequired": true
}
```

### 7. Exportar Configurações
```http
GET /settings/export
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "exportDate": "2023-12-07T15:30:00.000Z",
    "settings": {
      "database": { ... },
      "security": { ... },
      "system": { ... }
    }
  }
}
```

### 8. Importar Configurações
```http
POST /settings/import
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "settings": {
    "database": {
      "backupFrequency": "daily",
      "autoCleanup": true
    },
    "security": {
      "sessionTimeout": 3600
    }
  }
}
```

---

## 👥 **ADMINISTRAÇÃO** (`/admin`) - **ADMIN APENAS**

### 1. Listar Utilizadores
```http
GET /admin/users?page=1&limit=10
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "displayName": "Nome do Utilizador",
        "role": "user",
        "team": "Frontend",
        "isActive": true,
        "lastLoginAt": "2023-12-07T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUsers": 50
    }
  }
}
```

### 2. Criar Utilizador
```http
POST /admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "displayName": "Novo Utilizador",
  "role": "user",
  "team": "Backend"
}
```

### 3. Actualizar Utilizador
```http
PUT /admin/users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "displayName": "Nome Actualizado",
  "role": "editor",
  "team": "QA",
  "isActive": false
}
```

### 4. Eliminar Utilizador
```http
DELETE /admin/users/:id
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Utilizador eliminado com sucesso"
}
```

---

## 🔧 **SISTEMA** (`/systems`)

### 1. Health Check
```http
GET /systems/health
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-07T15:30:00.000Z",
    "uptime": 86400,
    "database": "connected"
  }
}
```

### 2. Estatísticas do Sistema
```http
GET /systems/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "activeUsers": 25,
    "totalRequests": 15420,
    "systemLoad": {
      "cpu": 45,
      "memory": 62,
      "disk": 38
    },
    "lastUpdated": "2023-12-07T15:30:00.000Z"
  }
}
```

---

## 🖥️ **GESTÃO DE SISTEMAS** (`/systems`)

### 1. Listar Sistemas
```http
GET /systems?page=1&limit=20&status=online&environment=production
Authorization: Bearer <token>
```

**Parâmetros de Query:**
- `page`: Número da página (padrão: 1)
- `limit`: Sistemas por página (máximo: 100)
- `status`: `online` | `offline` | `maintenance` | `unknown`
- `environment`: `production` | `staging` | `development` | `testing`
- `owner`: Nome do responsável
- `search`: Pesquisar em nome, IP, descrição
- `sortBy`: `name` | `ip` | `status` | `environment` | `createdAt`
- `sortOrder`: `asc` | `desc`

**Response (200):**
```json
{
  "success": true,
  "message": "Lista de sistemas obtida com sucesso",
  "data": {
    "systems": [
      {
        "_id": "64a123456789abcdef012345",
        "name": "Production Web Server",
        "ip": "192.168.1.100",
        "status": "online",
        "os": "Ubuntu 22.04 LTS",
        "owner": "João Silva",
        "environment": "production",
        "description": "Servidor principal da aplicação web",
        "port": 443,
        "protocol": "https",
        "tags": ["web", "production", "critical"],
        "monitoringEnabled": true,
        "alertsEnabled": true,
        "createdAt": "2023-12-07T10:00:00.000Z",
        "updatedAt": "2023-12-07T15:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalSystems": 25
    }
  }
}
```

### 2. Criar Sistema (Admin apenas)
```http
POST /systems
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body (campos obrigatórios):**
```json
{
  "name": "Novo Servidor",
  "ip": "192.168.1.200",
  "os": "Ubuntu 22.04",
  "owner": "Teu Nome"
}
```

**Body (completo):**
```json
{
  "name": "API Production Server",
  "ip": "192.168.1.200",
  "os": "Ubuntu 22.04 LTS",
  "owner": "DevOps Team",
  "description": "Servidor principal da API de produção",
  "environment": "production",
  "status": "online",
  "port": 443,
  "protocol": "https",
  "tags": ["api", "production", "critical"],
  "monitoringEnabled": true,
  "alertsEnabled": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Sistema \"API Production Server\" criado com sucesso",
  "data": {
    "system": {
      "_id": "64a987654321abcdef012345",
      "name": "API Production Server",
      "ip": "192.168.1.200",
      "status": "unknown",
      "os": "Ubuntu 22.04 LTS",
      "owner": "DevOps Team",
      "environment": "production",
      "description": "Servidor principal da API de produção",
      "port": 443,
      "protocol": "https",
      "tags": ["api", "production", "critical"],
      "monitoringEnabled": true,
      "alertsEnabled": true,
      "createdAt": "2023-12-07T16:30:00.000Z"
    }
  }
}
```

---

## 🔧 **ONBOARDING STEPS** (`/onboarding-steps`) - **PENDENTES**

### 1. Teste de Privilégios
**NOTA:** O teste de privilégios utiliza o endpoint `/onboarding-steps/system-info` (já implementado).

```http
POST /onboarding-steps/system-info
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "systemId": "64a123456789abcdef012345",
  "credentials": {
    "username": "root",
    "password": "senha123"
  },
  "commands": ["sudo -l", "whoami", "id"]
}
```

**Response (200):** (Usa a estrutura padrão do system-info endpoint)

### 2. Análise de Processos ✅ IMPLEMENTADO
```http
POST /onboarding-steps/process-analysis
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "systemId": "64a123456789abcdef012345",
  "credentials": {
    "username": "root",
    "password": "senha123"
  },
  "options": {
    "includeDetails": true,
    "filterByUser": false
  }
}
```

**Comandos SSH executados:**
- `ps aux --sort=-%mem` - Processos ordenados por uso de memória
- `ps aux --sort=-%cpu` - Processos ordenados por uso de CPU  
- `ps aux | wc -l` - Contagem total de processos

**Response (200):**
```json
{
  "success": true,
  "message": "Process analysis completed",
  "data": {
    "step": {
      "name": "process-analysis",
      "status": "success",
      "command": "ps aux --sort=-%mem && ps aux --sort=-%cpu",
      "output": "Process listing...",
      "duration": 1200,
      "timestamp": "2023-12-07T15:30:00.000Z"
    },
    "processes": {
      "totalProcesses": 142,
      "runningProcesses": 15,
      "highCpuProcesses": 3,
      "topProcesses": [
        {
          "pid": 1234,
          "name": "nginx",
          "cpu": 12.5,
          "memory": 8.2,
          "user": "www-data"
        }
      ]
    }
  }
}
```

### 3. Análise de Serviços ✅ IMPLEMENTADO
```http
POST /onboarding-steps/service-analysis
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "systemId": "64a123456789abcdef012345",
  "credentials": {
    "username": "root",
    "password": "senha123"
  },
  "options": {
    "includeInactive": false,
    "serviceManager": "systemd"
  }
}
```

**Comandos SSH executados:**
- `systemctl list-units --type=service` - Lista serviços systemd
- `service --status-all` - Status de todos os serviços 
- `ss -tlnp` - Conexões TCP com processos

**Response (200):**
```json
{
  "success": true,
  "message": "Service analysis completed",
  "data": {
    "step": {
      "name": "service-analysis",
      "status": "success",
      "command": "systemctl list-units --type=service",
      "output": "Service listing...",
      "duration": 950,
      "timestamp": "2023-12-07T15:30:00.000Z"
    },
    "services": {
      "totalServices": 68,
      "activeServices": 45,
      "failedServices": 2,
      "criticalServices": [
        {
          "name": "nginx.service",
          "status": "active",
          "uptime": "2 days 5h 30m"
        },
        {
          "name": "mysql.service", 
          "status": "failed",
          "error": "Connection refused"
        }
      ]
    }
  }
}
```

### 4. Análise de Portas Abertas ✅ IMPLEMENTADO
```http
POST /onboarding-steps/open-ports-analysis
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "systemId": "64a123456789abcdef012345",
  "credentials": {
    "username": "root",
    "password": "senha123"
  },
  "options": {
    "includeTCP": true,
    "includeUDP": true,
    "includeListening": true
  }
}
```

**Comandos SSH executados:**
- `ss -tlnp | grep LISTEN` - Portas TCP em escuta
- `ss -ulnp` - Portas UDP abertas
- `ss -s` - Estatísticas de sockets
- `lsof -i` - Arquivos abertos de rede

**Response (200):**
```json
{
  "success": true,
  "message": "Open ports analysis completed",
  "data": {
    "step": {
      "name": "open-ports-analysis",
      "status": "success",
      "command": "ss -tlnp | grep LISTEN && ss -ulnp",
      "output": "Port listing...",
      "duration": 750,
      "timestamp": "2023-12-07T15:30:00.000Z"
    },
    "ports": {
      "totalOpenPorts": 12,
      "tcpPorts": 8,
      "udpPorts": 4,
      "openPorts": [
        {
          "port": 22,
          "protocol": "tcp",
          "service": "ssh",
          "process": "sshd",
          "pid": 1145
        },
        {
          "port": 80,
          "protocol": "tcp", 
          "service": "http",
          "process": "nginx",
          "pid": 2234
        }
      ]
    }
  }
}
```

---

## 🎉 **SEQUÊNCIA COMPLETA DE ONBOARDING (ATUALIZADA)**

### **✅ TODOS OS ENDPOINTS PRINCIPAIS IMPLEMENTADOS!**

| # | Step Name | Endpoint | Status | Comandos SSH |
|---|-----------|----------|--------|--------------|
| 1 | **Test Connectivity** | `/onboarding-steps/connectivity` | ✅ Funcionando | ping, port test, traceroute |
| 2 | **Test Privileges** | `/onboarding-steps/system-info` | ✅ Funcionando | `sudo -l`, `whoami`, `id`, `groups` |
| 3 | **Analyze Processes** | `/onboarding-steps/process-analysis` | ✅ **NOVO!** | `ps aux --sort=-%mem`, `ps aux --sort=-%cpu` |
| 4 | **Analyze Services** | `/onboarding-steps/service-analysis` | ✅ **NOVO!** | `systemctl list-units`, `service --status-all` |
| 5 | **Analyze Open Ports** | `/onboarding-steps/open-ports-analysis` | ✅ **NOVO!** | `ss -tlnp`, `ss -ulnp`, `lsof -i` |
| 6 | **OS Detection** | `/onboarding-steps/os-detection` | ✅ Funcionando | OS information commands |
| 7 | **System Information** | `/onboarding-steps/system-info` | ✅ Funcionando | `uname -a`, `hostname`, `uptime` |
| 8 | **Resource Check** | `/onboarding-steps/resource-check` | ✅ Funcionando | CPU, memory, disk checks |

### **🔄 SEQUÊNCIA DE EXECUÇÃO:**
1. `POST /onboarding-execution/test-connection` *(pré-teste)*
2. `POST /onboarding-steps/connectivity`
3. `POST /onboarding-steps/system-info` *(privilégios)*
4. `POST /onboarding-steps/process-analysis` ✅
5. `POST /onboarding-steps/service-analysis` ✅
6. `POST /onboarding-steps/open-ports-analysis` ✅
7. `POST /onboarding-steps/os-detection`
8. `POST /onboarding-steps/system-info` *(info geral)*
9. `POST /onboarding-steps/resource-check`

**Resultado esperado**: **8/8 steps executam com sucesso!** 🎉

---

## 📋 **Códigos de Erro Comuns**

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token em falta ou inválido |
| 403 | Forbidden - Sem permissões suficientes |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - IP já existe |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro interno |

---

## 🛡️ **Rate Limiting**
- Endpoints de autenticação: 5 requests/minuto
- Outros endpoints: 100 requests/minuto

---

## 📖 **Swagger Documentation**
Interface interactiva disponível em: `http://localhost:3000/api-docs`

---

## 💡 **Notas para o Frontend**

1. **Tokens JWT**: Guardar o token recebido no login e incluir em todos os requests
2. **Roles**: Verificar role do utilizador para mostrar/esconder funcionalidades admin
3. **Error Handling**: Implementar tratamento para todos os códigos de erro
4. **Rate Limiting**: Implementar retry logic para requests que falhem por rate limit
5. **Loading States**: Mostrar indicadores de loading durante requests
6. **Validation**: Validar dados no frontend antes de enviar para a API
7. **NO MOCK DATA**: NUNCA usar dados mock ou fallback - apenas APIs reais
8. **Campos obrigatórios**: `name`, `ip`, `os`, `owner` são obrigatórios para criar sistemas
9. **IP único**: Não pode haver dois sistemas com o mesmo IP