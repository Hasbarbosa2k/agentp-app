# 📄 Geração Automática de Documentação com IA

## 📋 Resumo

Sistema completo para geração automática de relatórios técnicos profissionais em PDF usando Inteligência Artificial. O utilizador fornece um prompt descrevendo o sistema e os testes realizados, e a IA gera um relatório detalhado e formatado profissionalmente.

## 🎯 Funcionalidades

### ✨ Principais Características

- **Geração Automática via IA**: Usa LLM (GPT-4/Claude) para criar conteúdo profissional
- **Relatórios em PDF**: Conversão automática de HTML para PDF formatado
- **Preview HTML**: Visualização antes de gerar o PDF final
- **Integração com Sistemas**: Pode incluir informações técnicas dos sistemas cadastrados
- **Customização**: Permite adicionar contexto adicional e personalizar o conteúdo
- **Interface Intuitiva**: Frontend React com formulário simples e claro

### 📊 Estrutura do Relatório Gerado

1. **Capa** - Título, data, informações do sistema
2. **Executive Summary** - Resumo executivo de alto nível
3. **System Overview** - Arquitetura, componentes, configuração
4. **Test Execution Details** - Metodologia, escopo, ambiente
5. **Test Results** - Resultados detalhados, métricas, evidências
6. **Analysis and Insights** - Análise de padrões, problemas, recomendações
7. **Conclusions and Next Steps** - Conclusões e próximos passos
8. **Appendices** - Dados brutos, detalhes técnicos

## 🏗️ Arquitetura Técnica

### Backend (Node.js/Express)

```
backend/
├── controllers/
│   └── documentationController.js     # Lógica de negócio
├── services/
│   └── documentationService.js        # Integração com IA e geração PDF
├── routes/
│   └── documentation.js               # Endpoints REST
└── server.js                          # Registo das rotas
```

### AI Module (TypeScript)

```
ai/
└── src/
    ├── documentationPrompts.ts        # Prompts para IA
    └── routes.ts                      # Endpoint /documentation/generate-report
```

### Frontend (React/TypeScript)

```
frontend/
└── src/
    └── pages/
        └── Documentation.tsx          # Interface de geração
```

## 🔧 API Endpoints

### 1. Gerar Relatório PDF

```http
POST /api/documentation/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "systemId": "optional_system_id",
  "systemName": "Nome do Sistema",
  "testDescription": "Descrição detalhada dos testes realizados...",
  "testRunId": "optional_test_run_id",
  "includeSystemInfo": true,
  "additionalContext": "Contexto adicional..."
}
```

**Response**: Binary PDF file (application/pdf)

### 2. Preview HTML

```http
POST /api/documentation/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "systemId": "optional_system_id",
  "systemName": "Nome do Sistema",
  "testDescription": "Descrição detalhada dos testes...",
  "includeSystemInfo": true,
  "additionalContext": "Contexto adicional..."
}
```

**Response**:
```json
{
  "success": true,
  "title": "Relatório de Testes - Sistema X",
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00Z",
    "system": "Sistema X",
    "testType": "Performance",
    "author": "AgentP AI System"
  },
  "html": "<html>...</html>"
}
```

### 3. AI Module Endpoint (Internal)

```http
POST http://localhost:3001/api/documentation/generate-report
Content-Type: application/json

{
  "systemName": "Production Web Server",
  "testDescription": "...",
  "testResults": { /* optional */ },
  "systemInfo": { /* optional */ },
  "additionalContext": "..."
}
```

## 📦 Dependências

### Backend
```json
{
  "html-pdf-node": "^1.0.8",
  "pdfkit": "^0.13.0",
  "axios": "^1.11.0"
}
```

### AI Module
```json
{
  "openai": "^5.12.2",
  "@anthropic-ai/sdk": "^0.59.0"
}
```

## 🚀 Como Usar

### Via Interface Frontend

1. Aceder à página **Documentation** no menu lateral
2. Selecionar um sistema existente ou fornecer nome personalizado
3. Descrever os testes realizados no campo de texto:
   - Ser específico com métricas e resultados
   - Incluir observações relevantes
   - Mencionar ferramentas utilizadas
4. (Opcional) Adicionar contexto adicional
5. Clicar em **"Preview HTML"** para visualizar antes de gerar
6. Clicar em **"Gerar PDF"** para criar e fazer download

### Via API (cURL)

