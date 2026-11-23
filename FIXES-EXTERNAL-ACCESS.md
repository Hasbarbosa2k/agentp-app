# 🔧 Correções para Acesso Externo

## Problemas Corrigidos

1. ✅ **Serviços agora escutam em `0.0.0.0`** (acessíveis externamente)
2. ✅ **CORS atualizado** para permitir acesso externo em desenvolvimento
3. ✅ **Script start-all.sh melhorado** com melhor verificação de inicialização
4. ✅ **Detecção automática de IP público** no script

## Alterações Realizadas

### 1. Backend (`backend/server.js`)
- Agora escuta em `0.0.0.0` em vez de apenas `localhost`
- CORS permite acesso externo em desenvolvimento

### 2. AI Service (`ai/src/index.ts`)
- Agora escuta em `0.0.0.0`
- CORS atualizado

### 3. UI Tests (`ui_test/server.js`)
- Agora escuta em `0.0.0.0`
- CORS atualizado

### 4. Frontend (`frontend/vite.config.ts`)
- Já tinha `host: true` configurado (correto)

### 5. Script `start-all.sh`
- Melhor verificação de inicialização dos serviços
- Detecção automática de IP público
- Mostra URLs locais e públicas

## Como Usar

### 1. Parar serviços atuais

```bash
./stop-all.sh
```

### 2. Reiniciar serviços

```bash
./start-all.sh
```

O script agora mostra:
- URLs locais (localhost)
- URLs com IP público (se detectado)
- URLs com IP local da rede

### 3. Configurar Firewall (Importante!)

Para permitir acesso externo, abra as portas no firewall:

```bash
chmod +x setup-firewall.sh
sudo ./setup-firewall.sh
```

Ou manualmente com UFW:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 5173/tcp
```

### 4. Verificar se está a funcionar

```bash
# Verificar portas abertas
sudo netstat -tlnp | grep -E ':(3000|3001|3002|5173)'

# Testar localmente
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:5173

# Testar com IP público (substituir pelo seu IP)
curl http://203.0.113.12:3000/health
```

## URLs de Acesso

Após iniciar os serviços, pode aceder através de:

### IP Público: `203.0.113.12`

- **Backend:** http://203.0.113.12:3000
- **AI Service:** http://203.0.113.12:3001
- **Frontend:** http://203.0.113.12:5173
- **UI Tests:** http://203.0.113.12:3002

### Localhost (na VM)

- **Backend:** http://localhost:3000
- **AI Service:** http://localhost:3001
- **Frontend:** http://localhost:5173
- **UI Tests:** http://localhost:3002

## Troubleshooting

### Serviços não iniciam

Verificar logs:

```bash
tail -f logs/Backend.log
tail -f logs/AI_Service.log
tail -f logs/UI_Tests.log
tail -f logs/Frontend.log
```

### Porta já em uso

```bash
# Ver qual processo está a usar a porta
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :3002
sudo lsof -i :5173

# Matar processo
sudo kill -9 <PID>
```

### Firewall bloqueando

```bash
# Verificar status UFW
sudo ufw status

# Verificar se portas estão abertas
sudo ufw status | grep -E '(3000|3001|3002|5173)'
```

### CORS errors no browser

Se ainda tiver erros CORS, verificar se `NODE_ENV=development` está definido nos `.env` ou definir:

```bash
# backend/.env
ALLOW_EXTERNAL_ACCESS=true

# ai/.env (se necessário)
ALLOW_EXTERNAL_ACCESS=true

# ui_test/.env (se necessário)
ALLOW_EXTERNAL_ACCESS=true
```

## Variáveis de Ambiente Opcionais

Pode definir estas variáveis nos `.env` para controlo fino:

```bash
# Forçar host específico (opcional)
HOST=0.0.0.0

# Permitir acesso externo explicitamente
ALLOW_EXTERNAL_ACCESS=true

# Ambiente
NODE_ENV=development
```

## Verificação Final

Execute o script de verificação:

```bash
./check-status.sh
```

Todos os serviços devem mostrar `✅ Running`.
