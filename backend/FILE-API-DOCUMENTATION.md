# API de Gestão de Ficheiros

Esta documentação descreve a API completa para upload, gestão e download de ficheiros nos diretórios dos sistemas.

## 📋 Visão Geral

A API de ficheiros permite:

- **Upload de ficheiros** (únicos ou múltiplos) para sistemas específicos
- **Listagem e pesquisa** de ficheiros com filtros avançados
- **Download e visualização** de ficheiros
- **Gestão completa** (remoção, metadados, estatísticas)
- **Segurança** com validação de tipos e tamanhos

## 🔐 Autenticação

Todos os endpoints requerem autenticação via Bearer Token:

```http
Authorization: Bearer <seu_token_jwt>
```

## 📁 Estrutura Base

Todos os endpoints seguem o padrão:
```
/api/files/{systemSlug}/...
```

Onde `systemSlug` é o identificador único do sistema.

---

## 🚀 Endpoints Disponíveis

### 1. Upload de Ficheiro Único

**POST** `/api/files/{systemSlug}/upload`

Carrega um ficheiro para o diretório do sistema.

#### Parâmetros
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `systemSlug` | string | ✅ | Slug do sistema |

#### Body (multipart/form-data)
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `file` | file | ✅ | Ficheiro a carregar |
| `fileName` | string | ❌ | Nome personalizado |
| `description` | string | ❌ | Descrição do ficheiro |
| `overwrite` | boolean | ❌ | Sobrescrever se existir |
| `addTimestamp` | boolean | ❌ | Adicionar timestamp ao nome |

#### Exemplo de Uso
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Configuração do servidor');

