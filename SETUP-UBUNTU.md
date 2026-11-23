# 🐧 Guia de Setup - Ubuntu Linux

Este guia detalha como configurar todo o projeto AgentP numa VM Ubuntu Linux.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação de Dependências do Sistema](#instalação-de-dependências-do-sistema)
3. [Instalação do MongoDB](#instalação-do-mongodb)
4. [Instalação do Node.js](#instalação-do-nodejs)
5. [Instalação do Python](#instalação-do-python)
6. [Clonar e Configurar o Projeto](#clonar-e-configurar-o-projeto)
7. [Configurar Variáveis de Ambiente](#configurar-variáveis-de-ambiente)
8. [Instalar Dependências do Projeto](#instalar-dependências-do-projeto)
9. [Instalar Playwright Browsers](#instalar-playwright-browsers)
10. [Iniciar os Serviços](#iniciar-os-serviços)
11. [Verificar Instalação](#verificar-instalação)
12. [Scripts de Automação](#scripts-de-automação)
13. [Troubleshooting](#troubleshooting)

---

## 📦 Pré-requisitos

- **Ubuntu** 20.04 LTS ou superior (recomendado: 22.04 LTS)
- **Acesso root/sudo** para instalação de pacotes
- **Mínimo 4GB RAM** (recomendado: 8GB+)
- **Mínimo 20GB espaço em disco**
- **Conexão à Internet** para download de dependências

---

## 🔧 Instalação de Dependências do Sistema

### 1. Atualizar o sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Instalar ferramentas essenciais

```bash
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release \
  ffmpeg
```

**Nota:** `ffmpeg` é necessário para gravação de vídeo nos testes UI (opcional mas recomendado).

---

## 🍃 Instalação do MongoDB

### Opção 1: MongoDB Community Edition (Recomendado)

```bash
# Importar chave GPG
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Adicionar repositório
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Atualizar e instalar
sudo apt update
sudo apt install -y mongodb-org

# Iniciar e ativar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar status
sudo systemctl status mongod
```

### Opção 2: MongoDB via Docker (Alternativa)

```bash
# Instalar Docker (se não estiver instalado)
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# Executar MongoDB em container
sudo docker run -d \
  --name mongodb \
  --restart unless-stopped \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7.0
```

### Verificar instalação MongoDB

```bash
# Testar conexão
mongosh --eval "db.version()"

# Ou se mongosh não estiver disponível
mongo --eval "db.version()"
```

---

## 📦 Instalação do Node.js

O projeto requer **Node.js v18+**. Recomendado usar NodeSource ou nvm.

### Opção 1: NodeSource (Recomendado)

```bash
# Instalar Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versão
node --version  # Deve mostrar v20.x.x ou superior
npm --version
```

### Opção 2: nvm (Node Version Manager)

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recarregar shell
source ~/.bashrc

# Instalar Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verificar
node --version
npm --version
```

---

## 🐍 Instalação do Python

O projeto requer **Python 3.10+** para o serviço de UI Tests.

```bash
# Verificar Python instalado
python3 --version

# Se não tiver Python 3.10+, instalar
sudo apt install -y python3.10 python3.10-venv python3-pip

# Verificar pip
python3 -m pip --version

# Atualizar pip
python3 -m pip install --upgrade pip
```

---

## 📥 Clonar e Configurar o Projeto

### 1. Clonar repositório

```bash
# Navegar para diretório desejado
cd ~
# ou
cd /opt

# Clonar (substituir <repo-url> pela URL real)
git clone <repo-url> agentp
cd agentp
```

### 2. Verificar estrutura

```bash
ls -la
# Deve mostrar: backend/, frontend/, ai/, ui_test/, etc.
```

---

## ⚙️ Configurar Variáveis de Ambiente

Criar ficheiros `.env` em cada serviço com as configurações necessárias.

### 1. Backend (.env)

```bash
cd backend
cat > .env << 'EOF'
# MongoDB
MONGODB_URI=mongodb://localhost:27017/agentp

# JWT Secrets (gerar strings aleatórias seguras)
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Porta
PORT=3000

# URLs
AI_SERVER_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# Ambiente
NODE_ENV=development
MONITORING_ENABLED=true
EOF

# Substituir os secrets gerados
JWT_ACCESS=$(openssl rand -hex 32)
JWT_REFRESH=$(openssl rand -hex 32)
sed -i "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$JWT_ACCESS|" .env
sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH|" .env

cd ..
```

### 2. AI Service (.env)

```bash
cd ai
cat > .env << 'EOF'
# Porta
PORT=3001

# Provider LLM (escolher um)
LLM_PROVIDER=openai
# ou
# LLM_PROVIDER=anthropic

# OpenAI (se usar OpenAI)
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# Anthropic (se usar Anthropic)
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# Knowledge Base
KB_ROOT=../backend/knowledge_base
LANCEDB_DIR=.lancedb

# Auto-ingest
AUTO_INGEST_ON_REQUEST=true
EOF

# IMPORTANTE: Editar manualmente e adicionar a sua API key
nano .env
# ou
vim .env

cd ..
```

### 3. UI Tests (.env)

```bash
cd ui_test
cat > .env << 'EOF'
# Porta
PORT=3002

# OpenAI API Key (para browser-use agent)
OPENAI_API_KEY=sk-your-openai-key-here

# Frontend URL
FRONTEND_URL=http://localhost:5173
EOF

# IMPORTANTE: Editar manualmente e adicionar a sua API key
nano .env
# ou
vim .env

cd ..
```

### 4. Frontend (opcional - geralmente não precisa de .env)

O frontend usa configurações do `vite.config.ts`. Se necessário, pode criar:

```bash
cd frontend
# Geralmente não é necessário .env para desenvolvimento
# As configurações estão em vite.config.ts
cd ..
```

---

## 📚 Instalar Dependências do Projeto

Instalar dependências de cada serviço.

### 1. Backend

```bash
cd backend
npm install
cd ..
```

### 2. AI Service

```bash
cd ai
npm install
cd ..
```

### 3. Frontend

```bash
cd frontend
npm install
cd ..
```

### 4. UI Tests (Node.js)

```bash
cd ui_test
npm install
cd ..
```

### 5. UI Tests (Python)

```bash
cd ui_test

# Criar ambiente virtual Python
python3 -m venv .venv

# Ativar ambiente virtual
source .venv/bin/activate

# Instalar dependências Python
pip install -r requirements.txt

# Desativar ambiente virtual (por agora)
deactivate

cd ..
```

---

## 🗄️ Inicializar Base de Dados

Após instalar as dependências e configurar o MongoDB, é necessário inicializar a base de dados com dados essenciais.

### 1. Inicializar Configurações do Sistema

```bash
cd backend
node scripts/initializeSettings.js
cd ..
```

Este script cria as configurações padrão do sistema (segurança, monitorização, notificações, etc.).

### 2. Criar Utilizador Administrador

```bash
cd backend
node scripts/createAdmin.js
cd ..
```

Este script cria o primeiro utilizador admin com as seguintes credenciais:
- **Username:** `admin`
- **Email:** `admin@exemplo.com`
- **Password:** `Admin123!`
- **Role:** `admin`

**⚠️ IMPORTANTE:** Altere a password após o primeiro login!

### 3. (Opcional) Criar Sistemas de Exemplo

Se quiser testar com dados de exemplo:

```bash
cd backend
node scripts/createSampleSystems.js
cd ..
```

Este script cria vários sistemas de exemplo para testes.

### 4. (Opcional) Executar Migrações

Se estiver a migrar de uma versão antiga ou se houver sistemas sem slugs:

```bash
cd backend
npm run migrate-slugs
cd ..
```

---

### Script de Inicialização Completo

Pode executar todos os passos de inicialização de uma vez usando o script dedicado:

```bash
# Opção 1: Script automatizado (recomendado)
chmod +x init-database.sh
./init-database.sh
```

Ou manualmente:

```bash
cd backend

# 1. Configurações
echo "📋 Inicializando configurações..."
node scripts/initializeSettings.js

# 2. Admin
echo "👤 Criando administrador..."
node scripts/createAdmin.js

# 3. (Opcional) Sistemas de exemplo
read -p "Criar sistemas de exemplo? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Criando sistemas de exemplo..."
    node scripts/createSampleSystems.js
fi

cd ..
```

---

## 🎭 Instalar Playwright Browsers

O serviço UI Tests precisa dos browsers do Playwright instalados.

```bash
cd ui_test

# Ativar ambiente virtual
source .venv/bin/activate

# Instalar browsers do Playwright
playwright install

# Instalar dependências do sistema (se necessário)
playwright install-deps

# Desativar ambiente virtual
deactivate

cd ..
```

**Nota:** Este passo pode demorar alguns minutos e requer espaço em disco (~1-2GB).

---

## 🚀 Iniciar os Serviços

### Opção 1: Manual (4 terminais)

Abrir 4 terminais separados:

**Terminal 1 - Backend:**
```bash
cd ~/agentp/backend
npm run dev
```

**Terminal 2 - AI Service:**
```bash
cd ~/agentp/ai
npm run dev
```

**Terminal 3 - UI Tests:**
```bash
cd ~/agentp/ui_test
source .venv/bin/activate
npm run dev
```

**Terminal 4 - Frontend:**
```bash
cd ~/agentp/frontend
npm run dev
```

### Opção 2: Script Bash (Recomendado)

Criar script para iniciar todos os serviços:

```bash
cd ~/agentp

cat > start-all.sh << 'EOF'
#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    AgentP - Launcher                      ║${NC}"
echo -e "${CYAN}║═══════════════════════════════════════════════════════════║${NC}"
echo -e "${CYAN}║  Backend    (Express/MongoDB)     -  http://localhost:3000 ║${NC}"
echo -e "${CYAN}║  AI Service (LLM/RAG)             -  http://localhost:3001 ║${NC}"
echo -e "${CYAN}║  Frontend   (React/Vite)          -  http://localhost:5173 ║${NC}"
echo -e "${CYAN}║  UI Tests   (Browser-Use Agent)   -  http://localhost:3002 ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

# Verificar MongoDB
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${YELLOW}[WARN] MongoDB não está a correr. Iniciando...${NC}"
    sudo systemctl start mongod || echo -e "${RED}[ERROR] Falha ao iniciar MongoDB${NC}"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${GREEN}[INFO] Starting all services...${NC}"
echo ""

# Função para iniciar serviço em background
start_service() {
    local name=$1
    local path=$2
    local port=$3
    
    echo -e "${YELLOW}[INFO] Starting $name on port $port...${NC}"
    cd "$ROOT_DIR/$path"
    
    if [ "$name" == "UI Tests" ]; then
        # UI Tests precisa do venv ativado
        source .venv/bin/activate
        npm run dev > "/tmp/agentp-${name// /-}.log" 2>&1 &
    else
        npm run dev > "/tmp/agentp-${name// /-}.log" 2>&1 &
    fi
    
    sleep 2
}

# Iniciar serviços
start_service "Backend" "backend" "3000"
start_service "AI Service" "ai" "3001"
start_service "UI Tests" "ui_test" "3002"
start_service "Frontend" "frontend" "5173"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} All services started!${NC}"
echo ""
echo -e " Services:${NC}"
echo -e "   - Backend:    http://localhost:3000  (API Docs: /api-docs)${NC}"
echo -e "   - AI Service: http://localhost:3001  (Swagger: /docs)${NC}"
echo -e "   - Frontend:   http://localhost:5173${NC}"
echo -e "   - UI Tests:   http://localhost:3002  (Swagger: /docs)${NC}"
echo ""
echo -e "${YELLOW}[INFO] Logs disponíveis em /tmp/agentp-*.log${NC}"
echo -e "${YELLOW}[INFO] Para parar: pkill -f 'npm run dev'${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
EOF

chmod +x start-all.sh
```

**Usar o script:**
```bash
./start-all.sh
```

### Opção 3: systemd Services (Produção)

Para produção, criar serviços systemd:

```bash
# Criar serviço para Backend
sudo nano /etc/systemd/system/agentp-backend.service
```

```ini
[Unit]
Description=AgentP Backend Service
After=network.target mongod.service

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/home/seu-usuario/agentp/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Repetir para os outros serviços (ai, frontend, ui_test).

**Ativar serviços:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable agentp-backend
sudo systemctl start agentp-backend
# etc.
```

---

## ✅ Verificar Instalação

### 1. Verificar MongoDB e Base de Dados

```bash
# Conectar ao MongoDB
mongosh agentp

# Verificar bases de dados
show dbs

# Verificar coleções
use agentp
show collections

# Verificar utilizadores
db.users.find().pretty()

# Verificar configurações
db.settings.find().pretty()

# Sair
exit
```

### 2. Verificar portas

```bash
# Verificar se as portas estão abertas
sudo netstat -tlnp | grep -E ':(3000|3001|3002|5173)'
# ou
sudo ss -tlnp | grep -E ':(3000|3001|3002|5173)'
```

### 3. Testar endpoints

```bash
# Backend
curl http://localhost:3000/health

# AI Service
curl http://localhost:3001/health

# UI Tests
curl http://localhost:3002/health

# Frontend (deve retornar HTML)
curl http://localhost:5173
```

### 4. Testar login

```bash
# Testar login do admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exemplo.com",
    "password": "Admin123!"
  }'
```

Se retornar um token, o login está a funcionar corretamente.

### 5. Aceder interfaces web

- **Frontend:** http://localhost:5173
- **Backend API Docs:** http://localhost:3000/api-docs
- **AI Service Docs:** http://localhost:3001/docs
- **UI Tests Docs:** http://localhost:3002/docs

---

## 🔧 Scripts de Automação

### Script para parar todos os serviços

```bash
cat > stop-all.sh << 'EOF'
#!/bin/bash

echo "Parando todos os serviços AgentP..."

# Parar processos Node.js relacionados
pkill -f "npm run dev"
pkill -f "node.*backend"
pkill -f "node.*ai"
pkill -f "node.*ui_test"
pkill -f "vite"

# Parar processos Python relacionados
pkill -f "run_agent.py"

echo "Serviços parados."
EOF

chmod +x stop-all.sh
```

### Script para verificar status

```bash
cat > check-status.sh << 'EOF'
#!/bin/bash

echo "=== AgentP Status ==="
echo ""

# MongoDB
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB: Running"
else
    echo "❌ MongoDB: Not running"
fi

# Backend
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend (3000): Running"
else
    echo "❌ Backend (3000): Not running"
fi

# AI Service
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ AI Service (3001): Running"
else
    echo "❌ AI Service (3001): Not running"
fi

# UI Tests
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ UI Tests (3002): Running"
else
    echo "❌ UI Tests (3002): Not running"
fi

# Frontend
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend (5173): Running"
else
    echo "❌ Frontend (5173): Not running"
fi

echo ""
EOF

chmod +x check-status.sh
```

---

## 🐛 Troubleshooting

### Problema: MongoDB não inicia

```bash
# Verificar logs
sudo journalctl -u mongod -n 50

# Verificar permissões
sudo chown -R mongodb:mongodb /var/lib/mongodb

# Reiniciar serviço
sudo systemctl restart mongod
```

### Problema: Porta já em uso

```bash
# Encontrar processo na porta
sudo lsof -i :3000
# ou
sudo netstat -tlnp | grep :3000

# Matar processo
sudo kill -9 <PID>
```

### Problema: Erro "Permission denied" no npm

```bash
# Corrigir permissões do npm
sudo chown -R $(whoami) ~/.npm
```

### Problema: Python venv não ativa

```bash
# Verificar se o venv existe
ls -la ui_test/.venv

# Recriar venv se necessário
cd ui_test
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Problema: Playwright browsers não instalados

```bash
cd ui_test
source .venv/bin/activate
playwright install --force
playwright install-deps
```

### Problema: CORS errors no frontend

Verificar se todos os serviços estão a correr e se as URLs nos `.env` estão corretas.

### Problema: AI Service não responde

1. Verificar se a API key está configurada no `ai/.env`
2. Testar conexão: `curl http://localhost:3001/health`
3. Verificar logs: `tail -f /tmp/agentp-AI-Service.log`

### Problema: Erro de memória (OOM)

Se a VM tiver pouca RAM:

```bash
# Aumentar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📝 Checklist Final

- [ ] Node.js v18+ instalado
- [ ] MongoDB instalado e a correr
- [ ] Python 3.10+ instalado
- [ ] FFmpeg instalado (opcional)
- [ ] Projeto clonado
- [ ] Ficheiros `.env` configurados em todos os serviços
- [ ] Dependências npm instaladas (backend, ai, frontend, ui_test)
- [ ] Dependências Python instaladas (ui_test)
- [ ] Playwright browsers instalados
- [ ] **Base de dados inicializada:**
  - [ ] Configurações do sistema criadas
  - [ ] Utilizador admin criado
  - [ ] (Opcional) Sistemas de exemplo criados
- [ ] Todos os serviços iniciam sem erros
- [ ] Endpoints respondem corretamente
- [ ] Login funciona com credenciais admin
- [ ] Frontend acessível no browser

---

## 🎯 Próximos Passos

1. **Fazer login como admin:**
   - Aceder ao frontend: http://localhost:5173
   - Usar credenciais:
     - Email: `admin@exemplo.com`
     - Password: `Admin123!`
   - **⚠️ IMPORTANTE:** Altere a password após o primeiro login!

2. **Configurar primeiro sistema:**
   - Adicionar sistema no System Inventory
   - Configurar credenciais SSH
   - Iniciar onboarding

3. **Configurar Knowledge Base:**
   - Upload de documentação (PDF, MD, TXT)
   - Aguardar ingestão automática

4. **Testar funcionalidades:**
   - Issue Solver
   - Geração de documentação
   - Testes UI automatizados

---

## 📚 Documentação Adicional

- **README Principal:** `README.md`
- **Quick Start:** `QUICK-START-DOCUMENTATION.md`
- **API Backend:** `backend/API-DOCUMENTATION.md`
- **Onboarding:** `backend/README-SSH-ONBOARDING.md`

---

**Desenvolvido com ❤️ pela equipa AgentP**
