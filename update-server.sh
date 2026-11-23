#!/bin/bash

# AgentP - Quick Update Script
# Atualiza o código e reinicia os serviços

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          AgentP - Quick Update Script                  ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 1. Parar serviços
echo -e "${YELLOW}[1/6] Parando serviços...${NC}"
./stop-all.sh
sleep 2

# 2. Fazer pull (se usar git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}[2/6] Atualizando código (git pull)...${NC}"
    git pull || echo -e "${YELLOW}[WARN] Git pull falhou ou não há alterações${NC}"
else
    echo -e "${YELLOW}[2/6] Repositório Git não encontrado. Atualize manualmente.${NC}"
fi

# 3. Atualizar dependências
echo -e "${YELLOW}[3/6] Atualizando dependências...${NC}"

echo "  → Backend..."
cd backend
npm install --silent
cd ..

echo "  → AI Service..."
cd ai
npm install --silent
npm run build --silent
cd ..

echo "  → Frontend..."
cd frontend
npm install --silent
cd ..

echo "  → UI Tests..."
cd ui_test
npm install --silent
cd ..

# 4. Configurar frontend .env (se não existir com IP)
echo -e "${YELLOW}[4/6] Verificando configuração do frontend...${NC}"
cd frontend
if [ ! -f ".env" ] || ! grep -q "VITE_API_URL" .env 2>/dev/null; then
    echo -e "${YELLOW}  Criando/atualizando .env...${NC}"
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
    if [ ! -z "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "localhost" ]; then
        cat > .env << EOF
# AgentP Frontend Environment Variables
# Configurado automaticamente para IP: $PUBLIC_IP

VITE_API_URL=http://$PUBLIC_IP:3000
VITE_AGENT_API_URL=http://$PUBLIC_IP:3002
EOF
        echo -e "${GREEN}  .env criado com IP: $PUBLIC_IP${NC}"
    else
        echo -e "${YELLOW}  IP público não detectado. Configure manualmente o .env${NC}"
    fi
else
    echo -e "${GREEN}  .env já existe${NC}"
fi
cd ..

# 5. Verificar firewall
echo -e "${YELLOW}[5/6] Verificando firewall...${NC}"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status | grep -i "Status" | awk '{print $2}')
    if [ "$UFW_STATUS" = "active" ]; then
        for port in 3000 3001 3002 5173; do
            if ! sudo ufw status | grep -q "$port/tcp"; then
                echo -e "${YELLOW}  Abrindo porta $port...${NC}"
                sudo ufw allow $port/tcp > /dev/null 2>&1
            fi
        done
        echo -e "${GREEN}  Firewall verificado${NC}"
    else
        echo -e "${YELLOW}  UFW inativo. Portas podem precisar de ser abertas manualmente.${NC}"
    fi
else
    echo -e "${YELLOW}  UFW não instalado. Verifique firewall manualmente.${NC}"
fi

# 6. Reiniciar serviços
echo -e "${YELLOW}[6/6] Reiniciando serviços...${NC}"
./start-all.sh --no-cleanup

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} Atualização concluída!${NC}"
echo ""
echo -e "${YELLOW}Verificar status:${NC}"
echo "  ./check-status.sh"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
