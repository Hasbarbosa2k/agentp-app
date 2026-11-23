#!/bin/bash

# AgentP - Setup Script para Ubuntu
# Este script automatiza a instalação de todas as dependências necessárias

set -e  # Parar em caso de erro

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para imprimir mensagens
print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              AgentP - Setup Script (Ubuntu)              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se está a correr como root (não recomendado, mas verificar sudo)
if [ "$EUID" -eq 0 ]; then
    print_warning "Não execute este script como root. Use sudo quando necessário."
    exit 1
fi

# Verificar se tem sudo
if ! sudo -n true 2>/dev/null; then
    print_info "Este script requer privilégios sudo. Será solicitada a password."
fi

# 1. Atualizar sistema
print_info "Atualizando sistema..."
sudo apt update
sudo apt upgrade -y

# 2. Instalar dependências básicas
print_info "Instalando dependências básicas..."
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

print_success "Dependências básicas instaladas"

# 3. Instalar MongoDB
print_info "Instalando MongoDB..."
if command -v mongod &> /dev/null; then
    print_warning "MongoDB já está instalado"
else
    # Importar chave GPG
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    
    # Adicionar repositório
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    # Instalar
    sudo apt update
    sudo apt install -y mongodb-org
    
    # Iniciar e ativar
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    print_success "MongoDB instalado e iniciado"
fi

# 4. Instalar Node.js
print_info "Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_warning "Node.js v$NODE_VERSION já está instalado"
    else
        print_warning "Node.js versão antiga detectada. Instalando Node.js 20..."
        # Instalar Node.js 20
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
else
    print_info "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION instalado"

# 5. Instalar Python
print_info "Verificando Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    print_warning "Python $PYTHON_VERSION já está instalado"
else
    print_info "Instalando Python 3.10+..."
    sudo apt install -y python3.10 python3.10-venv python3-pip
fi

# Atualizar pip
python3 -m pip install --upgrade pip --quiet

PYTHON_VERSION=$(python3 --version)
print_success "$PYTHON_VERSION instalado"

# 6. Verificar se o projeto está clonado
print_info "Verificando projeto..."
if [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "ai" ] || [ ! -d "ui_test" ]; then
    print_error "Estrutura do projeto não encontrada!"
    print_info "Certifique-se de que está no diretório raiz do projeto AgentP"
    print_info "Ou clone o repositório primeiro:"
    echo "  git clone <repo-url> agentp"
    echo "  cd agentp"
    exit 1
fi

print_success "Estrutura do projeto encontrada"

# 7. Instalar dependências npm
print_info "Instalando dependências npm..."

print_info "  → Backend..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install --silent
else
    print_warning "    node_modules já existe, a saltar..."
fi
cd ..

print_info "  → AI Service..."
cd ai
if [ ! -d "node_modules" ]; then
    npm install --silent
else
    print_warning "    node_modules já existe, a saltar..."
fi
cd ..

print_info "  → Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent
else
    print_warning "    node_modules já existe, a saltar..."
fi
cd ..

print_info "  → UI Tests (Node.js)..."
cd ui_test
if [ ! -d "node_modules" ]; then
    npm install --silent
else
    print_warning "    node_modules já existe, a saltar..."
fi
cd ..

print_success "Dependências npm instaladas"

# 8. Configurar Python venv para UI Tests
print_info "Configurando ambiente virtual Python..."
cd ui_test
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    source .venv/bin/activate
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    deactivate
    print_success "Ambiente virtual Python criado"
else
    print_warning "Ambiente virtual já existe"
fi
cd ..

# 9. Verificar/criar ficheiros .env
print_info "Verificando ficheiros .env..."

# Backend
if [ ! -f "backend/.env" ]; then
    print_warning "backend/.env não existe. Criando template..."
    JWT_ACCESS=$(openssl rand -hex 32 2>/dev/null || echo "change-me-$(date +%s)")
    JWT_REFRESH=$(openssl rand -hex 32 2>/dev/null || echo "change-me-$(date +%s)")
    
    cat > backend/.env << EOF
MONGODB_URI=mongodb://localhost:27017/agentp
JWT_ACCESS_SECRET=$JWT_ACCESS
JWT_REFRESH_SECRET=$JWT_REFRESH
PORT=3000
AI_SERVER_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
MONITORING_ENABLED=true
EOF
    print_warning "  → backend/.env criado. REVISE E CONFIGURE AS API KEYS!"
else
    print_success "  → backend/.env existe"
fi

# AI Service
if [ ! -f "ai/.env" ]; then
    print_warning "ai/.env não existe. Criando template..."
    cat > ai/.env << EOF
