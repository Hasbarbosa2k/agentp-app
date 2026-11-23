# 📝 Changelog - Correções para Acesso Externo

## Alterações Realizadas

### ✅ Frontend (`frontend/`)

1. **vite.config.ts**
   - Alterado `host: true` para `host: '0.0.0.0'` (explícito)
   - Adicionado `'203.0.113.12'` ao array `allowedHosts`

2. **package.json**
   - Script `dev` atualizado: `"dev": "vite --host 0.0.0.0"`
   - Script `preview` atualizado: `"preview": "vite preview --host 0.0.0.0"`

3. **.env**
   - Template atualizado com comentários sobre configuração
   - Exemplos de `VITE_API_URL` e `VITE_AGENT_API_URL` para acesso externo

### ✅ Backend (`backend/`)

1. **server.js**
   - Já estava correto: `app.listen(PORT, HOST, ...)` com `HOST = '0.0.0.0'`
   - CORS atualizado para permitir acesso externo em desenvolvimento

### ✅ AI Service (`ai/`)

1. **src/index.ts**
   - Já estava correto: `app.listen(port, host, ...)` com `host = '0.0.0.0'`
   - CORS atualizado para permitir acesso externo

### ✅ UI Tests (`ui_test/`)

1. **server.js**
   - Já estava correto: `app.listen(port, host, ...)` com `host = '0.0.0.0'`
   - CORS atualizado para permitir acesso externo

2. **nodemon.json** (NOVO)
   - Criado para evitar problemas com nodemon tentando executar ficheiros em `tests/`
   - Configurado para ignorar `tests/**` corretamente

### ✅ Scripts

1. **start-all.sh**
   - Atualizado para iniciar Frontend com suporte a build de produção
   - Se `dist/` existir, usa `serve`, senão usa `npm run dev` (que já tem `--host 0.0.0.0`)

2. **update-server.sh** (NOVO)
   - Script automatizado para atualizar código e reiniciar serviços
   - Configura automaticamente `.env` do frontend com IP público

3. **UPDATE-SERVER.md** (NOVO)
   - Guia completo de atualização no servidor

## Ficheiros Modificados

- `frontend/vite.config.ts`
- `frontend/package.json`
- `frontend/.env`
- `start-all.sh`
- `ui_test/nodemon.json` (criado)

## Ficheiros Criados

- `ui_test/nodemon.json`
- `update-server.sh`
- `UPDATE-SERVER.md`
- `CHANGELOG-SERVER-FIXES.md` (este ficheiro)

## Como Aplicar no Servidor

### Opção 1: Git Pull (Recomendado)

```bash
cd /app/agentp
git pull
chmod +x update-server.sh
./update-server.sh
```

### Opção 2: Manual

```bash
cd /app/agentp
./stop-all.sh

# Fazer pull ou transferir ficheiros atualizados
git pull  # ou transferir manualmente

# Atualizar dependências
cd backend && npm install && cd ..
cd ai && npm install && npm run build && cd ..
cd frontend && npm install && cd ..
cd ui_test && npm install && cd ..

# Configurar frontend .env
cd frontend
cat > .env << 'EOF'
VITE_API_URL=http://203.0.113.12:3000
VITE_AGENT_API_URL=http://203.0.113.12:3002
EOF
cd ..

# Reiniciar
./start-all.sh
```

## Verificação

Após atualizar, verificar:

```bash
# 1. Status dos serviços
./check-status.sh

# 2. Interfaces (todos devem mostrar :::PORT ou 0.0.0.0:PORT)
sudo netstat -tlnp | grep -E ':(3000|3001|3002|5173)'

# 3. Testes
curl http://localhost:5173
curl http://203.0.113.12:5173
curl http://203.0.113.12:3000/health
```

## Notas

- O IP `203.0.113.12` está hardcoded em alguns lugares. Se mudar, atualize:
  - `frontend/vite.config.ts` (allowedHosts)
  - `frontend/.env` (VITE_API_URL, VITE_AGENT_API_URL)

- O script `update-server.sh` tenta detectar o IP público automaticamente
