#!/bin/bash

# AgentP - Initialize Database
# Script para inicializar a base de dados com configurações e utilizador admin

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           AgentP - Database Initialization               ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está no diretório correto
if [ ! -d "backend" ]; then
    echo -e "${RED}[ERROR] Execute este script a partir do diretório raiz do projeto${NC}"
    exit 1
fi

# Verificar MongoDB
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${YELLOW}[WARN] MongoDB não está a correr. Tentando iniciar...${NC}"
    if sudo systemctl start mongod 2>/dev/null; then
        echo -e "${GREEN}[SUCCESS] MongoDB iniciado${NC}"
        sleep 2
    else
        echo -e "${RED}[ERROR] Falha ao iniciar MongoDB${NC}"
        echo "Inicie manualmente: sudo systemctl start mongod"
        exit 1
    fi
fi

# Verificar .env do backend
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}[ERROR] backend/.env não encontrado${NC}"
    echo "Configure o .env primeiro antes de inicializar a base de dados"
    exit 1
fi

cd backend

# 1. Inicializar configurações
echo -e "${CYAN}[1/3] Inicializando configurações do sistema...${NC}"
if node scripts/initializeSettings.js; then
    echo -e "${GREEN}[SUCCESS] Configurações criadas${NC}"
else
    echo -e "${YELLOW}[WARN] Configurações já existem ou erro ao criar${NC}"
fi
echo ""

# 2. Criar utilizador admin
echo -e "${CYAN}[2/3] Criando utilizador administrador...${NC}"
if node scripts/createAdmin.js; then
    echo -e "${GREEN}[SUCCESS] Administrador criado${NC}"
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW} Credenciais do Administrador:${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo -e "  Email:    ${GREEN}admin@exemplo.com${NC}"
    echo -e "  Password: ${GREEN}Admin123!${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${RED}⚠️  IMPORTANTE: Altere a password após o primeiro login!${NC}"
    echo ""
else
    echo -e "${YELLOW}[WARN] Admin já existe ou erro ao criar${NC}"
fi
echo ""

# 3. Perguntar sobre sistemas de exemplo
read -p "$(echo -e ${CYAN}[3/3] Criar sistemas de exemplo? [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}Criando sistemas de exemplo...${NC}"
    if node scripts/createSampleSystems.js; then
        echo -e "${GREEN}[SUCCESS] Sistemas de exemplo criados${NC}"
    else
        echo -e "${YELLOW}[WARN] Erro ao criar sistemas de exemplo${NC}"
    fi
else
    echo -e "${YELLOW}[INFO] Sistemas de exemplo ignorados${NC}"
fi

cd ..

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} Base de dados inicializada com sucesso!${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "  1. Inicie os serviços: ./start-all.sh"
echo "  2. Aceda ao frontend: http://localhost:5173"
echo "  3. Faça login com as credenciais acima"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
