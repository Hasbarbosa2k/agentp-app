# Validação de Output em Templates

## Visão Geral

Foi implementada uma nova funcionalidade de validação de output nos templates de onboarding que permite verificar se um texto específico aparece no output de um comando. Esta validação determina automaticamente se um step deve ser marcado como **SUCCESS** ou **FAILED**.

## Nova Validação: `output_contains`

### Características
- **Tipo**: `output_contains`
- **Funcionamento**: Verifica se um texto específico aparece no output do comando
- **Resultado**: Determina automaticamente o status do step (SUCCESS/FAILED)
- **Simplicidade**: Apenas texto simples, sem regex ou lógica complexa

### Sintaxe
```json
{
  "type": "output_contains",
  "value": "texto_a_procurar",
  "description": "Descrição da validação",
  "required": true
}
```

### Comportamento
- ✅ **Se o texto aparecer no output** → Step = **SUCCESS**
- ❌ **Se o texto NÃO aparecer no output** → Step = **FAILED**

## Exemplos Práticos

### 1. Verificar Sistema Operacional
```json
{
  "name": "Verificar Sistema Operacional",
  "command": "cat /etc/os-release",
  "validations": [
    {
      "type": "output_contains",
      "value": "Ubuntu",
      "description": "Verifica se o sistema é Ubuntu",
      "required": true
    }
  ]
}
```

**Resultados:**
- Output com "Ubuntu" → ✅ SUCCESS
- Output sem "Ubuntu" → ❌ FAILED

### 2. Verificar Memória RAM
```json
{
  "name": "Verificar Memória RAM",
  "command": "free -h",
  "validations": [
    {
      "type": "output_contains",
      "value": "Mem:",
      "description": "Verifica se o comando free retornou informações",
      "required": true
    },
    {
      "type": "output_contains",
      "value": "Gi",
      "description": "Verifica se a memória está em GB",
      "required": false
    }
  ]
}
```

**Resultados:**
- Output com "Mem:" → ✅ SUCCESS (validação obrigatória)
- Output com "Gi" → ✅ SUCCESS (validação opcional)
- Output sem "Gi" → ✅ SUCCESS (validação opcional falha, mas não afeta o step)

### 3. Verificar Conectividade
```json
{
  "name": "Verificar Conectividade",
  "command": "ping -c 3 8.8.8.8",
  "validations": [
    {
      "type": "output_contains",
      "value": "3 packets transmitted",
      "description": "Verifica se o ping foi executado",
      "required": true
    },
    {
      "type": "output_contains",
      "value": "0% packet loss",
      "description": "Verifica se não há perda de pacotes",
      "required": false
    }
  ]
}
```

## Implementação Técnica

### 1. Modelo Atualizado
- **Arquivo**: `models/OnboardingTemplate.js`
- **Mudança**: Adicionado `'output_contains'` ao enum de tipos de validação
- **Método**: `executeValidation()` agora inclui o caso para `output_contains`

### 2. Validador Atualizado
- **Arquivo**: `validators/templates.js`
- **Mudança**: Adicionado `'output_contains'` aos tipos válidos de validação

### 3. Exemplo Completo
- **Arquivo**: `examples/template-with-output-validation.js`
- **Conteúdo**: Template completo com 5 steps demonstrando diferentes cenários

### 4. Script de Teste
- **Arquivo**: `scripts/test-output-validation.js`
- **Funcionalidade**: Testa 9 cenários diferentes de validação

## Como Usar

### 1. Criar Template com Validação
```javascript
const template = {
  name: "Meu Template",
  steps: [
    {
      name: "Verificar Sistema",
      command: "uname -a",
      validations: [
        {
          type: "output_contains",
          value: "Linux",
          description: "Sistema deve ser Linux",
          required: true
        }
      ],
      order: 1
    }
  ]
};
```

### 2. Testar Validações
```javascript
const { testValidations } = require('./examples/template-with-output-validation');

// Testar se um output específico passa na validação
const results = await testValidations(templateId, stepIndex, output);
console.log('Sucesso:', results.overallSuccess);
```

### 3. Executar Testes Completos
```bash
node scripts/test-output-validation.js
```

## Vantagens da Nova Validação

### 1. Simplicidade
- Apenas texto simples, sem regex
- Fácil de entender e configurar
- Menos propenso a erros

### 2. Clareza
- Mensagens claras: "Step SUCCESS" ou "Step FAILED"
- Determinação automática do status
- Feedback imediato

### 3. Flexibilidade
- Validações obrigatórias e opcionais
- Múltiplas validações por step
- Combinação com outros tipos de validação

### 4. Integração
- Compatível com sistema existente
- Funciona com todos os endpoints
- Suporte completo na documentação

## Casos de Uso Comuns

### 1. Verificação de Sistema
- Detectar sistema operacional
- Verificar versão de software
- Confirmar arquitetura

### 2. Verificação de Recursos
- Memória disponível
- Espaço em disco
- CPU e processadores

### 3. Verificação de Serviços
- Serviços ativos
- Portas abertas
- Conectividade de rede

### 4. Verificação de Segurança
- Firewall ativo
- Antivírus instalado
- Logs de segurança

## Testes Realizados

O script de teste demonstra 9 cenários diferentes:

1. ✅ **SUCCESS**: Texto esperado encontrado
2. ❌ **FAILED**: Texto esperado não encontrado
3. ❌ **FAILED**: Output vazio
4. ✅ **SUCCESS**: Múltiplas validações passando
5. ✅ **SUCCESS**: Validação opcional falhando (não afeta step)
6. ✅ **SUCCESS**: Validações de disco
7. ✅ **SUCCESS**: Validações de serviços
8. ✅ **SUCCESS**: Conectividade boa
9. ✅ **SUCCESS**: Conectividade ruim (mas comando executado)

## Conclusão

A nova validação `output_contains` oferece uma forma simples e eficaz de validar outputs de comandos, determinando automaticamente o sucesso ou falha de steps em templates de onboarding. É especialmente útil para verificações básicas de sistema e recursos. 