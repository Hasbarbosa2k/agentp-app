const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEMPLATE_ID = '68921512861b2289eac5cac6'; // ID do template que está falhando

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@exemplo.com',
      password: 'Admin123!'
    });
    
    console.log('📋 Resposta do login:', JSON.stringify(response.data, null, 2));
    return response.data.data.tokens.accessToken;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    throw error;
  }
}

async function getTemplate(token, templateId) {
  try {
    console.log('🔑 Token sendo usado:', token);
    const response = await axios.get(`${BASE_URL}/templates/${templateId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📋 Template atual:', JSON.stringify(response.data.data, null, 2));
    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao buscar template:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    throw error;
  }
}

async function testMinimalUpdate(token, templateId) {
  try {
    console.log('\n🔍 Testando atualização mínima...');
    
    const updateData = {
      name: 'Template Teste Atualizado',
      description: 'Descrição atualizada'
    };
    
    console.log('📤 Dados sendo enviados:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.put(`${BASE_URL}/templates/${templateId}`, updateData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Atualização mínima bem-sucedida:', response.data);
  } catch (error) {
    console.error('❌ Erro na atualização mínima:');
    console.error('Status:', error.response?.status);
    console.error('Dados:', JSON.stringify(error.response?.data, null, 2));
  }
}

async function testUpdateWithSteps(token, templateId) {
  try {
    console.log('\n🔍 Testando atualização com steps...');
    
    const updateData = {
      name: 'Template com Steps',
      steps: [
        {
          name: 'Teste Step',
          description: 'Step de teste',
          command: 'echo "teste"',
          order: 1,
          category: 'custom',
          validations: [],
          timeout: 30000,
          retryable: true,
          required: true
        }
      ]
    };
    
    console.log('📤 Dados sendo enviados:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.put(`${BASE_URL}/templates/${templateId}`, updateData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Atualização com steps bem-sucedida:', response.data);
  } catch (error) {
    console.error('❌ Erro na atualização com steps:');
    console.error('Status:', error.response?.status);
    console.error('Dados:', JSON.stringify(error.response?.data, null, 2));
  }
}

async function testUpdateWithOutputValidation(token, templateId) {
  try {
    console.log('\n🔍 Testando atualização com validação output_contains...');
    
    const updateData = {
      name: 'Template com Output Validation',
      steps: [
        {
          name: 'Step com Output Validation',
          description: 'Step que testa output_contains',
          command: 'cat /etc/os-release',
          order: 1,
          category: 'system',
          validations: [
            {
              type: 'output_contains',
              value: 'Ubuntu',
              description: 'Verifica se é Ubuntu',
              required: true
            }
          ],
          timeout: 30000,
          retryable: true,
          required: true
        }
      ]
    };
    
    console.log('📤 Dados sendo enviados:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.put(`${BASE_URL}/templates/${templateId}`, updateData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Atualização com output_contains bem-sucedida:', response.data);
  } catch (error) {
    console.error('❌ Erro na atualização com output_contains:');
    console.error('Status:', error.response?.status);
    console.error('Dados:', JSON.stringify(error.response?.data, null, 2));
  }
}

async function debugTemplateUpdate() {
  try {
    console.log('🔍 Iniciando debug da atualização de template...');
    
    // 1. Login
    const token = await login();
    console.log('✅ Login realizado com sucesso');
    
    // 2. Buscar template atual
    await getTemplate(token, TEMPLATE_ID);
    
    // 3. Testar atualização mínima
    await testMinimalUpdate(token, TEMPLATE_ID);
    
    // 4. Testar atualização com steps
    await testUpdateWithSteps(token, TEMPLATE_ID);
    
    // 5. Testar atualização com output_contains
    await testUpdateWithOutputValidation(token, TEMPLATE_ID);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

if (require.main === module) {
  debugTemplateUpdate().catch(console.error);
}

module.exports = { debugTemplateUpdate }; 