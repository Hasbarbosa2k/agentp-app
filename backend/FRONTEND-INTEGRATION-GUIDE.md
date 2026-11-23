# Guia de Integração Frontend - Slugs e API de Ficheiros

Este guia explica como o frontend pode integrar com as APIs de sistemas e ficheiros usando slugs.

## 📋 Problema Resolvido

O frontend precisa do **slug** do sistema para usar a API de ficheiros, mas tradicionalmente só tinha acesso ao **ID** ou **nome** do sistema.

## ✅ Solução Implementada

### 1. **Campo Slug Sempre Incluído**

Todas as APIs de sistemas agora incluem automaticamente o campo `slug`:

```json
{
  "success": true,
  "data": {
    "system": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Servidor Web Principal", 
      "slug": "servidor-web-principal",  // ← Sempre incluído!
      "ip": "192.168.1.100",
      "status": "online",
      // ... outros campos
    }
  }
}
```

### 2. **Endpoints Helper Adicionados**

Três novos endpoints para facilitar a integração:

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/systems/{id}/basic` | Informações essenciais com slug |
| `GET /api/systems/{id}/slug` | Converte ID em slug |
| `GET /api/systems/by-slug/{slug}` | Busca sistema por slug |

---

## 🚀 Como Usar no Frontend

### **Cenário 1: Listar Sistemas**

Quando você faz a listagem de sistemas, o slug já vem incluído:

```javascript
// Fazer request para listagem
const response = await fetch('/api/systems', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();

// Agora você tem acesso ao slug
data.data.systems.forEach(system => {
  console.log(`Sistema: ${system.name}`);
  console.log(`Slug: ${system.slug}`);
  console.log(`API de ficheiros: /api/files/${system.slug}`);
});
```

### **Cenário 2: Sistema Específico**

```javascript
// Buscar sistema por ID (slug incluído automaticamente)
const systemResponse = await fetch(`/api/systems/${systemId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const systemData = await systemResponse.json();
const system = systemData.data.system;

// Usar slug para API de ficheiros
const filesResponse = await fetch(`/api/files/${system.slug}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### **Cenário 3: Só Precisa do Slug (Otimizado)**

```javascript
// Endpoint otimizado - retorna apenas o essencial
const slugResponse = await fetch(`/api/systems/${systemId}/slug`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const slugData = await slugResponse.json();
console.log(slugData.data);
// {
//   "systemId": "507f1f77bcf86cd799439011",
//   "slug": "servidor-web-principal",
//   "name": "Servidor Web Principal",
//   "fileApiBasePath": "/api/files/servidor-web-principal"
// }

// Usar diretamente o fileApiBasePath
const files = await fetch(slugData.data.fileApiBasePath);
```

---

## 💡 Padrões Recomendados

### **1. Armazenamento no Estado**

Mantenha o slug junto com outras informações do sistema:

```javascript
// React/Vue/Angular
const [systems, setSystems] = useState([]);

useEffect(() => {
  fetchSystems().then(data => {
    setSystems(data.data.systems); // Já inclui slug
  });
}, []);

// Usar diretamente quando necessário
const uploadFile = (systemIndex, file) => {
  const system = systems[systemIndex];
  uploadFileToSystem(system.slug, file);
};
```

### **2. Hook/Composable Customizado**

```javascript
// React Hook
const useSystemFiles = (systemId) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState(null);

  useEffect(() => {
    if (systemId) {
      // Obter slug do sistema
      fetch(`/api/systems/${systemId}/slug`)
        .then(res => res.json())
        .then(data => {
          setSlug(data.data.slug);
          // Agora buscar ficheiros
          return fetch(`/api/files/${data.data.slug}`);
        })
        .then(res => res.json())
        .then(data => setFiles(data.data.files))
        .catch(console.error);
    }
  }, [systemId]);

  const uploadFile = (file) => {
    if (!slug) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    return fetch(`/api/files/${slug}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });
  };

  return { files, loading, uploadFile, slug };
};

// Uso no componente
const SystemFilesPage = ({ systemId }) => {
  const { files, uploadFile, slug } = useSystemFiles(systemId);
  
  return (
    <div>
      <h1>Ficheiros do Sistema (Slug: {slug})</h1>
      {/* ... interface de ficheiros */}
    </div>
  );
};
```

### **3. Classe/Service para Gestão de Ficheiros**

```javascript
class SystemFileManager {
  constructor(authToken) {
    this.authToken = authToken;
    this.baseUrl = '/api';
  }

