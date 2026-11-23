#!/bin/bash

# AgentP - Setup Firewall
# Configura o firewall para permitir acesso às portas do AgentP

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          AgentP - Firewall Configuration                ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

PORTS=(3000 3001 3002 5173)

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}[ERROR] Este script precisa de ser executado como root${NC}"
    echo "Execute: sudo ./setup-firewall.sh"
    exit 1
fi

# Detectar tipo de firewall
if command -v ufw &> /dev/null; then
    echo -e "${GREEN}[INFO] Detectado UFW (Ubuntu Firewall)${NC}"
    FIREWALL_TYPE="ufw"
elif command -v firewall-cmd &> /dev/null; then
    echo -e "${GREEN}[INFO] Detectado firewalld (CentOS/RHEL)${NC}"
    FIREWALL_TYPE="firewalld"
elif command -v iptables &> /dev/null; then
    echo -e "${GREEN}[INFO] Detectado iptables${NC}"
    FIREWALL_TYPE="iptables"
else
    echo -e "${YELLOW}[WARN] Nenhum firewall detectado ou firewall não configurado${NC}"
    exit 0
fi

# Configurar UFW
if [ "$FIREWALL_TYPE" == "ufw" ]; then
    echo -e "${CYAN}[INFO] Configurando UFW...${NC}"
    
    for port in "${PORTS[@]}"; do
        if ufw status | grep -q "$port/tcp"; then
            echo -e "${YELLOW}  Porta $port já está configurada${NC}"
        else
            ufw allow $port/tcp
            echo -e "${GREEN}  Porta $port aberta${NC}"
        fi
    done
    
    # Verificar status
    echo ""
    echo -e "${CYAN}Status do firewall:${NC}"
    ufw status | grep -E "($(IFS='|'; echo "${PORTS[*]}"))"
    
# Configurar firewalld
elif [ "$FIREWALL_TYPE" == "firewalld" ]; then
    echo -e "${CYAN}[INFO] Configurando firewalld...${NC}"
    
    for port in "${PORTS[@]}"; do
        if firewall-cmd --list-ports | grep -q "$port/tcp"; then
            echo -e "${YELLOW}  Porta $port já está configurada${NC}"
        else
            firewall-cmd --permanent --add-port=$port/tcp
            echo -e "${GREEN}  Porta $port aberta${NC}"
        fi
    done
    
    firewall-cmd --reload
    
    echo ""
    echo -e "${CYAN}Portas abertas:${NC}"
    firewall-cmd --list-ports

# Configurar iptables
elif [ "$FIREWALL_TYPE" == "iptables" ]; then
    echo -e "${CYAN}[INFO] Configurando iptables...${NC}"
    echo -e "${YELLOW}[WARN] iptables requer configuração manual ou script específico${NC}"
    echo ""
    echo "Execute manualmente para cada porta:"
    for port in "${PORTS[@]}"; do
        echo "  iptables -A INPUT -p tcp --dport $port -j ACCEPT"
    done
    echo ""
    echo "Para tornar permanente (Ubuntu/Debian):"
    echo "  apt install iptables-persistent"
    echo "  netfilter-persistent save"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} Firewall configurado!${NC}"
echo ""
echo -e "${YELLOW}Portas abertas:${NC}"
for port in "${PORTS[@]}"; do
    echo -e "  - Porta $port (TCP)"
done
echo ""
echo -e "${CYAN}Verificar se as portas estão abertas:${NC}"
echo "  sudo netstat -tlnp | grep -E '($(IFS='|'; echo "${PORTS[*]}"))'"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
