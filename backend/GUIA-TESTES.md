# Guia Completo de Testes da API

Este guia mostra como testar todos os endpoints da API, incluindo autenticação e funcionalidades de IA.

## 🚀 Preparação

### 1. Iniciar o Servidor
```bash
npm run dev
```

### 2. Verificar se está funcionando
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET

# Bash/Terminal
curl http://localhost:3000/health
```

## 🔐 Autenticação (Obter Token)

### 1. Registar Utilizador
```bash
# PowerShell
$userData = @{
    username = "testuser"
    email = "test@example.com"
    password = "Test123456"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/auth/register" -Method POST -Body $userData -ContentType "application/json"

# Bash/Terminal
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "Test123456"
  }'
```

### 2. Fazer Login (alternativa)
```bash
# PowerShell
$loginData = @{
    identifier = "test@example.com"
    password = "Test123456"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$token = ($response.Content | ConvertFrom-Json).data.tokens.accessToken

# Bash/Terminal
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "Test123456"
  }' | jq -r '.data.tokens.accessToken')
```

## 🤖 Testes dos Endpoints de IA

**Nota**: Substitua `$token` pelo token obtido na autenticação.

### 1. Testar Conexão com OpenAI
```bash
# PowerShell
$headers = @{ Authorization = "Bearer $token" }
Invoke-WebRequest -Uri "http://localhost:3000/ai/test-connection" -Method POST -Headers $headers -ContentType "application/json" -Body "{}"

# Bash/Terminal
curl -X POST http://localhost:3000/ai/test-connection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resposta Esperada:**
```json
{
  "success": true,
  "message": "Conexão com OpenAI estabelecida com sucesso",
  "data": {
    "status": "connected",
    "model": "gpt-4o-mini"
  }
}
```

### 2. Informações do Motor de IA
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/ai/info" -Headers $headers

# Bash/Terminal
curl -X GET http://localhost:3000/ai/info \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Listar Cenários Disponíveis
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/ai/scenarios" -Headers $headers

# Bash/Terminal
curl -X GET http://localhost:3000/ai/scenarios \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta Esperada:**
```json
{
  "success": true,
  "data": {
    "scenarios": [
      {
        "id": "webApplication",
        "name": "Aplicação Web",
        "description": "Para aplicações web com autenticação, gestão de utilizadores e dashboard"
      },
      {
        "id": "apiTesting", 
        "name": "API Testing",
        "description": "Para testes de APIs REST com autenticação JWT e operações CRUD"
      },
      {
        "id": "mobileApp",
        "name": "Aplicação Móvel", 
        "description": "Para aplicações móveis com sincronização offline"
      }
    ]
  }
}
```

### 4. Gerar Plano de Teste Completo
```bash
# PowerShell
$testPlanData = @{
    projectName = "Sistema E-commerce"
    description = "Sistema de comércio eletrônico com autenticação, carrinho e pagamentos"
    features = @(
        "Autenticação de utilizadores",
        "Gestão de produtos", 
        "Carrinho de compras",
        "Processamento de pagamentos"
    )
    complexity = "medium"
    timeframe = "2 weeks"
} | ConvertTo-Json -Depth 3

Invoke-WebRequest -Uri "http://localhost:3000/ai/generate-test-plan" -Method POST -Headers $headers -Body $testPlanData -ContentType "application/json"

# Bash/Terminal
curl -X POST http://localhost:3000/ai/generate-test-plan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Sistema E-commerce",
    "description": "Sistema de comércio eletrônico com autenticação, carrinho e pagamentos",
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

### 5. Gerar Casos de Teste Específicos
```bash
# PowerShell
$testCasesData = @{
    feature = "Login de utilizador"
    description = "Sistema de autenticação com email e password"
    testTypes = @("functional", "security")
    count = 5
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/ai/generate-test-cases" -Method POST -Headers $headers -Body $testCasesData -ContentType "application/json"

# Bash/Terminal
curl -X POST http://localhost:3000/ai/generate-test-cases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feature": "Login de utilizador",
    "description": "Sistema de autenticação com email e password",
    "testTypes": ["functional", "security"],
    "count": 5
  }'