  async getSystemSlug(systemId) {
    const response = await fetch(`${this.baseUrl}/systems/${systemId}/slug`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
    const data = await response.json();
    return data.data.slug;
  }

  async listFiles(systemSlug, options = {}) {
    const params = new URLSearchParams(options);
    const response = await fetch(`${this.baseUrl}/files/${systemSlug}?${params}`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
    return response.json();
  }

  async uploadFile(systemSlug, file, description = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);

    const response = await fetch(`${this.baseUrl}/files/${systemSlug}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.authToken}` },
      body: formData
    });
    return response.json();
  }

  async downloadFile(systemSlug, fileName) {
    const response = await fetch(`${this.baseUrl}/files/${systemSlug}/${fileName}/download`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  // Método utilitário para trabalhar com IDs
  async uploadFileBySystemId(systemId, file, description = '') {
    const slug = await this.getSystemSlug(systemId);
    return this.uploadFile(slug, file, description);
  }
}

// Uso
const fileManager = new SystemFileManager(userToken);

// Upload usando ID do sistema
await fileManager.uploadFileBySystemId('507f1f77bcf86cd799439011', selectedFile);

// Upload usando slug diretamente
await fileManager.uploadFile('servidor-web-principal', selectedFile);
```

---

## 📱 Exemplos Práticos

### **Interface de Upload de Ficheiros**

```javascript
const FileUploadComponent = ({ system }) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);

  // Sistema já vem com slug incluído
  const { slug, name } = system;

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !slug) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Upload para ${name}`);

      const response = await fetch(`/api/files/${slug}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });

      if (response.ok) {
        // Recarregar lista de ficheiros
        loadFiles();
      }
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/files/${slug}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setFiles(data.data.files);
    } catch (error) {
      console.error('Erro ao carregar ficheiros:', error);
    }
  };

  return (
    <div>
      <h2>Ficheiros do Sistema: {name}</h2>
      <p>Slug: <code>{slug}</code></p>
      
      <input 
        type="file" 
        onChange={handleFileUpload}
        disabled={uploading}
      />
      
      <div>
        {files.map(file => (
          <div key={file.name}>
            <span>{file.name}</span>
            <button onClick={() => downloadFile(slug, file.name)}>
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### **Navegação Baseada em Slug**

```javascript
// Router/Navegação
const routes = [
  {
    path: '/systems/:systemId/files',
    component: SystemFilesPage
  },
  {
    path: '/files/:slug',  // ← Nova rota usando slug
    component: DirectFileAccessPage
  }
];

// Componente que converte ID em slug para redirecionamento
const SystemFilesPage = ({ systemId }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Obter slug e redirecionar para rota mais limpa
    fetch(`/api/systems/${systemId}/slug`)
      .then(res => res.json())
      .then(data => {
        navigate(`/files/${data.data.slug}`, { replace: true });
      });
  }, [systemId]);

  return <div>Redirecionando...</div>;
};

// Página final usando slug
const DirectFileAccessPage = ({ slug }) => {
  // Trabalhar diretamente com slug
  const { files, uploadFile } = useFiles(slug);
  
  return (
    <div>
      <h1>Ficheiros</h1>
      {/* Interface de ficheiros */}
    </div>
  );
};
```

---

## 🔄 Migração de Código Existente

### **Antes (Só tinha ID/Nome)**

```javascript
// ❌ Problemático - como obter slug?
const uploadFile = async (systemId, file) => {
  // Sem forma de obter o slug...
  const slug = ???;
  
  await fetch(`/api/files/${slug}/upload`, {
    method: 'POST',
    body: formData
  });
};
```

### **Depois (Com Slug Incluído)**

```javascript
// ✅ Simples - slug já está disponível
const uploadFile = async (system, file) => {
  // Sistema já vem com slug
  const { slug } = system;
  
  await fetch(`/api/files/${slug}/upload`, {
    method: 'POST',
    body: formData
  });
};

// OU usando endpoint helper
const uploadFileById = async (systemId, file) => {
  // Obter slug primeiro
  const slugResponse = await fetch(`/api/systems/${systemId}/slug`);
  const { slug } = (await slugResponse.json()).data;
  
  // Depois fazer upload
  await fetch(`/api/files/${slug}/upload`, {
    method: 'POST',
    body: formData
  });
};
```

---

## 🛠️ Ferramentas de Debug

### **Verificar Slug no Console**

```javascript
// Verificar se sistema tem slug
const debugSystem = (system) => {
  console.group(`Sistema: ${system.name}`);
  console.log('ID:', system._id);
  console.log('Slug:', system.slug);
  console.log('API de ficheiros:', `/api/files/${system.slug}`);
  console.log('Tudo OK:', !!system.slug);
  console.groupEnd();
};

// Usar quando buscar sistemas
fetch('/api/systems')
  .then(res => res.json())
  .then(data => {
    data.data.systems.forEach(debugSystem);
  });
```

### **Validator de Slug**

```javascript
const validateSlug = (slug) => {
  const slugRegex = /^[a-z0-9]+([a-z0-9-]*[a-z0-9]+)*$/;
  
  if (!slug) {
    console.error('❌ Slug está vazio');
    return false;
  }
  
  if (!slugRegex.test(slug)) {
    console.error('❌ Slug tem formato inválido:', slug);
    return false;
  }
  
  console.log('✅ Slug válido:', slug);
  return true;
};

// Usar antes de fazer chamadas à API de ficheiros
if (validateSlug(system.slug)) {
  // Proceder com API de ficheiros
}
```

---

## 📚 Resumo para Desenvolvedores

### **✅ O que Mudou**

1. **Campo `slug` incluído automaticamente** em todas as respostas de sistemas
2. **Três novos endpoints helper** para facilitar a integração
3. **APIs de ficheiros funcionam com slugs** em vez de IDs

### **✅ O que Fazer**

1. **Atualizar código frontend** para usar `system.slug` em vez de `system._id` para ficheiros
2. **Aproveitar novos endpoints** se só precisar do slug
3. **Atualizar interfaces** para mostrar slug quando útil
4. **Testar integração** com os exemplos fornecidos

### **✅ Benefícios**

- URLs mais legíveis (`/files/servidor-web` vs `/files/507f1f77bcf86cd799439011`)
- Integração mais simples entre sistemas e ficheiros
- Melhor experiência de desenvolvimento
- APIs mais consistentes

---

A integração está pronta e funcional! O frontend agora tem acesso completo aos slugs e pode usar a API de ficheiros sem problemas. 🎉