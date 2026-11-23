# Documentação dos Endpoints de Templates

Esta documentação descreve todos os endpoints disponíveis para gerenciamento de templates de onboarding.

## Base URL
```
http://localhost:3000/api/templates
```

## Autenticação
Todos os endpoints requerem autenticação via Bearer Token no header:
```
Authorization: Bearer <token>
```

## Endpoints Disponíveis

### 1. Criar Template
**POST** `/templates`

Cria um novo template de onboarding.

#### Request Body
```json
{
  "name": "Nome do Template",
  "description": "Descrição do template",
  "category": "custom",
  "status": "draft",
  "version": "1.0.0",
  "supportedOS": ["Ubuntu", "CentOS"],
  "tags": ["sistema", "auditoria"],
  "steps": [
    {
      "name": "Verificar Sistema",
      "description": "Verificar informações básicas",
      "command": "uname -a",
      "validations": [
        {
          "type": "string_contains",
          "value": "Linux",
          "description": "Sistema deve ser Linux"
        }
      ],
      "timeout": 30000,
      "retryable": true,
      "required": true,
      "order": 1,
      "category": "system"
    }
  ],
  "config": {
    "stopOnFirstError": true,
    "allowParallelExecution": false,
    "globalTimeout": 300,
    "maxRetries": 3
  }
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Template criado com sucesso",
  "data": {
    "template": {
      "_id": "template_id",
      "name": "Nome do Template",
      "description": "Descrição do template",
      "version": "1.0.0",
      "category": "custom",
      "status": "draft",
      "steps": [...],
      "createdBy": "user_id",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 2. Listar Templates
**GET** `/templates`

Lista todos os templates com filtros opcionais.

#### Query Parameters
- `category`: Filtrar por categoria
- `status`: Filtrar por status
- `tag`: Filtrar por tag
- `search`: Buscar por nome ou descrição
- `page`: Página (padrão: 1)
- `limit`: Itens por página (padrão: 20)

#### Response (200)
```json
{
  "success": true,
  "message": "Templates listados com sucesso",
  "data": {
    "templates": [...],
    "pagination": {
      "current": 1,
      "total": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    },
    "stats": {
      "totalTemplates": 100,
      "activeTemplates": 80,
      "averageSteps": 5.2,
      "totalUsage": 1500,
      "averageSuccessRate": 95.5
    }
  }
}
```

### 3. Obter Template Específico
**GET** `/templates/{templateId}`

Obtém um template específico por ID.

#### Response (200)
```json
{
  "success": true,
  "message": "Template obtido com sucesso",
  "data": {
    "template": {
      "_id": "template_id",
      "name": "Nome do Template",
      "description": "Descrição do template",
      "version": "1.0.0",
      "category": "custom",
      "status": "active",
      "steps": [...],
      "createdBy": {
        "_id": "user_id",
        "username": "admin",
        "email": "admin@example.com"
      },
      "lastModifiedBy": {
        "_id": "user_id",
        "username": "admin",
        "email": "admin@example.com"
      }
    }
  }
}
```

### 4. Atualizar Template
**PUT** `/templates/{templateId}`

Atualiza um template existente.

#### Request Body
```json
{
  "name": "Nome Atualizado",
  "description": "Descrição atualizada",
  "version": "1.1.0",
  "status": "active",
  "changeDescription": "Atualização de funcionalidades",
  "steps": [
    {
      "name": "Verificar Sistema (Atualizado)",
      "command": "uname -a && cat /etc/os-release",
      "validations": [...]
    }
  ]
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Template atualizado com sucesso",
  "data": {
    "template": {
      "_id": "template_id",
      "name": "Nome Atualizado",
      "version": "1.1.0",
      "lastModifiedBy": "user_id",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Códigos de Erro
- `403`: Sem permissão para editar
- `404`: Template não encontrado
- `409`: Nome já existe

### 5. Arquivar Template (Soft Delete)
**DELETE** `/templates/{templateId}`

Arquiva um template (soft delete).

#### Request Body (opcional)
```json
{
  "reason": "Motivo do arquivamento"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Template arquivado com sucesso",
  "data": {
    "archivedTemplate": {
      "id": "template_id",
      "name": "Nome do Template",
      "archivedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Códigos de Erro
- `403`: Sem permissão para deletar
- `404`: Template não encontrado
- `409`: Template está em uso

### 6. Deletar Template Permanentemente
**DELETE** `/templates/{templateId}`

Deleta um template permanentemente (hard delete).

#### Request Body
```json
{
  "force": true,
  "reason": "Motivo da exclusão permanente"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Template deletado permanentemente com sucesso",
  "data": {
    "deletedTemplate": {
      "id": "template_id",
      "name": "Nome do Template"
    }
  }
}
```

### 7. Restaurar Template Arquivado
**POST** `/templates/{templateId}/restore`

Restaura um template que foi arquivado.

#### Request Body (opcional)
```json
{
  "newStatus": "draft"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Template restaurado com sucesso",
  "data": {
    "restoredTemplate": {
      "id": "template_id",
      "name": "Nome do Template",
      "status": "draft",
      "restoredAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Códigos de Erro
- `400`: Template não está arquivado
- `403`: Sem permissão para restaurar
- `404`: Template não encontrado

### 8. Clonar Template
**POST** `/templates/{templateId}/clone`

Cria uma cópia de um template existente.

#### Request Body
```json
{
  "name": "Nome do Template Clonado",
  "description": "Descrição personalizada",
  "version": "1.0.0"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Template clonado com sucesso",
  "data": {
    "template": {
      "_id": "new_template_id",
      "name": "Nome do Template Clonado",
      "baseTemplate": "original_template_id"
    },
    "originalTemplate": {
      "id": "original_template_id",
      "name": "Template Original"
    }
  }
}
```

### 9. Testar Validações
**POST** `/templates/{templateId}/test-validations`

Testa as validações de um template com outputs de exemplo.

#### Request Body
```json
{
  "testOutputs": [
    {
      "stepIndex": 0,
      "output": "Linux ubuntu-server 5.4.0-42-generic #46-Ubuntu SMP Fri Jul 10 00:24:02 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux"
    },
    {
      "stepIndex": 1,
      "output": "Mem: 7.7Gi 2.1Gi 4.2Gi 0.0Ki 1.4Gi 5.3Gi"
    }
  ]
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Validações testadas com sucesso",
  "data": {
    "templateName": "Nome do Template",
    "testResults": [
      {
        "stepIndex": 0,
        "stepName": "Verificar Sistema",
        "overallSuccess": true,
        "validations": [
          {
            "type": "string_contains",
            "value": "Linux",
            "success": true,
            "description": "Sistema deve ser Linux"
          }
        ]
      }
    ],
    "summary": {
      "totalTests": 2,
      "successfulTests": 2,
      "failedTests": 0
    }
  }
}
```

## Categorias de Templates

### Categorias Principais
- `system_discovery`: Descoberta de sistema
- `security_audit`: Auditoria de segurança
- `performance_check`: Verificação de performance
- `service_discovery`: Descoberta de serviços
- `custom`: Personalizado

### Status dos Templates
- `draft`: Rascunho
- `active`: Ativo
- `deprecated`: Depreciado
- `archived`: Arquivado

## Tipos de Validação

### Validações Disponíveis
- `string_contains`: Verifica se o output contém uma string
- `string_not_contains`: Verifica se o output não contém uma string
- `regex_match`: Verifica se o output corresponde a uma regex
- `numeric_range`: Verifica se um valor está em um intervalo
- `exists`: Verifica se algo existe
- `not_exists`: Verifica se algo não existe
- `output_contains`: **NOVO** - Validação simples que verifica se um texto específico aparece no output (determina SUCCESS/FAILED do step)

### Exemplo de Validação `output_contains`
```json
{
  "type": "output_contains",
  "value": "Ubuntu",
  "description": "Verifica se o sistema é Ubuntu",
  "required": true
}
```

**Comportamento:**
- Se o texto "Ubuntu" aparecer no output → Step = **SUCCESS**
- Se o texto "Ubuntu" NÃO aparecer no output → Step = **FAILED**

## Permissões

### Regras de Acesso
- **Criar**: Qualquer usuário autenticado
- **Listar**: Qualquer usuário autenticado
- **Visualizar**: Qualquer usuário autenticado
- **Editar**: Apenas criador ou admin
- **Arquivar**: Apenas criador ou admin
- **Deletar**: Apenas criador ou admin (com force=true)
- **Restaurar**: Apenas criador ou admin
- **Clonar**: Qualquer usuário autenticado

### Proteções Especiais
- Templates do sistema não podem ser deletados
- Templates em uso ativo não podem ser deletados (sem force=true)
- Templates arquivados não podem ser editados

## Exemplos de Uso

### Exemplo 1: Criar e Atualizar Template
```bash
# 1. Criar template
curl -X POST http://localhost:3000/api/templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auditoria Básica",
    "description": "Auditoria básica de sistema Linux",
    "category": "security_audit",
    "steps": [...]
  }'

# 2. Atualizar template
curl -X PUT http://localhost:3000/api/templates/<template_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.1.0",
    "changeDescription": "Adicionado novo passo de verificação"
  }'
```

### Exemplo 2: Arquivar e Restaurar Template
```bash
# 1. Arquivar template
curl -X DELETE http://localhost:3000/api/templates/<template_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Template obsoleto"}'

# 2. Restaurar template
curl -X POST http://localhost:3000/api/templates/<template_id>/restore \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"newStatus": "active"}'
```

### Exemplo 3: Deletar Permanentemente
```bash
curl -X DELETE http://localhost:3000/api/templates/<template_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "force": true,
    "reason": "Template duplicado"
  }'
```

## Testes

Para testar todos os endpoints, execute o script de teste:

```bash
node scripts/test-template-endpoints.js
```

Este script irá:
1. Fazer login
2. Criar um template de teste
3. Atualizar o template
4. Testar validações
5. Arquivar o template
6. Restaurar o template
7. Deletar permanentemente
8. Verificar todos os resultados

## Logs e Auditoria

Todos os endpoints registram logs detalhados incluindo:
- Usuário que executou a ação
- Timestamp da ação
- Detalhes da operação
- Motivos para exclusões/arquivamentos

Os logs podem ser encontrados no console do servidor e nos arquivos de log do sistema. 