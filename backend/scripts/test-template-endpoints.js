const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Configuração do axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Função para fazer login
async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await api.post('/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    authToken = response.data.data.token;
    console.log('✅ Login realizado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return false;
  }
}

// Função para criar um template de teste
async function createTestTemplate() {
  try {
    console.log('📝 Criando template de teste...');
    const templateData = {
      name: 'Template Teste CRUD',
      description: 'Template para testar operações CRUD',
      category: 'custom',
      status: 'draft',
      steps: [
        {
          name: 'Verificar Sistema',
          description: 'Verificar informações básicas do sistema',
          command: 'uname -a',
          validations: [
            {
              type: 'string_contains',
              value: 'Linux',
              description: 'Sistema deve ser Linux'
            }
          ],
          timeout: 30000,
          retryable: true,
          required: true,
          order: 1,
          category: 'system'
        },
        {
          name: 'Verificar Memória',
          description: 'Verificar uso de memória',
          command: 'free -h',
          validations: [
            {
              type: 'string_contains',
              value: 'Mem:',
              description: 'Deve mostrar informações de memória'
            }
          ],
          timeout: 30000,
          retryable: true,
          required: true,
          order: 2,
          category: 'system'
        }
      ],
      config: {
        stopOnFirstError: true,
        allowParallelExecution: false,
        globalTimeout: 300,
        maxRetries: 3
      }
    };

    const response = await api.post('/templates', templateData);
    console.log('✅ Template criado:', response.data.data.template.name);
    return response.data.data.template._id;
  } catch (error) {
    console.error('❌ Erro ao criar template:', error.response?.data || error.message);
    return null;
  }
}

// Função para listar templates
async function listTemplates() {
  try {
    console.log('📋 Listando templates...');
    const response = await api.get('/templates');
    console.log(`✅ Encontrados ${response.data.data.templates.length} templates`);
    return response.data.data.templates;
  } catch (error) {
    console.error('❌ Erro ao listar templates:', error.response?.data || error.message);
    return [];
  }
}

// Função para obter um template específico
async function getTemplate(templateId) {
  try {
    console.log(`📋 Obtendo template ${templateId}...`);
    const response = await api.get(`/templates/${templateId}`);
    console.log('✅ Template obtido:', response.data.data.template.name);
    return response.data.data.template;
  } catch (error) {
    console.error('❌ Erro ao obter template:', error.response?.data || error.message);
    return null;
  }
}

// Função para atualizar um template
async function updateTemplate(templateId) {
  try {
    console.log(`✏️ Atualizando template ${templateId}...`);
    const updateData = {
      name: 'Template Teste CRUD - Atualizado',
      description: 'Template atualizado para testar operações CRUD',
      version: '1.1.0',
      status: 'active',
      changeDescription: 'Atualização de teste - nome e descrição modificados',
      steps: [
        {
          name: 'Verificar Sistema (Atualizado)',
          description: 'Verificar informações básicas do sistema - versão atualizada',
          command: 'uname -a && cat /etc/os-release',
          validations: [
            {
              type: 'string_contains',
              value: 'Linux',
              description: 'Sistema deve ser Linux'
            }
          ],
          timeout: 30000,
          retryable: true,
          required: true,
          order: 1,
          category: 'system'
        },
        {
          name: 'Verificar Memória (Atualizado)',
          description: 'Verificar uso de memória - versão atualizada',
          command: 'free -h && vmstat',
          validations: [
            {
              type: 'string_contains',
              value: 'Mem:',
              description: 'Deve mostrar informações de memória'
            }
          ],
          timeout: 30000,
          retryable: true,
          required: true,
          order: 2,
          category: 'system'
        },
        {
          name: 'Verificar Disco',
          description: 'Verificar uso de disco',
          command: 'df -h',
          validations: [
            {
              type: 'string_contains',
              value: '/dev/',
              description: 'Deve mostrar dispositivos de disco'
            }
          ],
          timeout: 30000,
          retryable: true,
          required: true,
          order: 3,
          category: 'system'
        }
      ]
    };

    const response = await api.put(`/templates/${templateId}`, updateData);
    console.log('✅ Template atualizado:', response.data.data.template.name);
    return response.data.data.template;
  } catch (error) {
    console.error('❌ Erro ao atualizar template:', error.response?.data || error.message);
    return null;
  }
}

