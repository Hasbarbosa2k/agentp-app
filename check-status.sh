#!/bin/bash

# AgentP - Check Status
# Verifica o status de todos os serviços

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== AgentP Status ===${NC}"
echo ""

# MongoDB
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✅ MongoDB: Running${NC}"
else
    echo -e "${RED}❌ MongoDB: Not running${NC}"
fi

# Backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend (3000): Running${NC}"
else
    echo -e "${RED}❌ Backend (3000): Not running${NC}"
fi

# AI Service
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ AI Service (3001): Running${NC}"
else
    echo -e "${RED}❌ AI Service (3001): Not running${NC}"
fi

# UI Tests
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ UI Tests (3002): Running${NC}"
else
    echo -e "${RED}❌ UI Tests (3002): Not running${NC}"
fi

# Frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend (5173): Running${NC}"
else
    echo -e "${RED}❌ Frontend (5173): Not running${NC}"
fi

echo ""

# Mostrar portas em uso
echo -e "${CYAN}Portas em uso:${NC}"
for port in 3000 3001 3002 5173; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        echo -e "  Porta $port: PID $PID ($PROCESS)"
    fi
done

echo ""