PORT=3001
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
KB_ROOT=../backend/knowledge_base
LANCEDB_DIR=.lancedb
AUTO_INGEST_ON_REQUEST=true
EOF
    print_warning "  → ai/.env criado. ADICIONE A SUA OPENAI_API_KEY!"
else
    print_success "  → ai/.env existe"
fi

# UI Tests
if [ ! -f "ui_test/.env" ]; then
    print_warning "ui_test/.env não existe. Criando template..."
    cat > ui_test/.env << EOF
PORT=3002
OPENAI_API_KEY=sk-your-openai-key-here
FRONTEND_URL=http://localhost:5173
EOF
    print_warning "  → ui_test/.env criado. ADICIONE A SUA OPENAI_API_KEY!"
else
    print_success "  → ui_test/.env existe"
fi

# 10. Instalar Playwright browsers (opcional, pode demorar)
read -p "$(echo -e ${YELLOW}Instalar browsers do Playwright? Isto pode demorar alguns minutos. [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Instalando browsers do Playwright..."
    cd ui_test
    source .venv/bin/activate
    playwright install --quiet
    playwright install-deps --quiet
    deactivate
    cd ..
    print_success "Browsers do Playwright instalados"
else
    print_warning "Browsers do Playwright não instalados. Execute manualmente:"
    echo "  cd ui_test"
    echo "  source .venv/bin/activate"
    echo "  playwright install"
fi

# 11. Inicializar Base de Dados
print_info "Inicializando base de dados..."

# Verificar se MongoDB está a correr
if ! pgrep -x "mongod" > /dev/null; then
    print_warning "MongoDB não está a correr. Tentando iniciar..."
    if sudo systemctl start mongod 2>/dev/null; then
        print_success "MongoDB iniciado"
        sleep 2
    else
        print_error "Falha ao iniciar MongoDB. Inicie manualmente: sudo systemctl start mongod"
        print_warning "A inicialização da base de dados será ignorada"
    fi
fi

if pgrep -x "mongod" > /dev/null; then
    cd backend
    
    # Verificar se .env existe
    if [ ! -f ".env" ]; then
        print_warning "backend/.env não encontrado. A inicialização da BD será ignorada."
        print_info "Configure o .env primeiro e execute manualmente:"
        echo "  cd backend"
        echo "  node scripts/initializeSettings.js"
        echo "  node scripts/createAdmin.js"
    else
        # Inicializar configurações
        print_info "  → Criando configurações do sistema..."
        if node scripts/initializeSettings.js 2>/dev/null; then
            print_success "    Configurações criadas"
        else
            print_warning "    Configurações já existem ou erro ao criar"
        fi
        
        # Criar admin
        print_info "  → Criando utilizador administrador..."
        if node scripts/createAdmin.js 2>/dev/null; then
            print_success "    Administrador criado"
            echo -e "${YELLOW}    Credenciais padrão:${NC}"
            echo -e "${YELLOW}    Email: admin@exemplo.com${NC}"
            echo -e "${YELLOW}    Password: Admin123!${NC}"
        else
            print_warning "    Admin já existe ou erro ao criar"
        fi
        
        # Perguntar sobre sistemas de exemplo
        read -p "$(echo -e ${YELLOW}Criar sistemas de exemplo? [y/N]: ${NC})" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "  → Criando sistemas de exemplo..."
            if node scripts/createSampleSystems.js 2>/dev/null; then
                print_success "    Sistemas de exemplo criados"
            else
                print_warning "    Erro ao criar sistemas de exemplo"
            fi
        fi
    fi
    
    cd ..
    print_success "Base de dados inicializada"
else
    print_warning "MongoDB não está a correr. Inicialize manualmente depois:"
    echo "  cd backend"
    echo "  node scripts/initializeSettings.js"
    echo "  node scripts/createAdmin.js"
fi

# Resumo
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} Setup concluído!${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo ""
echo "1. Configure as API keys nos ficheiros .env:"
echo "   - ai/.env (OPENAI_API_KEY ou ANTHROPIC_API_KEY)"
echo "   - ui_test/.env (OPENAI_API_KEY)"
echo ""
if pgrep -x "mongod" > /dev/null; then
    echo "2. Base de dados já inicializada ✅"
    echo "   Credenciais admin: admin@exemplo.com / Admin123!"
else
    echo "2. Inicialize a base de dados:"
    echo "   cd backend"
    echo "   node scripts/initializeSettings.js"
    echo "   node scripts/createAdmin.js"
fi
echo ""
echo "3. Inicie os serviços:"
echo "   ./start-all.sh"
echo "   ou manualmente em terminais separados"
echo ""
echo "4. Aceda ao frontend:"
echo "   http://localhost:5173"
echo "   Login: admin@exemplo.com / Admin123!"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