// Função para arquivar um template (soft delete)
async function archiveTemplate(templateId) {
  try {
    console.log(`📦 Arquivando template ${templateId}...`);
    const response = await api.delete(`/templates/${templateId}`, {
      data: {
        reason: 'Teste de arquivamento'
      }
    });
    console.log('✅ Template arquivado:', response.data.data.archivedTemplate.name);
    return response.data.data.archivedTemplate;
  } catch (error) {
    console.error('❌ Erro ao arquivar template:', error.response?.data || error.message);
    return null;
  }
}

// Função para restaurar um template
async function restoreTemplate(templateId) {
  try {
    console.log(`📦 Restaurando template ${templateId}...`);
    const response = await api.post(`/templates/${templateId}/restore`, {
      newStatus: 'draft'
    });
    console.log('✅ Template restaurado:', response.data.data.restoredTemplate.name);
    return response.data.data.restoredTemplate;
  } catch (error) {
    console.error('❌ Erro ao restaurar template:', error.response?.data || error.message);
    return null;
  }
}

// Função para deletar permanentemente um template
async function deleteTemplatePermanently(templateId) {
  try {
    console.log(`🗑️ Deletando permanentemente template ${templateId}...`);
    const response = await api.delete(`/templates/${templateId}`, {
      data: {
        force: true,
        reason: 'Teste de exclusão permanente'
      }
    });
    console.log('✅ Template deletado permanentemente:', response.data.data.deletedTemplate.name);
    return response.data.data.deletedTemplate;
  } catch (error) {
    console.error('❌ Erro ao deletar template:', error.response?.data || error.message);
    return null;
  }
}

// Função para testar validações
async function testValidations(templateId) {
  try {
    console.log(`🧪 Testando validações do template ${templateId}...`);
    const testData = {
      testOutputs: [
        {
          stepIndex: 0,
          output: 'Linux ubuntu-server 5.4.0-42-generic #46-Ubuntu SMP Fri Jul 10 00:24:02 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux'
        },
        {
          stepIndex: 1,
          output: '              total        used        free      shared  buff/cache   available\nMem:           7.7Gi       2.1Gi       4.2Gi       0.0Ki       1.4Gi       5.3Gi'
        }
      ]
    };

    const response = await api.post(`/templates/${templateId}/test-validations`, testData);
    console.log('✅ Validações testadas:', response.data.data.summary);
    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao testar validações:', error.response?.data || error.message);
    return null;
  }
}

// Função principal de teste
async function runTests() {
  console.log('🚀 Iniciando testes dos endpoints de templates...\n');

  // 1. Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Falha no login. Abortando testes.');
    return;
  }

  // 2. Listar templates existentes
  await listTemplates();

  // 3. Criar template de teste
  const templateId = await createTestTemplate();
  if (!templateId) {
    console.log('❌ Falha ao criar template. Abortando testes.');
    return;
  }

  // 4. Obter template criado
  await getTemplate(templateId);

  // 5. Atualizar template
  await updateTemplate(templateId);

  // 6. Testar validações
  await testValidations(templateId);

  // 7. Arquivar template (soft delete)
  await archiveTemplate(templateId);

  // 8. Tentar obter template arquivado
  await getTemplate(templateId);

  // 9. Restaurar template
  await restoreTemplate(templateId);

  // 10. Verificar template restaurado
  await getTemplate(templateId);

  // 11. Deletar permanentemente
  await deleteTemplatePermanently(templateId);

  // 12. Tentar obter template deletado
  await getTemplate(templateId);

  // 13. Listar templates finais
  await listTemplates();

  console.log('\n✅ Todos os testes concluídos!');
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  login,
  createTestTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  archiveTemplate,
  restoreTemplate,
  deleteTemplatePermanently,
  testValidations,
  runTests
}; 