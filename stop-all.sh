#!/bin/bash

# AgentP - Stop All Services
# Para todos os serviços do AgentP

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}[INFO] Parando todos os serviços AgentP...${NC}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parar usando PIDs salvos
if [ -d "$ROOT_DIR/logs" ]; then
    for pidfile in "$ROOT_DIR/logs"/*.pid; do
        if [ -f "$pidfile" ]; then
            PID=$(cat "$pidfile")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID" 2>/dev/null
                echo -e "${GREEN}  Processo $PID parado${NC}"
            fi
            rm "$pidfile"
        fi
    done
fi

# Parar processos Node.js relacionados
pkill -f "npm run dev" 2>/dev/null
pkill -f "node.*backend" 2>/dev/null
pkill -f "node.*ai" 2>/dev/null
pkill -f "node.*ui_test" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "ts-node-dev" 2>/dev/null

# Parar processos Python relacionados
pkill -f "run_agent.py" 2>/dev/null

# Verificar portas e matar processos restantes
for port in 3000 3001 3002 5173; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null
        echo -e "${GREEN}  Porta $port limpa${NC}"
    fi
done

echo -e "${GREEN}[SUCCESS] Todos os serviços parados${NC}"
