# 🤖 Documentação do Motor de IA

## 📋 Visão Geral
O motor de IA permite gerar planos de teste automaticamente usando inteligência artificial (OpenAI GPT). Idealizado para Quality Assurance, oferece geração de planos completos, casos de teste específicos e análise de riscos.

## 🏗️ Estrutura do Projeto

```
backend/
├── ai/
│   ├── prompts/
│   │   └── test_plan.js          # Templates de prompts
│   ├── engines/
│   │   └── openai.js             # Integração OpenAI
│   ├── generatePlan.js           # Motor principal
│   └── example.js                # Exemplo de uso
├── controllers/
│   └── aiController.js           # Controller REST API
└── routes/
    └── ai.js                     # Rotas da API
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente
Adicione ao seu `.env`:
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4  # opcional, padrão: gpt-4
```

### 2. Obter API Key da OpenAI
1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie uma conta ou faça login
3. Vá para "API Keys" e gere uma nova chave
4. Adicione créditos à sua conta

### 3. Testar Configuração
```bash
# Executar exemplo
node ai/example.js

# Ou testar via API
POST /ai/test-connection
```

## 🚀 Endpoints da API

### Base URL: `/ai`

#### 1. **Gerar Plano de Teste Completo**
```http
POST /ai/generate-test-plan
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "systemInfo": "Aplicação web de e-commerce com autenticação e pagamentos",
  "features": [
    "Autenticação de utilizadores",
    "Catálogo de produtos", 
    "Carrinho de compras",
    "Processamento de pagamentos",
    "Gestão de pedidos"
  ],
  "context": "Sistema B2C para loja online com 50,000+ utilizadores/mês",
  "constraints": "Testes devem ser automatizados e executar em menos de 45min",
  "options": {
    "model": "gpt-4",
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plano de teste gerado com sucesso",
  "data": {
    "success": true,
    "timestamp": "2023-12-07T16:30:00.000Z",
    "duration": "3200ms",
    "input": { /* parâmetros enviados */ },
    "engine": {
      "name": "OpenAI Engine",
      "model": "gpt-4",
      "tokens": 2847
    },
    "result": {
      "content": "Plano de teste em formato texto...",
      "parsedContent": {
        "testPlan": {
          "title": "Plano de Teste - E-commerce Platform",
          "description": "Plano abrangente...",
          "testSuites": [ /* casos estruturados */ ]
        }
      }
    }
  }
}
```

#### 2. **Gerar Casos de Teste Específicos**
```http
POST /ai/generate-test-cases
```

**Body:**
```json
{
  "feature": "Login de utilizador",
  "description": "Sistema de autenticação com email e password",
  "requirements": "Deve validar credenciais e redirecionar após sucesso"
}
```

#### 3. **Análise de Riscos**
```http
POST /ai/analyze-risks
```

**Body:**
```json
{
  "systemInfo": "Plataforma de pagamentos online",
  "features": ["Processamento de pagamentos", "Dados pessoais", "Transferências"],
  "environment": "Production"
}
```

#### 4. **Usar Cenário Pré-definido**
```http
POST /ai/generate-from-scenario
```

**Body:**
```json
{
  "scenario": "webApplication",  // webApplication | apiTesting | mobileApp
  "overrides": {
    "systemInfo": "Personalização do cenário...",
    "features": ["Feature customizada"]
  }
}
```

#### 5. **Informações do Motor**
```http
GET /ai/info
```

#### 6. **Testar Conexão**
```http
POST /ai/test-connection
```

#### 7. **Histórico**
```http
GET /ai/history        # Obter histórico
DELETE /ai/history     # Limpar histórico
```

#### 8. **Cenários Disponíveis**
```http
GET /ai/scenarios
```

## 🎭 Cenários Pré-definidos

### 1. **webApplication**
- **Descrição:** Aplicação web com autenticação, gestão de utilizadores e dashboard
- **Features:** Login/Logout, Gestão de perfil, Dashboard, Relatórios
- **Contexto:** Aplicação empresarial para gestão interna

### 2. **apiTesting**
- **Descrição:** REST API com autenticação JWT e operações CRUD
- **Features:** Endpoints de autenticação, CRUD de recursos, Validações, Rate limiting
- **Contexto:** API para integração com frontend e sistemas externos

### 3. **mobileApp**
- **Descrição:** Aplicação móvel iOS/Android com sincronização offline
- **Features:** Autenticação, Sincronização, Notificações, Modo offline
- **Contexto:** App B2C para utilizadores finais

## 💡 Exemplos de Uso

### Exemplo 1: E-commerce
```javascript
const testPlan = await fetch('/ai/generate-test-plan', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    systemInfo: "Loja online de roupas com checkout seguro",
    features: ["Catálogo", "Carrinho", "Pagamento", "Conta de utilizador"],
    context: "Site B2C com picos de tráfego durante promoções",
    constraints: "Testes críticos devem passar em menos de 30min"
  })
});
```

### Exemplo 2: Usar Cenário
```javascript
const apiTestPlan = await fetch('/ai/generate-from-scenario', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    scenario: "apiTesting",
    overrides: {
      systemInfo: "API de gestão de inventário",
      features: ["CRUD produtos", "Autenticação", "Relatórios", "Webhooks"]
    }
  })
});
```

