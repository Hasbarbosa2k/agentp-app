# 🔄 Guia de Atualização no Servidor

## Passos para Atualizar o Servidor

### 1. Fazer Pull das Alterações

```bash
cd /app/agentp
git pull origin main
# ou o branch que estiver a usar
```

### 2. Parar Todos os Serviços

```bash
./stop-all.sh
```

### 3. Atualizar Dependências (se necessário)

```bash
# Backend
cd backend && npm install && cd ..

# AI Service
cd ai && npm install && cd ..
cd ai && npm run build && cd ..

# Frontend
cd frontend && npm install && cd ..

# UI Tests
cd ui_test && npm install && cd ..
```

### 4. Configurar Frontend .env (Importante!)

```bash
cd /app/agentp/frontend

# Criar/atualizar .env com IP público
cat > .env << 'EOF'
# Para acesso externo, descomentar e usar IP do servidor
VITE_API_URL=http://203.0.113.12:3000
VITE_AGENT_API_URL=http://203.0.113.12:3002
EOF

# OU deixar vazio para usar proxy do Vite (funciona se proxy estiver configurado)
```

### 5. Verificar Firewall

```bash
# Verificar se portas estão abertas
sudo ufw status | grep -E '(3000|3001|3002|5173)'

# Se não estiverem, abrir:
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 5173/tcp
```

### 6. Reiniciar Serviços

```bash
cd /app/agentp
./start-all.sh
```

### 7. Verificar Status

```bash
./check-status.sh

# Verificar interfaces
sudo netstat -tlnp | grep -E ':(3000|3001|3002|5173)'
# Todos devem mostrar :::PORT ou 0.0.0.0:PORT (não 127.0.0.1:PORT)
```

### 8. Testar Acesso

```bash
# Testar localmente
curl http://localhost:5173

# Testar externamente
curl http://203.0.113.12:5173
curl http://203.0.113.12:3000/health
```

## Alterações Realizadas

### ✅ Frontend
- `vite.config.ts`: Configurado para escutar em `0.0.0.0` e adicionado IP público ao `allowedHosts`
- `package.json`: Script `dev` agora inclui `--host 0.0.0.0`
- `.env`: Template atualizado com comentários sobre configuração

### ✅ Backend
- `server.js`: Já configurado para escutar em `0.0.0.0`
- CORS: Atualizado para permitir acesso externo em desenvolvimento

### ✅ AI Service
- `src/index.ts`: Já configurado para escutar em `0.0.0.0`
- CORS: Atualizado para permitir acesso externo

### ✅ UI Tests
- `server.js`: Já configurado para escutar em `0.0.0.0`
- `nodemon.json`: Criado para evitar problemas com nodemon
- CORS: Atualizado para permitir acesso externo

### ✅ Scripts
- `start-all.sh`: Atualizado para iniciar frontend corretamente com suporte a build de produção

## Troubleshooting

### Frontend não acessível externamente

```bash
# Verificar se está a escutar em 0.0.0.0
sudo netstat -tlnp | grep 5173
# Deve mostrar :::5173, não ::1:5173

# Se mostrar ::1:5173, o frontend não está a usar --host 0.0.0.0
# Verificar logs
tail -20 logs/Frontend.log
```

### API retorna 404

```bash
# Verificar se .env do frontend está configurado
cat frontend/.env

# Se VITE_API_URL estiver vazio, o proxy do Vite deve funcionar
# Testar proxy localmente
curl http://localhost:5173/api/health
```

### Serviços não iniciam

```bash
# Ver logs
tail -f logs/Backend.log
tail -f logs/AI_Service.log
tail -f logs/UI_Tests.log
tail -f logs/Frontend.log
```

## Notas Importantes

1. **IP Público**: Se o IP público mudar, atualize:
   - `frontend/.env` (VITE_API_URL e VITE_AGENT_API_URL)
   - `frontend/vite.config.ts` (allowedHosts)

2. **Firewall do Cloud Provider**: Se usar Hetzner Cloud, DigitalOcean, etc., verifique o firewall no painel de controlo

3. **Build de Produção**: Se o dev server do Vite continuar a dar problemas, considere fazer build localmente e transferir `dist/` para o servidor
