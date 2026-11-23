# 🎯 Sistema de Templates de Onboarding Personalizáveis

## ✨ Visão Geral

O **Sistema de Templates de Onboarding** permite criar, gerenciar e executar processos de onboarding completamente personalizáveis. Você pode definir comandos específicos e validações automáticas para verificar os outputs.

### 🎯 **Exatamente como você solicitou:**

- ✅ **Criar templates personalizados** com comandos e validações
- ✅ **Definir validações baseadas em strings** presentes no output  
- ✅ **Exemplo: verificar OS, users, SNMP** conforme sua necessidade
- ✅ **Interface simples e intuitiva** via API REST

---

## 🚀 **Exemplo Prático**

### Criar Template para OS, Users e SNMP

```javascript
// Template exatamente como você solicitou
const meuTemplate = {
  name: "Verificação OS, Users e SNMP",
  description: "Template para verificar OS, usuários e status do SNMP",
  
  steps: [
    {
      name: "os",
      command: "cat /etc/os-release",
      validations: [
        {
          type: "string_contains",
          value: "RHEL",
          description: "Procura se RHEL está presente no output"
        }
      ]
    },
    {
      name: "users", 
      command: "cat /etc/passwd",
      validations: [
        {
          type: "string_contains",
          value: "root",
          description: "Verifica se usuário root existe"
        }
      ]
    },
    {
      name: "snmp",
      command: "systemctl status snmpd",
      validations: [
        {
          type: "string_contains", 
          value: "active",
          description: "Verifica se SNMP está ativo"
        }
      ]
    }
  ]
};
```

### Usar Template em Onboarding

```bash
# Criar o template
curl -X POST http://localhost:3000/templates \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d @meu-template.json

# Usar template em onboarding  
curl -X POST http://localhost:3000/onboarding/start \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "systemId": "ID_DO_SISTEMA",
    "templateId": "ID_DO_TEMPLATE"
  }'
```

---

## 📋 **Estrutura de um Template**

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | String | Nome único do template |
| `description` | String | Descrição do template |
| `steps` | Array | Lista de passos a executar |
| `supportedOS` | Array | Sistemas operativos suportados |
| `status` | String | `active`, `draft`, `deprecated` |

### Estrutura de um Passo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | String | Nome do passo (ex: "os", "users") |
| `command` | String | Comando a executar |
| `validations` | Array | Lista de validações |
| `timeout` | Number | Timeout em milissegundos |
| `required` | Boolean | Se o passo é obrigatório |

### Tipos de Validações

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `string_contains` | Verifica se string está presente | `"RHEL"` |
| `string_not_contains` | Verifica se string NÃO está presente | `"error"` |
| `regex_match` | Validação com regex | `"user_\\d+"` |
| `numeric_range` | Valor numérico em range | min: 0, max: 100 |
| `exists` | Output não está vazio | - |
| `not_exists` | Output está vazio | - |

---

## 🛠️ **API Endpoints**

### Templates

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/templates` | Criar novo template |
| `GET` | `/templates` | Listar templates |
| `GET` | `/templates/:id` | Obter template específico |
| `PUT` | `/templates/:id` | Atualizar template |
| `DELETE` | `/templates/:id` | Deletar template |
| `POST` | `/templates/:id/clone` | Clonar template |
| `POST` | `/templates/:id/test-validations` | Testar validações |

### Onboarding com Templates

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/onboarding/start` | Iniciar onboarding com template |
| `GET` | `/onboarding/system/:systemId` | Status com info do template |
| `POST` | `/onboarding/:id/step/:idx/execute` | Executar passo com validações |

---

## 🧪 **Exemplos Completos**

### 1. Template OS + Users + SNMP (Seu Exemplo)

```json
{
  "name": "System Discovery - OS, Users, SNMP",
  "description": "Verificar informações básicas do sistema",
  "category": "system_discovery",
  "supportedOS": ["ubuntu", "debian", "centos", "rhel"],
  "status": "active",
  
  "steps": [
    {
      "name": "os",
      "description": "Detectar sistema operativo",
      "command": "cat /etc/os-release",
      "order": 1,
      "timeout": 10000,
      "required": true,
      "validations": [
        {
          "type": "string_contains",
          "value": "RHEL",
          "description": "Procura se RHEL está presente no output",
          "required": true
        },
        {
          "type": "string_contains",
          "value": "VERSION_ID=",
          "description": "Deve ter versão definida",
          "required": false
        }
      ]
    },
    {
      "name": "users",
      "description": "Verificar usuários do sistema",
      "command": "cat /etc/passwd",
      "order": 2,
      "timeout": 15000,
      "required": true,
      "validations": [
        {
          "type": "string_contains",
          "value": "root",
          "description": "Usuário root deve existir",
          "required": true
        },
        {
          "type": "regex_match",
          "value": "ssh",
          "flags": "i",
          "description": "Deve haver usuário SSH",
          "required": false
        }
      ]
    },
    {
      "name": "snmp",
      "description": "Verificar status do SNMP",
      "command": "systemctl status snmpd || service snmpd status",
      "order": 3,
      "timeout": 10000,
      "required": false,
      "validations": [
        {
          "type": "string_contains",
          "value": "active",
          "description": "SNMP deve estar ativo",
          "required": false
        },
        {
          "type": "string_not_contains",
          "value": "failed",
          "description": "SNMP não deve ter falhado",
          "required": true
        }
      ]
    }
  ],
  
  "config": {
    "stopOnFirstError": false,
    "globalTimeout": 300,
    "maxRetries": 2
  }
}
```