### Exemplo 3: Casos Específicos
```javascript
const loginTests = await fetch('/ai/generate-test-cases', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    feature: "Reset de password",
    description: "Funcionalidade para recuperar acesso à conta",
    requirements: "Deve enviar email, validar token e permitir nova password"
  })
});
```

## 🔧 Configurações Avançadas

### Modelos Disponíveis
- `gpt-4` - Mais preciso, mais caro
- `gpt-4-turbo-preview` - Mais rápido 
- `gpt-3.5-turbo` - Mais barato
- `gpt-3.5-turbo-16k` - Contexto maior

### Parâmetros do Engine
```json
{
  "options": {
    "model": "gpt-4",
    "temperature": 0.7,      // 0.0-2.0 (criatividade)
    "maxTokens": 4000,       // Limite de tokens
    "topP": 1,               // Nucleus sampling
    "frequencyPenalty": 0,   // Evitar repetição
    "presencePenalty": 0     // Diversidade de tópicos
  }
}
```

## 📊 Estrutura do Plano Gerado

O plano de teste retornado segue uma estrutura JSON padronizada:

```json
{
  "testPlan": {
    "title": "Plano de Teste - Sistema X",
    "description": "Descrição do plano",
    "scope": ["Lista de funcionalidades"],
    "testEnvironments": ["dev", "staging", "production"],
    "testTypes": ["functional", "integration", "regression"],
    "testSuites": [
      {
        "name": "Suite de Autenticação",
        "description": "Testes de login e segurança",
        "priority": "Alta",
        "testCases": [
          {
            "id": "TC_001",
            "title": "Login com credenciais válidas",
            "description": "Verificar login bem-sucedido",
            "preconditions": ["Utilizador registado"],
            "steps": [
              {
                "step": 1,
                "action": "Inserir email válido",
                "expectedResult": "Campo aceita input"
              }
            ],
            "expectedResult": "Utilizador logado com sucesso",
            "priority": "Alta",
            "type": "functional",
            "estimatedTime": "5min"
          }
        ]
      }
    ],
    "riskAnalysis": ["Lista de riscos identificados"],
    "resources": {
      "personnel": "2 testers, 1 QA lead",
      "tools": ["Selenium", "Postman", "JMeter"],
      "environments": ["staging", "pre-production"]
    },
    "schedule": {
      "estimatedDuration": "2 semanas",
      "phases": [
        {
          "phase": "Testes funcionais",
          "duration": "1 semana",
          "activities": ["Setup", "Execução", "Report"]
        }
      ]
    }
  }
}
```

## ⚠️ Limitações e Considerações

### Limitações Técnicas
- **Rate Limits:** OpenAI tem limites de requests/minuto
- **Tokens:** Cada request consome tokens (custo)
- **Timeout:** Requests complexos podem demorar 30-60s
- **Precisão:** IA pode gerar informações incorretas

### Custos
- **GPT-4:** ~$0.03/1K tokens de input, ~$0.06/1K tokens de output
- **GPT-3.5:** ~$0.0015/1K tokens de input, ~$0.002/1K tokens de output
- **Estimativa:** Plano completo = 2000-4000 tokens = $0.12-0.24

### Boas Práticas
1. **Seja específico** nas descrições do sistema
2. **Use cenários** para casos comuns
3. **Revise sempre** o conteúdo gerado
4. **Monitore custos** de tokens
5. **Cache resultados** quando possível

## 🐛 Troubleshooting

### Problemas Comuns

**1. "API key não configurada"**
```bash
# Verificar .env
echo $OPENAI_API_KEY

# Ou via API
GET /ai/info
```

**2. "Rate limit excedido"**
- Aguarde alguns minutos
- Diminua frequência de requests
- Upgrade do plano OpenAI

**3. "Erro de parsing JSON"**
- IA retornou texto não estruturado
- Conteúdo ainda utilizável em `result.content`
- Ajuste prompts se necessário

**4. "Timeout na request"**
- Simplifique a descrição do sistema
- Reduza número de features
- Use cenários pré-definidos

### Debug
```bash
# Logs detalhados
NODE_ENV=development npm run dev

# Testar conexão
node -e "
const {getTestPlanGenerator} = require('./ai/generatePlan');
getTestPlanGenerator().testConnection().then(console.log);
"
```

## 🔮 Roadmap

### Funcionalidades Planeadas
- [ ] Suporte para Claude AI (Anthropic)
- [ ] Templates personalizáveis de prompts  
- [ ] Integração com ferramentas de teste
- [ ] Export para Excel/PDF
- [ ] Análise de cobertura de testes
- [ ] Geração de dados de teste
- [ ] Integração com Jira/Azure DevOps

### Melhorias
- [ ] Cache inteligente de resultados
- [ ] Retry automático em case de erro
- [ ] Métricas de qualidade dos planos
- [ ] Feedback loop para melhorar prompts
- [ ] Suporte offline com modelos locais

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte esta documentação
2. Verifique logs do servidor
3. Teste conexão com `/ai/test-connection`
4. Verifique configuração OpenAI

**Exemplo de request bem-sucedido:**
```bash
curl -X POST http://localhost:3000/ai/test-connection \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
``` 