# 🤖 AgentP

**Plataforma de Automação e Monitorização de Sistemas com IA**

AgentP é uma solução completa para gestão, onboarding e testes automatizados de servidores e sistemas, potenciada por inteligência artificial.

> **Nota:** esta é a versão pública do projeto. As chaves, os registos e os dados de utilizadores foram removidos. Para o correr, copia cada `.env.example` para `.env` e preenche os teus valores.

---

## 📋 Índice

- [Arquitetura](#-arquitetura)
- [Requisitos](#-requisitos)
- [Instalação](#-instalação)
- [Arranque Rápido](#-arranque-rápido)
- [Serviços](#-serviços)
- [Configuração](#-configuração)
- [Funcionalidades](#-funcionalidades)
- [API Documentation](#-api-documentation)
- [Melhorias Sugeridas](#-melhorias-sugeridas)
- [Troubleshooting](#-troubleshooting)

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         AgentP Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Frontend   │───▶│   Backend    │───▶│  AI Service  │       │
│  │  React/Vite  │    │   Express    │    │  LLM + RAG   │       │
│  │    :5173     │    │    :3000     │    │    :3001     │       │
│  └──────────────┘    └──────┬───────┘    └──────────────┘       │
│                             │                                    │
│                             │ SSH                                │
│                             ▼                                    │
│                      ┌──────────────┐    ┌──────────────┐       │
│                      │   Servers    │    │   UI Tests   │       │
│                      │   (Linux)    │    │  Playwright  │       │
│                      │              │    │    :3002     │       │
│                      └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes

| Serviço | Porto | Tecnologias | Descrição |
|---------|-------|-------------|-----------|
| **Frontend** | 5173 | React, TypeScript, Vite, TailwindCSS | Interface web SPA |
| **Backend** | 3000 | Node.js, Express, MongoDB | API principal, auth, SSH |
| **AI Service** | 3001 | TypeScript, LanceDB, OpenAI/Anthropic | RAG e assistente IA |
| **UI Tests** | 3002 | Node.js, Python, Playwright | Testes automatizados de UI |

---

## 📦 Requisitos

- **Node.js** v18+ 
- **MongoDB** v6+
- **Python** 3.10+ (para UI Tests)
- **FFmpeg** (opcional, para gravação de vídeo)

---

## 🚀 Instalação

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd agentp
```

### 2. Instalar dependências de cada serviço

```bash
# Backend
cd backend && npm install && cd ..

# AI Service
cd ai && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# UI Tests
cd ui_test && npm install && cd ..

# (Opcional) Ambiente Python para UI Tests
cd ui_test
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
cd ..
```

### 3. Configurar variáveis de ambiente

Criar ficheiro `.env` em cada serviço:

**backend/.env**
```env
MONGODB_URI=mongodb://localhost:27017/agentp
JWT_ACCESS_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
PORT=3000
AI_SERVER_URL=http://localhost:3001
```

**ai/.env**
```env
PORT=3001
OPENAI_API_KEY=sk-your-openai-key
# ou
ANTHROPIC_API_KEY=sk-ant-your-key
KB_ROOT=../backend/knowledge_base
```

---

## ⚡ Arranque Rápido

### Opção 1: Script automático (Windows)

```batch
# Duplo-clique ou execute:
start-all.bat
```

### Opção 2: PowerShell

```powershell
.\start-all.ps1
```

### Opção 3: Manual (cada terminal)

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - AI Service
cd ai && npm run dev

# Terminal 3 - UI Tests
cd ui_test && npm run dev

# Terminal 4 - Frontend
cd frontend && npm run dev
```

### Parar todos os serviços

```batch
stop-all.bat
# ou
.\stop-all.ps1
```

---

## 🔧 Serviços

### Backend (API Principal)

**URL:** http://localhost:3000

**Funcionalidades:**
- Autenticação JWT (access/refresh tokens)
- Gestão de sistemas (CRUD)
- Onboarding SSH automatizado
- Templates de onboarding reutilizáveis
- Monitorização de sistemas
- Gestão de ficheiros (knowledge base)

**Swagger:** http://localhost:3000/api-docs

### AI Service (RAG + LLM)

**URL:** http://localhost:3001

**Funcionalidades:**
- Chat genérico com LLM
- Issue Solver com contexto RAG
- Gerador de alertas Prometheus
- Planeamento de testes UI
- Ingestão de knowledge base (PDF, TXT, MD)

**Swagger:** http://localhost:3001/docs

### Frontend (Interface Web)

**URL:** http://localhost:5173

**Páginas:**
- Dashboard - Visão geral do sistema
- System Inventory - Gestão de servidores
- Running Tests - Testes em execução
- Test History - Histórico de testes
- Settings - Configurações

### UI Tests (Browser Automation)

**URL:** http://localhost:3002

**Funcionalidades:**
- Execução de testes Playwright com IA
- Gravação de vídeo automática
- Captura de screenshots por step
- API assíncrona com status em tempo real

**Swagger:** http://localhost:3002/docs

---

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Serviço | Descrição |
|----------|---------|-----------|
| `MONGODB_URI` | Backend | Connection string MongoDB |
| `JWT_ACCESS_SECRET` | Backend | Secret para access tokens |
| `JWT_REFRESH_SECRET` | Backend | Secret para refresh tokens |
| `AI_SERVER_URL` | Backend | URL do serviço AI |
| `OPENAI_API_KEY` | AI | Chave API OpenAI |
| `ANTHROPIC_API_KEY` | AI | Chave API Anthropic |
| `KB_ROOT` | AI | Pasta da knowledge base |
| `FRONTEND_URL` | Todos | URL do frontend (produção) |

### Portas

| Serviço | Porta Default | Variável |
|---------|---------------|----------|
| Backend | 3000 | `PORT` |
| AI Service | 3001 | `PORT` |
| UI Tests | 3002 | `PORT` |
| Frontend | 5173 | Vite config |

---

## 🎯 Funcionalidades

### 1. Onboarding de Sistemas

Processo automatizado via SSH para análise de servidores:

- **Conectividade** - Teste de ping e SSH
- **OS Detection** - Identificação do sistema operativo
- **System Info** - RAM, CPU, disco, uptime
- **Process Analysis** - Top processos por memória/CPU
- **Service Analysis** - Serviços ativos/falhados
- **Open Ports** - Análise de portas TCP/UDP

### 2. Knowledge Base por Sistema

Cada sistema tem a sua própria base de conhecimento:
- Upload de documentação (PDF, TXT, MD)
- Embeddings vectoriais com LanceDB
- Busca semântica para Issue Solver

### 3. Issue Solver com IA

Resolução inteligente de problemas:
- Contexto RAG da knowledge base do sistema
- Suporte a follow-up questions
- Geração de comandos de diagnóstico
- Sugestões de correção

### 4. Testes UI Automatizados

Testes de interface com Playwright + LLM:
- Execução baseada em instruções em linguagem natural
- Gravação de vídeo
- Screenshots por step
- Análise de resultados

---

## 📚 API Documentation

### Backend Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registo |
| GET | `/api/systems` | Listar sistemas |
| POST | `/api/onboarding/:id/start` | Iniciar onboarding |
| GET | `/api/templates` | Listar templates |
| POST | `/api/issue-helper/ask` | Perguntar ao Issue Solver |

### AI Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/chat` | Chat genérico |
| POST | `/api/issue-solver` | Resolver issue com RAG |
| POST | `/api/rag/ingest` | Ingestar knowledge base |
| GET | `/api/rag/search` | Busca semântica |

### UI Test Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/agent/run` | Iniciar teste |
| GET | `/agent/status/:runId` | Estado do teste |
| GET | `/agent/assets/:testId` | Screenshots/vídeo |
| POST | `/agent/stop/:runId` | Parar teste |

---

## 🔮 Melhorias Sugeridas

### Prioridade Alta

1. **Testes Automatizados**
   - Adicionar Jest/Vitest para unit tests
   - Testes de integração para APIs
   - E2E tests com Playwright

2. **Rate Limiting**
   - Reativar rate limiting no backend (está desabilitado)
   - Configurar limites por endpoint

3. **Logging Estruturado**
   - Implementar Winston ou Pino
   - Logs centralizados (ELK stack ou similar)

4. **Health Checks**
   - Endpoint `/health` mais completo
   - Verificar conexão MongoDB, AI service, etc.

### Prioridade Média

5. **Docker Compose**
   - Containerização de todos os serviços
   - Ambiente de desenvolvimento unificado

6. **CI/CD Pipeline**
   - GitHub Actions para build/test/deploy
   - Linting automático

7. **Autenticação Melhorada**
   - OAuth2/OIDC (Google, GitHub)
   - 2FA/MFA

8. **WebSockets**
   - Substituir polling por WebSocket real-time
   - Notificações push

### Prioridade Baixa

9. **Internacionalização (i18n)**
   - Suporte a múltiplos idiomas
   - Mensagens de erro traduzidas

10. **Métricas e Observabilidade**
    - Prometheus metrics endpoint
    - Grafana dashboards
    - Tracing distribuído (Jaeger)

11. **Backup Automático**
    - Backup da MongoDB
    - Backup da knowledge base

12. **Mobile App**
    - React Native ou Flutter
    - Notificações push

---

## 🐛 Troubleshooting

### CORS Errors

Se receber "Not allowed by CORS":
1. Verificar se todos os serviços estão a correr
2. Confirmar que as portas estão corretas no `vite.config.ts`
3. Verificar `allowedOrigins` em cada serviço

### MongoDB Connection Failed

```bash
# Verificar se MongoDB está a correr
mongosh
# ou
net start MongoDB  # Windows
```

### AI Service Not Responding

1. Verificar se a API key está configurada
2. Testar conexão: `curl http://localhost:3001/health`
3. Ver logs no terminal do AI service

### UI Tests Failing

1. Verificar se Python e Playwright estão instalados
2. Instalar browsers: `playwright install`
3. Verificar se FFmpeg está no PATH (para vídeo)

---

## 📄 Licença

MIT License - Ver [LICENSE](LICENSE) para detalhes.

---

## 👥 Contribuição

1. Fork do repositório
2. Criar branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adicionar nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abrir Pull Request

---

**Desenvolvido com ❤️ pela equipa AgentP**

