# 🔧 Ações Manuais Necessárias Após Melhorias

## ✅ Checklist de Verificações

### 1. **Verificar/Criar Ficheiro `.env` no Backend**

O ficheiro `backend/.env` já existe, mas verifica se tem estas variáveis **obrigatórias**:

```env
# ✅ OBRIGATÓRIAS
MONGODB_URI=mongodb://localhost:27017/auth-api
JWT_ACCESS_SECRET=REDACTED
JWT_REFRESH_SECRET=REDACTED

# ✅ OPCIONAIS (com defaults)
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**⚠️ IMPORTANTE:** Se `NODE_ENV=production`, os secrets JWT devem ter **pelo menos 32 caracteres**.

---

### 2. **Verificar se o Frontend Usa Rotas `/api/*`**

As rotas legacy foram removidas. Verifica se o frontend está a usar:

- ✅ `/api/auth/*` (em vez de `/auth/*`)
- ✅ `/api/systems/*` (em vez de `/systems/*`)
- ✅ `/api/onboarding/*` (em vez de `/onboarding/*`)
- etc.

**Se o frontend ainda usar rotas sem `/api/`**, tens 2 opções:

**Opção A (Recomendado):** Atualizar frontend para usar `/api/*`
**Opção B:** Descomentar rotas legacy no `backend/server.js` (linhas 170-174)

---

### 3. **Instalar Dependências (se necessário)**

O `express-rate-limit` já está no `package.json`, mas verifica:

```bash
cd backend
npm install
```

---

### 4. **Testar a Aplicação**

#### Backend:
```bash
cd backend
npm run dev
```

**Verifica:**
- ✅ Servidor inicia sem erros
- ✅ Mensagem: "✅ Variáveis de ambiente validadas"
- ✅ MongoDB conecta com sucesso
- ✅ Rate limiting ativo (apenas em produção)

#### Frontend:
```bash
cd frontend
npm run dev
```

**Verifica:**
- ✅ Login funciona
- ✅ Refresh token funciona automaticamente
- ✅ Não há erros 404 nas rotas

---

### 5. **Testar Funcionalidades Críticas**

1. **Login/Logout:**
   - Fazer login
   - Verificar se tokens são guardados (access + refresh)
   - Fazer logout
   - Verificar se tokens são removidos

2. **Refresh Token:**
   - Fazer login
   - Esperar 15 minutos (ou alterar expiração no .env)
   - Fazer um request - deve renovar automaticamente

3. **Rate Limiting (apenas em produção):**
   - Em `NODE_ENV=production`
   - Fazer 11 tentativas de login rapidamente
   - Deve bloquear após 10 tentativas

---

### 6. **Verificar Logs**

**Backend:**
- ✅ Não devem aparecer passwords em plain text
- ✅ Erros não expõem stack traces em produção
- ✅ Logs de debug SSH removidos

**Frontend:**
- Console.logs removidos (ou usar `logger` utility)

---

## 🚨 Problemas Comuns e Soluções

### Erro: "Variáveis de ambiente obrigatórias em falta"
**Solução:** Adiciona as variáveis ao `backend/.env`

### Erro: "JWT_SECRET deve ter pelo menos 32 caracteres"
**Solução:** Em produção, usa secrets com 32+ caracteres

### Erro 404 nas rotas do frontend
**Solução:** Frontend precisa usar `/api/*` ou descomentar rotas legacy

### Rate limiting bloqueando em desenvolvimento
**Solução:** Verifica se `NODE_ENV=development` no `.env`

---

## 📝 Notas Adicionais

1. **Logger no Frontend:**
   - Criado `frontend/src/utils/logger.ts`
   - Usar `import { logger } from '@/utils/logger'` em vez de `console.log`
   - Logs só aparecem em desenvolvimento

2. **Error Handler:**
   - Criado `backend/utils/errorHandler.js`
   - Controllers já usam automaticamente
   - Erros não expõem detalhes em produção

3. **Validação de Env:**
   - Criado `backend/config/env.js`
   - Valida automaticamente no startup
   - Mostra erros claros se algo faltar

---

## ✅ Após Completar

1. ✅ Backend inicia sem erros
2. ✅ Frontend conecta ao backend
3. ✅ Login/Logout funcionam
4. ✅ Refresh token funciona
5. ✅ Não há passwords nos logs
6. ✅ Rate limiting ativo (produção)

**Tudo funcionando?** 🎉 As melhorias estão implementadas!
