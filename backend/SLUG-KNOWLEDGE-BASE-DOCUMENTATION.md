# Documentação: Slugs e Knowledge Base

Esta documentação descreve a funcionalidade de criação automática de slugs únicos e diretórios na `knowledge_base` para cada sistema criado.

## 📋 Visão Geral

Sempre que um sistema é criado na plataforma, o sistema automaticamente:

1. **Gera um slug único** baseado no nome do sistema
2. **Cria um diretório** com o slug na pasta `knowledge_base`
3. **Mantém consistência** entre o sistema e seu diretório

## 🏷️ Sistema de Slugs

### O que é um Slug?

Um slug é um identificador único, amigável para URLs e sistemas de arquivos, gerado a partir do nome do sistema.

### Regras de Geração

- **Apenas caracteres permitidos**: letras minúsculas, números e hífens
- **Sem caracteres especiais**: acentos, símbolos e espaços são removidos/convertidos
- **Não pode começar ou terminar com hífen**
- **Tamanho máximo**: 50 caracteres
- **Unicidade garantida**: se um slug já existe, adiciona-se um sufixo numérico

### Exemplos de Conversão

| Nome do Sistema | Slug Gerado |
|---|---|
| "Servidor Web Principal" | `servidor-web-principal` |
| "Base de Dados MySQL" | `base-de-dados-mysql` |
| "API Gateway - Production!!!" | `api-gateway-production` |
| "Sistema com (parênteses)" | `sistema-com-parenteses` |
| "Múltiplos     espaços" | `multiplos-espacos` |

### Resolução de Conflitos

Se um slug já existe, o sistema adiciona um sufixo numérico:

```
servidor-web      (primeiro)
servidor-web-1    (segundo)
servidor-web-2    (terceiro)
```

## 📁 Sistema de Diretórios

### Estrutura da Knowledge Base

```
knowledge_base/
├── README.md                          # Documentação da pasta
├── servidor-web-principal/            # Diretório do sistema
│   └── .info.json                     # Metadata do sistema
├── base-de-dados-mysql/
│   └── .info.json
└── api-gateway/
    └── .info.json
```

### Arquivo .info.json

Cada diretório contém um arquivo `.info.json` com metadata:

```json
{
  "systemName": "Servidor Web Principal",
  "slug": "servidor-web-principal",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "description": "Diretório para ficheiros do sistema: Servidor Web Principal"
}
```

## 🔧 Funcionalidades Implementadas

### 1. Criação de Sistema

Quando um sistema é criado:

```javascript
// O sistema gera automaticamente um slug único
const slug = await generateUniqueSlug(name);

// Cria o sistema com o slug
const system = new System({
  name,
  slug,
  // ... outros campos
});

// Cria o diretório correspondente
await createSystemDirectory(slug, name);
```

### 2. Atualização de Sistema

Quando o nome de um sistema é alterado:

- **Novo slug é gerado** se o nome mudou
- **Diretório é renomeado** automaticamente
- **Consistência é mantida** entre sistema e diretório

### 3. Remoção de Sistema

Quando um sistema é removido (soft delete):

- **Sistema é marcado como inativo**
- **Diretório é removido** da knowledge_base
- **Limpeza automática** dos arquivos associados

## 🛠️ Utilitários Disponíveis

### slugGenerator.js

Funções para gestão de slugs:

```javascript
const { generateSlug, generateUniqueSlug, isValidSlug } = require('./utils/slugGenerator');

// Gerar slug simples
const slug = generateSlug('Nome do Sistema');

// Gerar slug único (verifica BD)
const uniqueSlug = await generateUniqueSlug('Nome do Sistema');

// Validar formato de slug
const isValid = isValidSlug('meu-slug');
```

### knowledgeBaseManager.js

Funções para gestão de diretórios:

```javascript
const { 
  createSystemDirectory,
  removeSystemDirectory,
  renameSystemDirectory,
  listSystemDirectories 
} = require('./utils/knowledgeBaseManager');

// Criar diretório para sistema
await createSystemDirectory('meu-slug', 'Nome do Sistema');

// Listar todos os diretórios
const directories = await listSystemDirectories();

// Remover diretório
await removeSystemDirectory('meu-slug');
```