fetch('/api/files/servidor-web/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

#### Resposta
```json
{
  "success": true,
  "message": "Ficheiro carregado com sucesso",
  "data": {
    "file": {
      "name": "config.json",
      "originalName": "config.json",
      "size": 1024,
      "mimeType": "application/json",
      "systemSlug": "servidor-web",
      "uploadedAt": "2024-01-15T10:30:00.000Z",
      "uploadedBy": "user_id",
      "description": "Configuração do servidor"
    }
  }
}
```

---

### 2. Upload de Múltiplos Ficheiros

**POST** `/api/files/{systemSlug}/upload-multiple`

Carrega múltiplos ficheiros de uma vez.

#### Body (multipart/form-data)
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `files` | file[] | ✅ | Array de ficheiros (máx. 10) |
| `description` | string | ❌ | Descrição dos ficheiros |
| `allowedTypes` | string | ❌ | Tipos MIME permitidos (separados por vírgula) |
| `overwrite` | boolean | ❌ | Sobrescrever se existir |

#### Exemplo
```javascript
const formData = new FormData();
for (let file of fileInput.files) {
  formData.append('files', file);
}

fetch('/api/files/servidor-web/upload-multiple', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

---

### 3. Listar Ficheiros

**GET** `/api/files/{systemSlug}`

Lista ficheiros do sistema com paginação e filtros.

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | integer | 1 | Página atual |
| `limit` | integer | 20 | Ficheiros por página (máx. 100) |
| `sortBy` | string | modifiedAt | Campo de ordenação |
| `sortOrder` | string | desc | Ordem (asc/desc) |
| `fileType` | string | - | Filtrar por tipo |
| `search` | string | - | Pesquisar por nome |

#### Tipos de Ficheiro Suportados
- `image` - Imagens (jpg, png, gif, etc.)
- `document` - Documentos (pdf, doc, txt, etc.)
- `spreadsheet` - Planilhas (xls, csv, etc.)
- `archive` - Arquivos (zip, rar, etc.)
- `text` - Texto (txt, md, json, etc.)

#### Exemplo
```http
GET /api/files/servidor-web?page=1&limit=10&fileType=document&search=config
```

#### Resposta
```json
{
  "success": true,
  "message": "Lista de ficheiros obtida com sucesso",
  "data": {
    "files": [
      {
        "name": "config.json",
        "size": 1024,
        "mimeType": "application/json",
        "extension": ".json",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "modifiedAt": "2024-01-15T10:30:00.000Z",
        "relativePath": "config.json"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalFiles": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "stats": {
      "totalFiles": 5,
      "totalSize": 10240,
      "fileTypes": {
        ".json": 2,
        ".txt": 3
      }
    },
    "filters": {
      "fileType": "document",
      "search": "config",
      "sortBy": "modifiedAt",
      "sortOrder": "desc"
    }
  }
}
```

---

### 4. Obter Informações de Ficheiro

**GET** `/api/files/{systemSlug}/{fileName}`

Obtém detalhes específicos de um ficheiro.

#### Exemplo
```http
GET /api/files/servidor-web/config.json
```

#### Resposta
```json
{
  "success": true,
  "message": "Informações do ficheiro obtidas com sucesso",
  "data": {
    "file": {
      "name": "config.json",
      "size": 1024,
      "mimeType": "application/json",
      "extension": ".json",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "modifiedAt": "2024-01-15T10:30:00.000Z",
      "absolutePath": "/path/to/knowledge_base/servidor-web/config.json",
      "relativePath": "config.json"
    }
  }
}
```

---

### 5. Download de Ficheiro

**GET** `/api/files/{systemSlug}/{fileName}/download`

Faz download de um ficheiro específico.

#### Headers de Resposta
```http
Content-Type: application/octet-stream (ou tipo específico)
Content-Disposition: attachment; filename="config.json"
Content-Length: 1024
```

#### Exemplo
```javascript
// Download direto
window.open(`/api/files/servidor-web/config.json/download?token=${token}`);

// Via fetch
fetch('/api/files/servidor-web/config.json/download', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config.json';
  a.click();
});
```

---

### 6. Visualizar Ficheiro

**GET** `/api/files/{systemSlug}/{fileName}/view`

Visualiza conteúdo de ficheiros de texto ou imagens.

#### Tipos Suportados
- **Texto**: txt, csv, json, html, css, js, xml
- **Imagens**: jpg, png, gif, bmp, svg

#### Resposta para Texto
```json
{
  "success": true,
  "message": "Conteúdo do ficheiro obtido com sucesso",
  "data": {
    "file": {
      "name": "config.json",
      "size": 1024,
      "mimeType": "application/json"
    },
    "content": "{\n  \"app\": \"servidor\",\n  \"port\": 3000\n}"
  }
}
```

#### Resposta para Imagem
Retorna a imagem diretamente com o Content-Type apropriado.

---

### 7. Remover Ficheiro

**DELETE** `/api/files/{systemSlug}/{fileName}`

Remove um ficheiro específico.

#### Resposta
```json
{
  "success": true,
  "message": "Ficheiro removido com sucesso",
  "data": {
    "file": {
      "name": "config.json",
      "size": 1024,
      "systemSlug": "servidor-web",
      "deletedAt": "2024-01-15T11:00:00.000Z",
      "deletedBy": {
        "id": "user_id",
        "username": "admin"
      }
    }
  }
}
```

---

### 8. Estatísticas do Diretório

**GET** `/api/files/{systemSlug}/stats`

Obtém estatísticas dos ficheiros do sistema.

#### Resposta
```json
{
  "success": true,
  "message": "Estatísticas obtidas com sucesso",
  "data": {
    "systemSlug": "servidor-web",
    "stats": {
      "totalFiles": 15,
      "totalSize": 102400,
      "fileTypes": {
        ".json": 5,
        ".txt": 8,
        ".log": 2
      },
      "oldestFile": {
        "name": "install.log",
        "createdAt": "2024-01-10T08:00:00.000Z"
      },
      "newestFile": {
        "name": "config.json",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    }
  }
}
```

---

### 9. Remoção em Lote

**POST** `/api/files/{systemSlug}/batch-delete`

Remove múltiplos ficheiros de uma vez.

#### Body
```json
{
  "files": ["config.json", "old-data.txt", "temp.log"]
}
```

#### Resposta
```json
{
  "success": true,
  "message": "Operação concluída: 2 sucessos, 1 falhas",
  "data": {
    "results": [
      {
        "fileName": "config.json",
        "success": true
      },
      {
        "fileName": "old-data.txt",
        "success": true
      },
      {
        "fileName": "temp.log",
        "success": false,
        "error": "Ficheiro não encontrado"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 2,
      "failed": 1
    }
  }
}
```

---

## 🔒 Validações e Restrições

### Validação de Ficheiros

#### Tamanho
- **Máximo por ficheiro**: 50MB
- **Máximo por upload múltiplo**: 10 ficheiros

#### Nomes de Ficheiro
- **Caracteres permitidos**: letras, números, pontos, hífens, underscores
- **Proibidos**: `../`, `/`, `\`, ficheiros começados com `.`
- **Tamanho máximo**: 255 caracteres

#### Tipos MIME (Opcionais)
```javascript
const allowedTypes = [
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/zip',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
```

### Segurança

- **Path Traversal**: Validação contra `../`, `/`, `\`
- **Autenticação**: Bearer Token obrigatório
- **Autorização**: Verificação de sistema ativo
- **Sanitização**: Nomes de ficheiro são sanitizados

---

## 📝 Códigos de Erro

| Código | Descrição |
|---------|-----------|
| 400 | Dados inválidos ou ficheiro muito grande |
| 401 | Token de autenticação inválido |
| 404 | Sistema ou ficheiro não encontrado |
| 413 | Ficheiro muito grande |
| 415 | Tipo de ficheiro não suportado |
| 500 | Erro interno do servidor |

### Exemplos de Erro

```json
{
  "success": false,
  "message": "Ficheiro muito grande",
  "error": "Tamanho máximo permitido: 50MB"
}
```

```json
{
  "success": false,
  "message": "Dados inválidos",
  "errors": [
    {
      "field": "fileName",
      "message": "Nome do ficheiro contém caracteres não permitidos",
      "value": "../config.txt"
    }
  ]
}
```

---

## 🧪 Testes

### Script de Teste Automático

Execute o script de teste incluído:

```bash
npm run test-file-api
```

Este script testa todos os endpoints automaticamente.

### Teste Manual com cURL

#### Upload de ficheiro
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@config.json" \
  -F "description=Configuração do servidor" \
  http://localhost:3000/api/files/servidor-web/upload
```

#### Listar ficheiros
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/files/servidor-web?page=1&limit=5"
```

#### Download de ficheiro
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded_config.json \
  http://localhost:3000/api/files/servidor-web/config.json/download
```

---

## 💡 Exemplos de Uso

### Frontend React/JavaScript

```javascript
// Hook para upload de ficheiros
const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  
  const uploadFile = async (systemSlug, file, options = {}) => {
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.description) {
      formData.append('description', options.description);
    }
    
    try {
      const response = await fetch(`/api/files/${systemSlug}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });
      
      const result = await response.json();
      return result;
    } finally {
      setUploading(false);
    }
  };
  
  return { uploadFile, uploading };
};

