# API de Autenticação Node.js

API robusta de autenticação com JWT, construída com Node.js e Express.

## 🚀 Funcionalidades

- ✅ Registo e login de utilizadores
- ✅ Autenticação JWT com access/refresh tokens
- ✅ Gestão de passwords (alteração e reset)
- ✅ Middleware de autenticação
- ✅ Validação de dados
- ✅ Rate limiting
- ✅ Segurança com Helmet
- ✅ Hash de passwords com bcrypt
- ✅ **Geração de planos de teste com IA**
- ✅ **Análise de riscos automatizada**
- ✅ **Cenários pré-definidos de teste**

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- MongoDB
- npm ou yarn

## 🔧 Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um ficheiro `.env` na raiz do projeto:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/auth-api

# JWT Secrets (use strong random strings in production)
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# JWT Expiration times
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# AI Server (para Issue Solver)
AI_SERVER_URL=http://localhost:3001

# OpenAI Configuration (para funcionalidades de IA)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Email Configuration (for password reset emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### 3. Executar o servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🛠️ Endpoints da API

### Autenticação

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/auth/register` | Registar novo utilizador | ❌ |
| POST | `/auth/login` | Login com email ou username | ❌ |
| POST | `/auth/logout` | Logout (invalida refresh token) | ✅ |
| POST | `/auth/refresh` | Refresh do access token | ❌ |
| GET | `/auth/me` | Dados do utilizador autenticado | ✅ |

### Gestão de Passwords

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/auth/request-password-reset` | Envia email com token para reset | ❌ |
| POST | `/auth/reset-password` | Submete nova password com token | ❌ |
| POST | `/auth/change-password` | Alterar password (requer password atual) | ✅ |

### Inteligência Artificial

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | `/ai/generate-test-plan` | Gera plano de teste completo | ✅ |
| POST | `/ai/generate-test-cases` | Gera casos de teste específicos | ✅ |
| POST | `/ai/analyze-risks` | Análise de riscos do sistema | ✅ |
| POST | `/ai/generate-from-scenario` | Gera plano baseado em cenário pré-definido | ✅ |
| GET | `/ai/info` | Informações do motor de IA | ✅ |
| POST | `/ai/test-connection` | Testa conexão com OpenAI | ✅ |
| GET | `/ai/history` | Histórico de gerações | ✅ |
| DELETE | `/ai/history` | Limpa histórico de gerações | ✅ |
| GET | `/ai/scenarios` | Lista cenários pré-definidos | ✅ |

### Utilitários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check do servidor |

## 📚 Exemplos de Uso

### Registo de Utilizador

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "Password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "Password123"
  }'
```

### Acesso a Endpoint Protegido

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Gerar Plano de Teste com IA

```bash
curl -X POST http://localhost:3000/ai/generate-test-plan \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "E-commerce Platform",
    "description": "Sistema de comércio eletrônico com autenticação, carrinho de compras e pagamentos",
    "features": [
      "Autenticação de utilizadores",
      "Gestão de produtos",
      "Carrinho de compras",
      "Processamento de pagamentos"
    ],
    "complexity": "medium",
    "timeframe": "2 weeks"
  }'
```

### Gerar Casos de Teste Específicos

```bash
curl -X POST http://localhost:3000/ai/generate-test-cases \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feature": "Login de utilizador",
    "description": "Sistema de autenticação com email/password",
    "testTypes": ["functional", "security"],
    "count": 5
  }'
```

### Análise de Riscos

```bash
curl -X POST http://localhost:3000/ai/analyze-risks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Banking Application",
    "description": "Aplicação bancária móvel com transferências e consultas",
    "criticalFeatures": [
      "Autenticação biométrica",
      "Transferências monetárias",
      "Consulta de saldos"
    ]
  }'
```

### Gerar por Cenário Pré-definido

```bash
curl -X POST http://localhost:3000/ai/generate-from-scenario \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "webApplication",
    "customization": {
      "projectName": "CRM System",
      "additionalFeatures": ["Relatórios", "Integração CRM"]
    }
  }'
```

### Listar Cenários Disponíveis

```bash
curl -X GET http://localhost:3000/ai/scenarios \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔒 Segurança

