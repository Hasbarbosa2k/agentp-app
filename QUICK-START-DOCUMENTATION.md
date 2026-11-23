# 🚀 Quick Start - Geração de Documentação

## ⚡ Início Rápido (5 minutos)

### 1. Configuração

```bash
# Backend - Dependências já instaladas ✅
cd backend

# AI Module - Configurar API key
cd ../ai
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
# ou
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env
```

### 2. Iniciar Serviços

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - AI Module
cd ai
npm run dev

# Terminal 3 - Frontend
cd frontend
npm run dev
```

### 3. Usar Interface

1. Abrir browser: `http://localhost:5173`
2. Login: `admin@example.com` / `Admin123!`
3. Menu lateral → **Documentation**
4. Preencher formulário:
   - Sistema: Selecionar ou escrever nome
   - Descrição: Descrever testes realizados (ser detalhado!)
5. Clicar **"Gerar PDF"**
6. Aguardar 30-60s
7. PDF será descarregado automaticamente

## 📝 Exemplo de Prompt

```
Realizamos testes de performance no servidor web.

Configuração:
- 1000 utilizadores simultâneos
- Duração: 2 horas
- Ferramenta: JMeter

Resultados:
- Tempo resposta médio: 200ms
- CPU: 60% média
- Memória: 70% utilização
- Taxa de erro: 0.1%

Conclusão: Sistema estável e performante.
```

## 🔧 Troubleshooting Rápido

### PDF não é gerado
```bash
# Verificar AI Module
curl http://localhost:3001/health

# Verificar logs
# Ver terminal do AI Module e Backend
```

### Erro "AI server unreachable"
```bash
# Verificar porta 3001
netstat -an | grep 3001

# Reiniciar AI Module
cd ai
npm run dev
```

### Timeout
- Aguardar mais tempo (pode demorar até 60s)
- Verificar API keys da IA
- Verificar rate limits

## 📚 Documentação Completa

- **Detalhes**: `backend/DOCUMENTATION-GENERATION-README.md`
- **Resumo**: `DOCUMENTATION-FEATURE-SUMMARY.md`
- **Exemplo código**: `backend/examples/documentation-generation-example.js`

## 🎯 API Rápida

```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}' \
  | jq -r '.token')

# Gerar PDF
curl -X POST http://localhost:3000/api/documentation/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "systemName": "Test System",
    "testDescription": "Testes realizados com sucesso. Sistema estável."
  }' \
  --output report.pdf

echo "✅ PDF gerado: report.pdf"
```

## ✅ Checklist

- [ ] Backend a correr (porta 3000)
- [ ] AI Module a correr (porta 3001)
- [ ] Frontend a correr (porta 5173)
- [ ] API key da IA configurada
- [ ] MongoDB conectado
- [ ] Login funcional
- [ ] Página Documentation acessível

**Tudo pronto? Começar a gerar relatórios! 🎉**