## 📋 Scripts de Gestão

### Testar Funcionalidade

```bash
npm run test-slugs
```

Este script testa:
- Geração de slugs válidos
- Criação de diretórios
- Validação de formatos
- Listagem de diretórios

### Migração de Sistemas Existentes

```bash
npm run migrate-slugs
```

Este script:
- Encontra sistemas sem slug
- Gera slugs únicos para cada um
- Cria diretórios correspondentes
- Relatório de progresso

## 🔍 Validações e Restrições

### Validações de Slug

1. **Formato obrigatório**: `^[a-z0-9]+([a-z0-9-]*[a-z0-9]+)*$`
2. **Tamanho**: entre 1 e 50 caracteres
3. **Unicidade**: verificada na base de dados
4. **Não pode começar/terminar com hífen**

### Tratamento de Erros

- **Criação de diretório falha**: Sistema é criado, erro é logado
- **Slug duplicado**: Geração automática de sufixo numérico
- **Nome inválido**: Slug padrão "sistema" é usado
- **Caracteres especiais**: Removidos ou convertidos automaticamente

## 🚀 Integração com APIs

### Campo Slug nas Respostas

Todas as APIs de sistemas agora incluem o campo `slug`:

```json
{
  "success": true,
  "data": {
    "system": {
      "_id": "...",
      "name": "Servidor Web Principal",
      "slug": "servidor-web-principal",
      "ip": "192.168.1.100",
      // ... outros campos
    }
  }
}
```

### Endpoint de Sistemas

- **GET /systems**: Lista inclui slugs
- **POST /systems**: Slug gerado automaticamente
- **PUT /systems/:id**: Slug atualizado se nome mudar
- **DELETE /systems/:id**: Diretório removido automaticamente

## 📝 Casos de Uso

### 1. Armazenamento de Ficheiros

```bash
# Cada sistema tem seu próprio diretório
knowledge_base/
├── servidor-web-prod/
│   ├── logs/
│   ├── configs/
│   └── documentacao.md
└── database-mysql/
    ├── schemas/
    └── backups/
```

### 2. Organização por Projeto

```bash
# Sistemas podem ser agrupados logicamente
knowledge_base/
├── projeto-alpha-web/
├── projeto-alpha-api/
├── projeto-alpha-db/
├── projeto-beta-frontend/
└── projeto-beta-backend/
```

### 3. Scripts de Automação

```bash
# Scripts podem usar o slug para localizar arquivos
SYSTEM_SLUG="servidor-web-prod"
CONFIG_PATH="knowledge_base/${SYSTEM_SLUG}/config.json"
```

## ⚠️ Considerações Importantes

### 1. Migração

- **Sistemas existentes**: Executar script de migração
- **Backup recomendado**: Antes de executar migrações
- **Verificação**: Testar em ambiente de desenvolvimento primeiro

### 2. Manutenção

- **Limpeza periódica**: Diretórios órfãos podem existir
- **Monitorização**: Verificar integridade da knowledge_base
- **Backup**: Incluir knowledge_base nos backups regulares

### 3. Performance

- **Verificação de unicidade**: Query adicional na criação
- **Operações de sistema de arquivos**: Podem ser lentas
- **Logs**: Monitorizar erros de criação de diretórios

## 🔄 Versionamento e Compatibilidade

### Versão Atual: 1.0.0

- ✅ Geração automática de slugs
- ✅ Criação automática de diretórios
- ✅ Gestão de ciclo de vida completo
- ✅ Scripts de migração e teste
- ✅ Validações robustas

### Próximas Versões

- 🔄 Interface web para gestão de ficheiros
- 🔄 Versionamento de arquivos
- 🔄 Compressão automática
- 🔄 Sincronização com storage remoto

---

## 📞 Suporte

Para questões ou problemas:

1. **Verificar logs**: Console e arquivo de logs
2. **Executar testes**: `npm run test-slugs`
3. **Verificar integridade**: Script de verificação
4. **Documentação adicional**: Arquivos README específicos