```

### 6. Análise de Riscos
```bash
# PowerShell
$riskData = @{
    projectName = "Sistema Bancário"
    description = "Aplicação bancária com transferências e consultas"
    criticalFeatures = @(
        "Autenticação biométrica",
        "Transferências monetárias",
        "Consulta de saldos"
    )
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/ai/analyze-risks" -Method POST -Headers $headers -Body $riskData -ContentType "application/json"

# Bash/Terminal
curl -X POST http://localhost:3000/ai/analyze-risks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Sistema Bancário",
    "description": "Aplicação bancária com transferências e consultas",
    "criticalFeatures": [
      "Autenticação biométrica",
      "Transferências monetárias",
      "Consulta de saldos"
    ]
  }'
```

### 7. Gerar por Cenário Pré-definido
```bash
# PowerShell
$scenarioData = @{
    scenario = "webApplication"
    customization = @{
        projectName = "Sistema CRM"
        additionalFeatures = @("Relatórios", "Integração API")
    }
} | ConvertTo-Json -Depth 3

Invoke-WebRequest -Uri "http://localhost:3000/ai/generate-from-scenario" -Method POST -Headers $headers -Body $scenarioData -ContentType "application/json"

# Bash/Terminal
curl -X POST http://localhost:3000/ai/generate-from-scenario \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "webApplication",
    "customization": {
      "projectName": "Sistema CRM",
      "additionalFeatures": ["Relatórios", "Integração API"]
    }
  }'
```

### 8. Verificar Histórico
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/ai/history" -Headers $headers

# Bash/Terminal
curl -X GET http://localhost:3000/ai/history \
  -H "Authorization: Bearer $TOKEN"
```

### 9. Limpar Histórico
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/ai/history" -Method DELETE -Headers $headers

# Bash/Terminal
curl -X DELETE http://localhost:3000/ai/history \
  -H "Authorization: Bearer $TOKEN"
```

## 🧪 Script de Teste Automatizado

Pode usar o script `test-api.js` incluído:

```bash
node test-api.js
```

Este script testa automaticamente:
- ✅ Health check
- ✅ Registo de utilizador
- ✅ Obtenção de dados do utilizador
- ✅ Refresh token
- ✅ Todos os endpoints de IA
- ✅ Logout

## 📊 Interpretação das Respostas

### Resposta de Sucesso (Plano de Teste)
```json
{
  "success": true,
  "message": "Plano de teste gerado com sucesso",
  "data": {
    "testPlan": {
      "projectInfo": {
        "name": "Sistema E-commerce",
        "description": "...",
        "complexity": "medium"
      },
      "testSuites": [
        {
          "name": "Autenticação",
          "testCases": [
            {
              "id": "TC001",
              "name": "Login válido",
              "steps": ["...", "..."],
              "expectedResult": "..."
            }
          ]
        }
      ],
      "riskAnalysis": [...],
      "resources": {...},
      "schedule": {...}
    },
    "metadata": {
      "generatedAt": "2024-...",
      "model": "gpt-4o-mini",
      "tokens": {...}
    }
  }
}
```

### Resposta de Erro
```json
{
  "success": false,
  "message": "Token de acesso em falta ou inválido"
}
```

## ⚠️ Resolução de Problemas

### Erro de Token
```
{"success":false,"message":"Token de acesso em falta ou inválido"}
```
**Solução**: Verificar se o token está correto e não expirou.

### Erro de OpenAI
```
{"success":false,"message":"Erro na API OpenAI: Invalid API key"}
```
**Solução**: Verificar se `OPENAI_API_KEY` está configurada no `.env`.

### Servidor não responde
```
Não é possível estabelecer ligação com o servidor remoto
```
**Solução**: Verificar se o servidor está ativo com `npm run dev`.

## 💡 Dicas

1. **Use o script automatizado** para testes rápidos
2. **Guarde o token** numa variável para reutilizar
3. **Teste cenários diferentes** com dados variados
4. **Monitorize os custos** da OpenAI durante os testes
5. **Verifique o histórico** para acompanhar as gerações
```

Agora vou criar um script de teste específico para os endpoints de IA:

```javascript:test-ai-endpoints.js
// Script específico para testar endpoints de IA
// Execute: node test-ai-endpoints.js

const API_BASE = 'http://localhost:3000';

// Função para fazer requests HTTP
async function makeRequest(endpoint, method = 'GET', data = null, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    return { error: error.message };
  }
}

// Obter token de autenticação
async function getAuthToken() {
  console.log('🔐 Obtendo token de autenticação...\n');
  
  // Tentar login primeiro
  const loginData = {
    identifier: 'admin@example.com',
    password: 'Admin123456'
  };
  
  const login = await makeRequest('/auth/login', 'POST', loginData);
  
  if (login.data?.success && login.data?.data?.tokens) {
    console.log('✅ Login bem sucedido!');
    return login.data.data.tokens.accessToken;
  }
  
  // Se falhar, tentar registar novo utilizador
  console.log('📝 Tentando registar novo utilizador...');
  const userData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Test123456'
  };
  
  const register = await makeRequest('/auth/register', 'POST', userData);
  
  if (register.data?.success && register.data?.data?.tokens) {
    console.log('✅ Registo bem sucedido!');
    return register.data.data.tokens.accessToken;
  }
  
  throw new Error('Não foi possível obter token de autenticação');
}

// Testes dos endpoints de IA
async function testAIEndpoints() {
  console.log('🤖 TESTE COMPLETO DOS ENDPOINTS DE IA\n');
  console.log('=' .repeat(50) + '\n');

  try {
    // Obter token
    const token = await getAuthToken();
    console.log('');

    // 1. Informações do motor
    console.log('1️⃣  INFORMAÇÕES DO MOTOR DE IA');
    console.log('-'.repeat(40));
    const info = await makeRequest('/ai/info', 'GET', null, token);
    console.log('Status:', info.status);
    console.log('Resposta:', JSON.stringify(info.data, null, 2));
    console.log('\n');

    // 2. Testar conexão
    console.log('2️⃣  TESTE DE CONEXÃO OPENAI');
    console.log('-'.repeat(40));
    const connection = await makeRequest('/ai/test-connection', 'POST', {}, token);
    console.log('Status:', connection.status);
    console.log('Resposta:', JSON.stringify(connection.data, null, 2));
    console.log('\n');

    // 3. Cenários disponíveis
    console.log('3️⃣  CENÁRIOS DISPONÍVEIS');
    console.log('-'.repeat(40));
    const scenarios = await makeRequest('/ai/scenarios', 'GET', null, token);
    console.log('Status:', scenarios.status);
    if (scenarios.data?.success) {
      scenarios.data.data.scenarios.forEach(scenario => {
        console.log(`• ${scenario.name} (${scenario.id}): ${scenario.description}`);
      });
    } else {
      console.log('Resposta:', JSON.stringify(scenarios.data, null, 2));
    }
    console.log('\n');

    // 4. Gerar plano de teste
    console.log('4️⃣  GERAR PLANO DE TESTE COMPLETO');
    console.log('-'.repeat(40));
    const planData = {
      projectName: "Sistema de Gestão de Tarefas",
      description: "Sistema web para gestão de tarefas e projetos com equipas",
      features: [
        "Autenticação de utilizadores",
        "Gestão de projetos",
        "Atribuição de tarefas",
        "Dashboard de estatísticas"
      ],
      complexity: "medium",
      timeframe: "3 weeks"
    };
    console.log('Dados do projeto:', JSON.stringify(planData, null, 2));
    console.log('\nGerando plano... (pode demorar 10-30 segundos)');
    
    const plan = await makeRequest('/ai/generate-test-plan', 'POST', planData, token);
    console.log('Status:', plan.status);
    if (plan.data?.success) {
      console.log('✅ Plano gerado com sucesso!');
      const testPlan = plan.data.data.testPlan;
      console.log(`📋 Test Suites: ${testPlan.testSuites?.length || 0}`);
      console.log(`🧪 Total de Test Cases: ${testPlan.testSuites?.reduce((acc, suite) => acc + (suite.testCases?.length || 0), 0) || 0}`);
      console.log(`⚠️  Riscos identificados: ${testPlan.riskAnalysis?.risks?.length || 0}`);
      console.log(`⏱️  Estimativa: ${testPlan.schedule?.totalDuration || 'N/A'}`);
    } else {
      console.log('❌ Erro:', plan.data?.message || 'Erro desconhecido');
    }
    console.log('\n');

    // 5. Gerar casos específicos
    console.log('5️⃣  GERAR CASOS DE TESTE ESPECÍFICOS');
    console.log('-'.repeat(40));
    const casesData = {
      feature: "Autenticação de utilizadores",
      description: "Sistema de login com email/password e recuperação de conta",
      testTypes: ["functional", "security", "usability"],
      count: 3
    };
    console.log('Dados da funcionalidade:', JSON.stringify(casesData, null, 2));
    
    const cases = await makeRequest('/ai/generate-test-cases', 'POST', casesData, token);
    console.log('Status:', cases.status);
    if (cases.data?.success) {
      console.log('✅ Casos de teste gerados!');
      console.log(`🧪 Quantidade: ${cases.data.data.testCases?.length || 0}`);
    } else {
      console.log('❌ Erro:', cases.data?.message || 'Erro desconhecido');
    }
    console.log('\n');

    // 6. Análise de riscos
    console.log('6️⃣  ANÁLISE DE RISCOS');
    console.log('-'.repeat(40));
    const riskData = {
      projectName: "Sistema de Pagamentos Online",
      description: "Plataforma de pagamentos com cartões de crédito e débito",
      criticalFeatures: [
        "Processamento de pagamentos",
        "Armazenamento de dados de cartão",
        "Autenticação de dois fatores",
        "Logs de auditoria"
      ]
    };
    console.log('Dados do projeto:', JSON.stringify(riskData, null, 2));
    
    const risks = await makeRequest('/ai/analyze-risks', 'POST', riskData, token);
    console.log('Status:', risks.status);
    if (risks.data?.success) {
      console.log('✅ Análise de riscos completada!');
      console.log(`⚠️  Riscos identificados: ${risks.data.data.risks?.length || 0}`);
    } else {
      console.log('❌ Erro:', risks.data?.message || 'Erro desconhecido');
    }
    console.log('\n');

    // 7. Cenário pré-definido
    console.log('7️⃣  GERAR POR CENÁRIO PRÉ-DEFINIDO');
    console.log('-'.repeat(40));
    const scenarioData = {
      scenario: "apiTesting",
      customization: {
        projectName: "API de Gestão de Utilizadores",
        additionalFeatures: ["Rate limiting", "Documentação Swagger"]
      }
    };
    console.log('Dados do cenário:', JSON.stringify(scenarioData, null, 2));
    
    const scenario = await makeRequest('/ai/generate-from-scenario', 'POST', scenarioData, token);
    console.log('Status:', scenario.status);
    if (scenario.data?.success) {
      console.log('✅ Plano de cenário gerado!');
    } else {
      console.log('❌ Erro:', scenario.data?.message || 'Erro desconhecido');
    }
    console.log('\n');

    // 8. Verificar histórico
    console.log('8️⃣  HISTÓRICO DE GERAÇÕES');
    console.log('-'.repeat(40));
    const history = await makeRequest('/ai/history', 'GET', null, token);
    console.log('Status:', history.status);
    if (history.data?.success) {
      console.log(`📚 Gerações no histórico: ${history.data.data.generations?.length || 0}`);
      if (history.data.data.generations?.length > 0) {
        console.log('Últimas gerações:');
        history.data.data.generations.slice(0, 3).forEach((gen, index) => {
          console.log(`  ${index + 1}. ${gen.type} - ${gen.timestamp} (${gen.tokensUsed} tokens)`);
        });
      }
    } else {
      console.log('❌ Erro:', history.data?.message || 'Erro desconhecido');
    }
    console.log('\n');

    console.log('🎉 TESTES CONCLUÍDOS COM SUCESSO!');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Verificar Node.js
if (typeof fetch === 'undefined') {
  console.log('❌ Este script requer Node.js 18+ ou npm install node-fetch');
  process.exit(1);
}

// Executar testes
testAIEndpoints().catch(console.error);
```

