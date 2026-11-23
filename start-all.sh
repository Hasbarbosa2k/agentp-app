#!/bin/bash

# AgentP - Start All Services (Linux/Ubuntu)
# Inicia todos os serviços do AgentP em background

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
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
    echo -e "${YELLOW}[WARN] MongoDB não está a correr. Tentando iniciar...${NC}"
    if sudo systemctl start mongod 2>/dev/null; then
        echo -e "${GREEN}[SUCCESS] MongoDB iniciado${NC}"
    else
        echo -e "${RED}[ERROR] Falha ao iniciar MongoDB. Inicie manualmente: sudo systemctl start mongod${NC}"
    fi
fi

# Obter diretório raiz
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Verificar estrutura
if [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "ai" ] || [ ! -d "ui_test" ]; then
    echo -e "${RED}[ERROR] Estrutura do projeto não encontrada!${NC}"
    echo "Certifique-se de que está no diretório raiz do projeto AgentP"
    exit 1
fi

echo -e "${GREEN}[INFO] Starting all services...${NC}"
echo ""

# Função para iniciar serviço
start_service() {
    local name=$1
    local path=$2
    local port=$3
    
    echo -e "${YELLOW}[INFO] Starting $name on port $port...${NC}"
    cd "$ROOT_DIR/$path"
    
    # Verificar se já está a correr
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}[WARN] Porta $port já está em uso. A saltar $name...${NC}"
        return
    fi
    
    # Criar diretório de logs se não existir
    mkdir -p "$ROOT_DIR/logs"
    
    if [ "$name" == "UI Tests" ]; then
        # UI Tests precisa do venv ativado
        if [ -d ".venv" ]; then
            source .venv/bin/activate
            nohup npm run dev > "$ROOT_DIR/logs/ui_test.log" 2>&1 &
            local pid=$!
            echo $pid > "$ROOT_DIR/logs/ui_test.pid"
            deactivate
        else
            echo -e "${RED}[ERROR] .venv não encontrado em ui_test. Execute setup primeiro.${NC}"
            return
        fi
    elif [ "$name" == "Frontend" ]; then
        # Frontend: usar serve se dist/ existe, senão dev server com host explícito
        if [ -d "dist" ] && [ "$(ls -A dist 2>/dev/null)" ]; then
            echo -e "${GREEN}[INFO] Usando build de produção (serve)${NC}"
            nohup serve -s dist -l $port --host 0.0.0.0 > "$ROOT_DIR/logs/Frontend.log" 2>&1 &
            local pid=$!
            echo $pid > "$ROOT_DIR/logs/Frontend.pid"
        else
            echo -e "${YELLOW}[WARN] Usando dev server...${NC}"
            # O package.json já tem --host 0.0.0.0, mas garantir
            nohup npm run dev > "$ROOT_DIR/logs/Frontend.log" 2>&1 &
            local pid=$!
            echo $pid > "$ROOT_DIR/logs/Frontend.pid"
        fi
    else
        nohup npm run dev > "$ROOT_DIR/logs/${name// /_}.log" 2>&1 &
        local pid=$!
        echo $pid > "$ROOT_DIR/logs/${name// /_}.pid"
    fi
    
    # Aguardar mais tempo e verificar múltiplas vezes
    local max_attempts=10
    local attempt=0
    local started=false
    
    while [ $attempt -lt $max_attempts ]; do
        sleep 1
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            started=true
            break
        fi
        attempt=$((attempt + 1))
    done
    
    # Verificar se iniciou
    if [ "$started" = true ]; then
        echo -e "${GREEN}[SUCCESS] $name iniciado (PID: $pid)${NC}"
    else
        echo -e "${RED}[ERROR] $name não iniciou após ${max_attempts}s. Verifique os logs:${NC}"
        echo -e "${YELLOW}  tail -f $ROOT_DIR/logs/${name// /_}.log${NC}"
        # Mostrar últimas linhas do log
        if [ -f "$ROOT_DIR/logs/${name// /_}.log" ]; then
            echo -e "${YELLOW}  Últimas linhas do log:${NC}"
            tail -n 5 "$ROOT_DIR/logs/${name// /_}.log" | sed 's/^/    /'
        fi
    fi
}

# Limpar processos antigos (opcional)
if [ "$1" != "--no-cleanup" ]; then
    read -p "$(echo -e ${YELLOW}Limpar processos antigos nas portas? [y/N]: ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}[INFO] Limpando portas...${NC}"
        for port in 3000 3001 3002 5173; do
            PID=$(lsof -ti:$port 2>/dev/null)
            if [ ! -z "$PID" ]; then
                kill -9 $PID 2>/dev/null && echo -e "${GREEN}  Porta $port limpa${NC}"
            fi
        done
        sleep 1
    fi
fi

# Iniciar serviços
start_service "Backend" "backend" "3000"
start_service "AI Service" "ai" "3001"
start_service "UI Tests" "ui_test" "3002"
start_service "Frontend" "frontend" "5173"

# Obter IP público
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} All services started!${NC}"
echo ""
echo -e "${CYAN}Services (Local):${NC}"
echo -e "   - Backend:    http://localhost:3000  (API Docs: /api-docs)${NC}"
echo -e "   - AI Service: http://localhost:3001  (Swagger: /docs)${NC}"
echo -e "   - Frontend:   http://localhost:5173${NC}"
echo -e "   - UI Tests:   http://localhost:3002  (Swagger: /docs)${NC}"
echo ""
if [ "$PUBLIC_IP" != "localhost" ] && [ ! -z "$PUBLIC_IP" ]; then
    echo -e "${CYAN}Services (Public IP: $PUBLIC_IP):${NC}"
    echo -e "   - Backend:    http://$PUBLIC_IP:3000  (API Docs: /api-docs)${NC}"
    echo -e "   - AI Service: http://$PUBLIC_IP:3001  (Swagger: /docs)${NC}"
    echo -e "   - Frontend:   http://$PUBLIC_IP:5173${NC}"
    echo -e "   - UI Tests:   http://$PUBLIC_IP:3002  (Swagger: /docs)${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Certifique-se de que o firewall permite estas portas!${NC}"
    echo ""
fi
if [ "$LOCAL_IP" != "localhost" ] && [ "$LOCAL_IP" != "$PUBLIC_IP" ]; then
    echo -e "${CYAN}Services (Local IP: $LOCAL_IP):${NC}"
    echo -e "   - Backend:    http://$LOCAL_IP:3000${NC}"
    echo -e "   - AI Service: http://$LOCAL_IP:3001${NC}"
    echo -e "   - Frontend:   http://$LOCAL_IP:5173${NC}"
    echo -e "   - UI Tests:   http://$LOCAL_IP:3002${NC}"
    echo ""
fi
echo -e "${YELLOW}[INFO] Logs disponíveis em: $ROOT_DIR/logs/${NC}"
echo -e "${YELLOW}[INFO] PIDs salvos em: $ROOT_DIR/logs/*.pid${NC}"
echo ""
echo -e "${YELLOW}Para parar todos os serviços:${NC}"
echo -e "  ./stop-all.sh"
echo ""
echo -e "${YELLOW}Para verificar status:${NC}"
echo -e "  ./check-status.sh"
echo ""
read -p "$(echo -e ${CYAN}Abrir frontend no browser? [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:5173
    elif command -v gnome-open &> /dev/null; then
        gnome-open http://localhost:5173
    else
        echo -e "${YELLOW}[INFO] Abra manualmente: http://localhost:5173${NC}"
    fi
fi
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