- **Access Tokens**: 15 minutos de validade
- **Refresh Tokens**: 30 dias de validade
- **Rate Limiting**: 10 tentativas de auth por 15 minutos
- **Password Hashing**: bcrypt com salt rounds 12
- **Helmet**: Headers de segurança HTTP
- **CORS**: Configurado para origem específica

## 🏗️ Estrutura do Projeto

```
backend/
├── ai/
│   ├── engines/
│   │   └── openai.js        # Integração com OpenAI
│   ├── prompts/
│   │   └── test_plan.js     # Templates de prompts
│   ├── generatePlan.js      # Gerador principal de planos
│   └── example.js           # Exemplos de uso
├── config/
│   └── database.js          # Configuração MongoDB
├── controllers/
│   ├── authController.js    # Controladores de autenticação
│   └── aiController.js      # Controladores de IA
├── middleware/
│   └── auth.js              # Middleware de autenticação
├── models/
│   └── User.js              # Modelo de utilizador
├── routes/
│   ├── auth.js              # Rotas de autenticação
│   └── ai.js                # Rotas de IA
├── utils/
│   └── jwt.js               # Utilitários JWT
├── validators/
│   └── auth.js              # Validadores de dados
├── package.json
├── server.js                # Servidor principal
├── README.md
└── AI-DOCUMENTATION.md      # Documentação detalhada da IA
```

## 🤖 Funcionalidades de IA

### Geração de Planos de Teste
- Análise automática de requisitos
- Estruturação em test suites e casos de teste
- Estimativas de tempo e recursos
- Análise de riscos integrada

### Cenários Pré-definidos
- **webApplication**: Aplicações web com autenticação e dashboard
- **apiTesting**: Testes de APIs REST com JWT e CRUD
- **mobileApp**: Aplicações móveis com sincronização offline

### Modelos Suportados
- GPT-4o-mini (recomendado para custo-benefício)
- GPT-4 (máxima qualidade)
- GPT-3.5-turbo (alternativa económica)

### Estimativas de Custo (OpenAI)
- GPT-4o-mini: ~$0.02-0.05 por plano de teste completo
- GPT-4: ~$0.12-0.24 por plano de teste completo
- GPT-3.5-turbo: ~$0.01-0.03 por plano de teste completo

## 🧪 Testes