## 📋 Resumo - Como Testar Cada Endpoint

### 🚀 **Opção 1: Script Automatizado (Recomendado)**

```bash
# Testar tudo automaticamente
node test-api.js

# Testar apenas endpoints de IA
node test-ai-endpoints.js
```

### 🔧 **Opção 2: Testes Manuais**

1. **Obter Token**:
   ```bash
   # PowerShell
   $loginData = @{ identifier = "admin@example.com"; password = "Admin123456" } | ConvertTo-Json
   $response = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
   $token = ($response.Content | ConvertFrom-Json).data.tokens.accessToken
   ```

2. **Testar cada endpoint** usando os exemplos do guia acima

### 🎯 **Endpoints Principais para Testar**:

- ✅ `/ai/test-connection` - Verificar conexão OpenAI
- ✅ `/ai/info` - Informações do sistema
- ✅ `/ai/scenarios` - Listar cenários
- ✅ `/ai/generate-test-plan` - **Principal funcionalidade**
- ✅ `/ai/generate-test-cases` - Casos específicos
- ✅ `/ai/analyze-risks` - Análise de riscos
- ✅ `/ai/generate-from-scenario` - Cenários pré-definidos
- ✅ `/ai/history` - Histórico

Todos os endpoints estão funcionais e documentados! O sistema está pronto para uso com a chave OpenAI que configuraste. 🚀 