```bash
# Gerar PDF
curl -X POST http://localhost:3000/api/documentation/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "systemName": "Web Server Produção",
    "testDescription": "Realizamos testes de carga simulando 1000 utilizadores simultâneos. O sistema manteve-se estável com tempo de resposta médio de 180ms. CPU média 45%, memória 60%. Todos os endpoints responderam com sucesso.",
    "includeSystemInfo": true,
    "additionalContext": "Teste realizado no ambiente de staging"
  }' \
  --output relatorio.pdf
```

## 🎨 Exemplo de Prompt

### Bom Exemplo ✅

```
Realizamos testes de stress no servidor de produção durante 2 horas.

Métricas observadas:
- 1500 utilizadores simultâneos
- Tempo de resposta médio: 220ms (p95: 450ms)
- Taxa de erro: 0.1%
- CPU média: 65% (pico 85%)
- Memória: 70% utilização
- Disco I/O: Normal (< 50% capacidade)

Endpoints testados:
- GET /api/users (2000 req/min)
- POST /api/login (500 req/min)
- GET /api/dashboard (1000 req/min)

Observações:
- Sistema manteve-se estável
- Alguns timeouts ocasionais no pico de carga
- Base de dados respondeu bem (< 100ms queries)

Ferramentas: JMeter, Grafana, Prometheus
```

### Exemplo Fraco ❌

```
Fizemos testes no servidor. Correu bem.
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```bash
# Backend
AI_SERVER_URL=http://localhost:3001

# AI Module
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=openai  # ou 'anthropic'
AI_MODEL=gpt-4      # ou 'claude-3-5-sonnet-20241022'
```

## 🧪 Testes

### Teste Rápido via cURL

```bash
# 1. Login e obter token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.token')

# 2. Gerar relatório
curl -X POST http://localhost:3000/api/documentation/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "systemName": "Test System",
    "testDescription": "Teste de funcionalidade básica. Sistema respondeu corretamente."
  }' \
  --output test_report.pdf

echo "PDF gerado: test_report.pdf"
```

## 🔍 Troubleshooting

### Erro: "AI server unreachable"
- Verificar se o módulo AI está a correr: `http://localhost:3001/health`
- Confirmar `AI_SERVER_URL` no `.env` do backend

### Erro: "Failed to convert HTML to PDF"
- Verificar instalação do `html-pdf-node`
- Em sistemas Linux pode ser necessário: `apt-get install -y chromium-browser`

### PDF vazio ou mal formatado
- Verificar resposta da IA no log
- Confirmar que o HTML gerado é válido
- Testar primeiro com "Preview HTML"

### Timeout na geração
- Aumentar timeout no `documentationService.js` (padrão: 120s)
- Verificar rate limits da API do LLM

## 📈 Limitações e Melhorias Futuras

### Limitações Atuais
- Geração síncrona (pode demorar 30-60s)
- Sem histórico de relatórios gerados
- Sem templates personalizáveis
- Idioma fixo em pt-PT

### Melhorias Planeadas
- [ ] Geração assíncrona com notificações
- [ ] Armazenamento de relatórios no MongoDB
- [ ] Templates customizáveis por utilizador
- [ ] Suporte multi-idioma
- [ ] Gráficos e visualizações automáticas
- [ ] Exportação para outros formatos (DOCX, HTML)
- [ ] Comparação entre relatórios

## 🤝 Integração com Outros Módulos

### Com System Inventory
```javascript
// Buscar informações do sistema
const system = await System.findById(systemId);
// Incluir no relatório automaticamente
```

### Com UI Tests / Test Runs
```javascript
// Incluir resultados de testes executados
const testRun = await UiTestRun.findById(testRunId);
// IA analisa e inclui no relatório
```

### Com AI Profile Analyzer
```javascript
// Incluir perfil analisado do sistema
const aiProfile = system.aiAnalyzedProfile;
// Adiciona contexto técnico rico ao relatório
```

## 📝 Notas de Implementação

### Prompt Engineering
O prompt da IA foi cuidadosamente desenhado para:
- Gerar estrutura consistente
- Usar terminologia técnica apropriada
- Criar conteúdo detalhado mas legível
- Formatar HTML profissionalmente
- Incluir todas as secções necessárias

### Segurança
- Todos os endpoints requerem autenticação JWT
- Validação de input no backend
- Timeout de 2 minutos para prevenir ataques DoS
- Sanitização de HTML gerado

### Performance
- Geração de relatório: ~30-60s (dependente da IA)
- Conversão HTML→PDF: ~2-5s
- Tamanho típico do PDF: 500KB - 2MB

## 📚 Referências

- [html-pdf-node Documentation](https://www.npmjs.com/package/html-pdf-node)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)

---

**Autor**: AgentP Team  
**Data**: Janeiro 2026  
**Versão**: 1.0.0