```bash
# Executar testes (quando implementados)
npm test

# Testar conexão com IA
curl -X POST http://localhost:3000/ai/test-connection \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📝 Notas de Desenvolvimento

- Todos os endpoints retornam JSON com estrutura consistente
- Mensagens de erro em português
- Refresh tokens são limpos automaticamente após 30 dias
- Tokens de reset de password expiram em 10 minutos
- Validação robusta de dados de entrada

## 🔄 Fluxo de Autenticação

1. **Registo/Login**: Utilizador recebe access token (15min) e refresh token (30d)
2. **Acesso**: Utiliza access token no header `Authorization: Bearer TOKEN`
3. **Renovação**: Quando access token expira, usa refresh token para obter novos tokens
4. **Logout**: Invalida refresh token específico
5. **Reset Password**: Gera token temporário enviado por email

## 🚀 Produção

Para produção, certifique-se de:

- Usar secrets JWT fortes e únicos
- Configurar MongoDB em cluster
- **Configurar chave OpenAI válida com créditos suficientes**
- **Monitorizar uso da API OpenAI para controlo de custos**
- Implementar sistema de emails para reset de passwords
- Adicionar logging estruturado
- Configurar HTTPS
- Implementar monitorização

## 📖 Documentação Adicional

- **AI-DOCUMENTATION.md**: Documentação detalhada das funcionalidades de IA
- **ai/example.js**: Exemplos práticos de uso da IA
- Swagger UI disponível em `/api-docs` (quando servidor estiver ativo)

## 📞 Suporte

Para questões ou problemas, consulte a documentação ou contacte o desenvolvedor. 

## 🔗 Onboarding Steps (Passos de Integração)

### Endpoints de Onboarding Implementados

| Método | Endpoint | Descrição | Status | Comandos SSH |
|--------|----------|-----------|--------|-------------|
| POST | `/onboarding-steps/connectivity` | Teste de conectividade básica | ✅ | `ping -c 4 {host}`, `echo "SSH test successful"` |
| POST | `/onboarding-steps/os-detection` | Detecção de sistema operativo | ✅ | `cat /etc/os-release`, `uname -a`, `uname -m`, `uname -r` |
| POST | `/onboarding-steps/system-info` | Informações e privilégios do sistema | ✅ | `uname -a`, `free -h`, `df -h`, `uptime`, `whoami`, `id`, `sudo -l`, `groups` |
| **POST** | **`/onboarding-steps/process-analysis`** | **🆕 Análise de processos em execução** | **✅** | `ps aux --sort=-%mem`, `ps aux --sort=-%cpu`, `ps aux | wc -l` |
| **POST** | **`/onboarding-steps/service-analysis`** | **🆕 Análise de serviços do sistema** | **✅** | `systemctl list-units --type=service`, `service --status-all`, `ss -tlnp` |
| **POST** | **`/onboarding-steps/open-ports-analysis`** | **🆕 Análise de portas abertas** | **✅** | `ss -tlnp | grep LISTEN`, `ss -ulnp`, `ss -s`, `netstat -tulnp` |
| POST | `/onboarding-steps/resource-check` | Verificação de recursos (RAM, CPU, Disco) | ✅ | `free -m`, `df -h /`, `uptime` |
| POST | `/onboarding-steps/custom-command` | Execução de comando personalizado | ✅ | `{comando_personalizado}` |
| GET | `/onboarding-steps/available` | Lista todos os passos disponíveis | ✅ | - |

### 🆕 Novos Endpoints Implementados

#### 1. **Process Analysis** - Análise de Processos
```bash
POST /onboarding-steps/process-analysis
```

**Body:**
```json
{
  "systemId": "sistema-id",
  "credentials": {
    "username": "ubuntu",
    "password": "senha"
  },
  "options": {
    "includeDetails": true,
    "filterByUser": false,
    "topProcessCount": 15
  }
}
```

**Comandos executados:**
- `ps aux --sort=-%mem | head -15` - Top processos por memória
- `ps aux --sort=-%cpu | head -15` - Top processos por CPU  
- `ps aux | wc -l` - Contagem total de processos
- `ps -u {user} -o pid,ppid,%cpu,%mem,command --sort=-%mem` - Processos do usuário

#### 2. **Service Analysis** - Análise de Serviços
```bash
POST /onboarding-steps/service-analysis
```

**Body:**
```json
{
  "systemId": "sistema-id", 
  "credentials": {
    "username": "ubuntu",
    "password": "senha"
  },
  "options": {
    "includeInactive": false,
    "serviceManager": "auto"
  }
}
```

**Comandos executados:**
- `systemctl list-units --type=service --state=running --no-pager` - Serviços ativos (systemd)
- `systemctl list-units --type=service --state=failed --no-pager` - Serviços falhos
- `service --status-all | grep "\\[ + \\]"` - Serviços ativos (SysV)
- `ss -tlnp | grep -E "(22|80|443|3306|5432)"` - Serviços de rede críticos

#### 3. **Open Ports Analysis** - Análise de Portas Abertas
```bash
POST /onboarding-steps/open-ports-analysis
```

**Body:**
```json
{
  "systemId": "sistema-id",
  "credentials": {
    "username": "ubuntu", 
    "password": "senha"
  },
  "options": {
    "includeTCP": true,
    "includeUDP": true,
    "includeListening": true,
    "includeEstablished": false
  }
}
```

**Comandos executados:**
- `ss -tlnp | grep LISTEN` - Portas TCP em listening  
- `ss -ulnp` - Portas UDP ativas
- `ss -tnp | grep ESTAB` - Conexões TCP estabelecidas
- `ss -s` - Resumo estatístico de portas
- `ss -tlnp | grep -E ":(22|80|443|21|25|53|3306|5432)"` - Portas críticas

### 🧪 Como Testar

Execute o script de teste dos novos endpoints:

```bash
node test-new-onboarding-endpoints.js
```

**Configuração necessária:**
1. Altere as credenciais SSH no arquivo de teste
2. Configure um servidor SSH válido para teste
3. Execute o script para validar todos os endpoints 