// Componente de listagem
const FileList = ({ systemSlug }) => {
  const [files, setFiles] = useState([]);
  
  useEffect(() => {
    const fetchFiles = async () => {
      const response = await fetch(`/api/files/${systemSlug}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setFiles(data.data.files);
    };
    
    fetchFiles();
  }, [systemSlug]);
  
  return (
    <div>
      {files.map(file => (
        <div key={file.name}>
          <span>{file.name}</span>
          <span>{file.size} bytes</span>
          <button onClick={() => downloadFile(systemSlug, file.name)}>
            Download
          </button>
        </div>
      ))}
    </div>
  );
};
```

### Node.js/Backend

```javascript
const FormData = require('form-data');
const fs = require('fs');

// Upload de ficheiro
const uploadFileToSystem = async (systemSlug, filePath, description) => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('description', description);
  
  const response = await axios.post(
    `${API_BASE}/files/${systemSlug}/upload`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.data;
};

// Sincronização de diretório
const syncDirectoryToSystem = async (localDir, systemSlug) => {
  const files = fs.readdirSync(localDir);
  
  for (const file of files) {
    const filePath = path.join(localDir, file);
    
    if (fs.statSync(filePath).isFile()) {
      await uploadFileToSystem(systemSlug, filePath, `Sync from ${localDir}`);
    }
  }
};
```

---

## 📊 Monitorização e Logs

### Logs de Actividade

Todas as operações são registadas nos logs do servidor:

```
📁 Ficheiro carregado: servidor-web/config.json
📥 Download: servidor-web/backup.zip por admin
🗑️ Ficheiro removido: servidor-web/temp.log por user123
```

### Métricas Disponíveis

- Total de uploads por sistema
- Tamanho total de ficheiros por sistema
- Tipos de ficheiro mais comuns
- Actividade de download
- Erros de upload

---

## 🔄 Integração com Sistemas Existentes

A API de ficheiros integra-se automaticamente com:

- **Sistema de Slugs**: Cada sistema tem seu diretório único
- **Autenticação**: Usa o sistema JWT existente
- **Knowledge Base**: Armazena ficheiros na estrutura existente
- **Logs**: Integra com o sistema de logs do servidor

---

Esta API fornece uma solução completa para gestão de ficheiros, mantendo segurança, performance e facilidade de uso.