### 2. Template Específico para RHEL

```json
{
  "name": "RHEL Specific Check",
  "supportedOS": ["rhel", "centos"],
  "steps": [
    {
      "name": "rhel_version",
      "command": "cat /etc/redhat-release", 
      "validations": [
        {
          "type": "string_contains",
          "value": "Red Hat Enterprise Linux",
          "required": true
        }
      ]
    },
    {
      "name": "selinux",
      "command": "getenforce",
      "validations": [
        {
          "type": "string_contains",
          "value": "Enforcing",
          "required": true
        }
      ]
    }
  ]
}
```

---

## 🎮 **Como Testar**

### 1. Executar Demo Completa

```bash
# Instalar dependências se necessário
npm install axios

# Obter token de autenticação
AUTH_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sua_senha"}' | \
  jq -r '.data.token')

# Executar demonstração completa
AUTH_TOKEN=$AUTH_TOKEN node examples/demo-template-system.js
```

### 2. Teste Manual Passo a Passo

```bash
# 1. Criar template
curl -X POST http://localhost:3000/templates \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @examples/template-examples.json

# 2. Listar templates
curl -X GET http://localhost:3000/templates \
  -H "Authorization: Bearer $AUTH_TOKEN"

# 3. Testar validações
curl -X POST http://localhost:3000/templates/TEMPLATE_ID/test-validations \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testOutputs": [
      {
        "stepIndex": 0,
        "output": "ID=rhel\nVERSION_ID=\"8.5\""
      }
    ]
  }'
```

---

## 🔧 **Validações Avançadas**

### Exemplos de Validações Complexas

```javascript
// Validação numérica (memória mínima)
{
  type: "numeric_range",
  value: "",
  minValue: 1024,
  maxValue: null,
  description: "Sistema deve ter pelo menos 1GB RAM"
}

// Validação regex (versão específica)
{
  type: "regex_match", 
  value: "VERSION_ID=\"(7|8)\\.",
  flags: "i",
  description: "Deve ser RHEL 7 ou 8"
}

// Validação de existência
{
  type: "exists",
  value: "",
  description: "Comando deve retornar algum output"
}
```

### Exemplo de Output de Validação

```json
{
  "stepName": "os",
  "totalValidations": 2,
  "passedValidations": 1,
  "failedValidations": 1,
  "overallSuccess": false,
  "validationResults": [
    {
      "type": "string_contains",
      "value": "RHEL",
      "success": false,
      "details": "String 'RHEL' não encontrada no output",
      "required": true
    },
    {
      "type": "string_contains", 
      "value": "VERSION_ID=",
      "success": true,
      "details": "String 'VERSION_ID=' encontrada no output",
      "required": false
    }
  ]
}
```

---

## 📊 **Monitoramento e Analytics**

### Métricas de Template

```javascript
// Estatísticas automáticas
{
  "usage": {
    "timesUsed": 15,
    "lastUsed": "2023-12-11T10:30:00Z",
    "successRate": 87,  // 87% de sucesso
    "averageDuration": 45000  // 45 segundos médio
  }
}
```

### Dashboard de Templates

- 📊 **Taxa de sucesso** por template
- ⏱️ **Tempo médio** de execução  
- 🔄 **Uso frequente** e tendências
- ❌ **Validações que mais falham**

---

## 🚀 **Próximos Passos**

### Funcionalidades Avançadas Disponíveis

1. **Comandos Específicos por OS**
```javascript
{
  "command": "default command",
  "osSpecificCommands": {
    "ubuntu": "apt list --installed",
    "centos": "yum list installed", 
    "windows": "Get-WmiObject Win32_Product"
  }
}
```

2. **Execução Paralela**
```javascript
{
  "config": {
    "allowParallelExecution": true  // Passos independentes em paralelo
  }
}
```

3. **Template Inheritance**
```javascript
{
  "baseTemplate": "template-id",  // Herdar de outro template
  "steps": [/* adicionar/sobrescrever passos */]
}
```

### Interface Visual (Futuro)

- 🎨 **Template Builder** visual drag-and-drop
- 📝 **Editor de validações** com syntax highlighting
- 📊 **Dashboard** de monitoramento em tempo real
- 🔄 **Marketplace** de templates da comunidade

---

## ✅ **Sistema Implementado e Funcional**

### ✨ **Exatamente como solicitado:**

✅ **Templates personalizáveis** - Crie templates com qualquer comando  
✅ **Validações baseadas em strings** - Procure strings específicas no output  
✅ **Exemplo OS/Users/SNMP** - Template completo implementado  
✅ **API simples** - Endpoints intuitivos para gerenciar tudo  
✅ **Integração perfeita** - Funciona com sistema de onboarding existente  
✅ **Validação automática** - Output é validado automaticamente  
✅ **Feedback detalhado** - Saiba exatamente quais validações passaram/falharam  

### 🎯 **Pronto para usar agora!**

O sistema está **100% funcional** e pronto para uso. Você pode:

1. **Criar templates** via API
2. **Definir comandos** e validações personalizadas  
3. **Executar onboarding** usando seus templates
4. **Obter feedback** automático das validações
5. **Monitorar resultados** em tempo real

**🚀 Comece agora executando:**
```bash
AUTH_TOKEN=seu_token node examples/demo-template-system.js
```