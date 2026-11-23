# 📚 Documentação da API Backend

## 🌐 Base URL
```
http://localhost:3000
```

## 🔑 Autenticação
Todos os endpoints (exceto `/auth/register` e `/auth/login`) requerem autenticação via JWT token no header:
```
Authorization: Bearer <jwt_token>
```

## 🌐 CORS Configuration
O servidor está configurado para aceitar requests das seguintes origens:
- `http://localhost:3000` - Backend
- `http://localhost:5173` - **Vite Frontend** ✅
- `http://localhost:3001` - Frontend alternativo
- `http://localhost:4173` - Vite preview
- URLs de produção via variável `FRONTEND_URL`

**Headers permitidos:** `Content-Type`, `Authorization`, `X-Requested-With`
**Métodos permitidos:** `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
**Credentials:** Habilitados (`withCredentials: true`)

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

**Body (Opção 1 - Email):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Body (Opção 2 - Identifier):**
```json
{
  "identifier": "user@example.com",
  "password": "password123"
}
```

> **Nota:** Pode usar tanto `email` quanto `identifier`. O campo `identifier` aceita email ou username.

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

## 📋 **Códigos de Erro Comuns**

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token em falta ou inválido |
| 403 | Forbidden - Sem permissões suficientes |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Email já existe |
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

### 🔧 **Configuração de Requests**

**Fetch API:**
```javascript
// Login request
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  credentials: 'include', // Para cookies/sessions
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

// Authenticated request
const token = localStorage.getItem('authToken');
const profileResponse = await fetch('http://localhost:3000/profile', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
});
```

**Axios Configuration:**
```javascript
// Base configuration
const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Usage
const loginResponse = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});
```

### 📝 **Boas Práticas**

1. **Tokens JWT**: Guardar o token recebido no login e incluir em todos os requests
2. **Roles**: Verificar role do utilizador para mostrar/esconder funcionalidades admin
3. **Error Handling**: Implementar tratamento para todos os códigos de erro
4. **Rate Limiting**: Implementar retry logic para requests que falhem por rate limit
5. **Loading States**: Mostrar indicadores de loading durante requests
6. **Validation**: Validar dados no frontend antes de enviar para a API
7. **CORS**: Usar `withCredentials: true` ou `credentials: 'include'`
8. **Base URL**: Configurar URL base para facilitar mudanças entre dev/prod 