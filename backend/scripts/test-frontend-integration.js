require('dotenv').config();
const axios = require('axios');

/**
 * Script para testar a integração frontend com slugs e API de ficheiros
 */

// Configuração
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
let authToken = '';

// Dados de teste para autenticação
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'admin@teste.com',
  password: process.env.TEST_USER_PASSWORD || 'admin123'
};

/**
 * Fazer login e obter token
 */
async function login() {
  try {
    console.log('🔐 Fazendo login...');
    
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login realizado com sucesso');
      return true;
    } else {
      console.log('❌ Erro no login:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro no login:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Testar listagem de sistemas (verificar se slug está incluído)
 */
async function testSystemsList() {
  try {
    console.log('\n1️⃣ Testando listagem de sistemas...');
    
    const response = await axios.get(`${BASE_URL}/systems`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success && response.data.data.systems.length > 0) {
      console.log('✅ Sistemas obtidos com sucesso');
      
      const systems = response.data.data.systems;
      console.log(`   Total de sistemas: ${systems.length}`);
      
      // Verificar se todos os sistemas têm slug
      let systemsWithSlug = 0;
      systems.forEach((system, index) => {
        if (system.slug) {
          systemsWithSlug++;
          console.log(`   ${index + 1}. ${system.name} → slug: "${system.slug}"`);
        } else {
          console.log(`   ❌ ${index + 1}. ${system.name} → SEM SLUG!`);
        }
      });
      
      if (systemsWithSlug === systems.length) {
        console.log('✅ Todos os sistemas têm slug!');
        return systems[0]; // Retornar primeiro sistema para testes seguintes
      } else {
        console.log(`❌ ${systems.length - systemsWithSlug} sistemas sem slug`);
        return null;
      }
    } else {
      console.log('⚠️ Nenhum sistema encontrado');
      return null;
    }
    
  } catch (error) {
    console.log('❌ Erro na listagem:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Testar busca de sistema específico
 */
async function testSystemById(systemId) {
  try {
    console.log('\n2️⃣ Testando busca de sistema por ID...');
    
    const response = await axios.get(`${BASE_URL}/systems/${systemId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const system = response.data.data.system;
      console.log('✅ Sistema obtido com sucesso');
      console.log(`   Nome: ${system.name}`);
      console.log(`   ID: ${system._id}`);
      console.log(`   Slug: ${system.slug || 'SEM SLUG!'}`);
      console.log(`   IP: ${system.ip}`);
      
      if (system.slug) {
        console.log(`   📁 API de ficheiros: /api/files/${system.slug}`);
        return system;
      } else {
        console.log('❌ Sistema não tem slug!');
        return null;
      }
    } else {
      console.log('❌ Erro ao obter sistema:', response.data.message);
      return null;
    }
    
  } catch (error) {
    console.log('❌ Erro na busca:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Testar endpoint de informações básicas
 */
async function testSystemBasicInfo(systemId) {
  try {
    console.log('\n3️⃣ Testando endpoint de informações básicas...');
    
    const response = await axios.get(`${BASE_URL}/systems/${systemId}/basic`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const system = response.data.data.system;
      console.log('✅ Informações básicas obtidas');
      console.log(`   Nome: ${system.name}`);
      console.log(`   Slug: ${system.slug}`);
      console.log(`   Status: ${system.status}`);
      console.log(`   Ambiente: ${system.environment}`);
      
      return system;
    } else {
      console.log('❌ Erro ao obter informações básicas:', response.data.message);
      return null;
    }
    
  } catch (error) {
    console.log('❌ Erro nas informações básicas:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Testar endpoint de conversão ID → Slug
 */
async function testGetSlug(systemId) {
  try {
    console.log('\n4️⃣ Testando conversão ID → Slug...');
    
    const response = await axios.get(`${BASE_URL}/systems/${systemId}/slug`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ Slug obtido com sucesso');
      console.log(`   System ID: ${data.systemId}`);
      console.log(`   Slug: ${data.slug}`);
      console.log(`   Nome: ${data.name}`);
      console.log(`   Base Path: ${data.fileApiBasePath}`);
      
      return data;
    } else {
      console.log('❌ Erro ao obter slug:', response.data.message);
      return null;
    }
    
  } catch (error) {
    console.log('❌ Erro na conversão:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Testar busca por slug
 */
async function testSystemBySlug(slug) {
  try {
    console.log('\n5️⃣ Testando busca por slug...');
    
    const response = await axios.get(`${BASE_URL}/systems/by-slug/${slug}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const system = response.data.data.system;
      console.log('✅ Sistema encontrado pelo slug');
      console.log(`   Nome: ${system.name}`);
      console.log(`   ID: ${system._id}`);
      console.log(`   Slug: ${system.slug}`);
      
      return system;
    } else {
      console.log('❌ Erro ao buscar por slug:', response.data.message);
      return null;
    }
    
  } catch (error) {
    console.log('❌ Erro na busca por slug:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Testar integração com API de ficheiros
 */
async function testFileApiIntegration(slug) {
  try {
    console.log('\n6️⃣ Testando integração com API de ficheiros...');
    
    // Testar listagem de ficheiros usando slug
    const response = await axios.get(`${BASE_URL}/files/${slug}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ API de ficheiros acessível via slug');
      console.log(`   Slug usado: ${slug}`);
      console.log(`   Total de ficheiros: ${response.data.data.pagination.totalFiles}`);
      
      // Testar estatísticas
      const statsResponse = await axios.get(`${BASE_URL}/files/${slug}/stats`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (statsResponse.data.success) {
        const stats = statsResponse.data.data.stats;
        console.log('✅ Estatísticas obtidas');
        console.log(`   Ficheiros: ${stats.totalFiles}`);
        console.log(`   Tamanho total: ${stats.totalSize} bytes`);
        console.log(`   Tipos: ${Object.keys(stats.fileTypes).join(', ') || 'nenhum'}`);
      }
      
      return true;
    } else {
      console.log('❌ Erro na API de ficheiros:', response.data.message);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Erro na integração de ficheiros:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Simular fluxo frontend típico
 */
async function simulateFrontendFlow() {
  try {
    console.log('\n7️⃣ Simulando fluxo frontend típico...');
    
    // 1. Frontend carrega lista de sistemas
    console.log('   📋 Frontend: Carregando lista de sistemas...');
    const systemsResponse = await axios.get(`${BASE_URL}/systems?limit=5`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!systemsResponse.data.success || systemsResponse.data.data.systems.length === 0) {
      console.log('   ❌ Nenhum sistema disponível');
      return;
    }
    
    const systems = systemsResponse.data.data.systems;
    console.log(`   ✅ ${systems.length} sistemas carregados`);
    
    // 2. Usuário seleciona um sistema
    const selectedSystem = systems[0];
    console.log(`   👤 Usuário seleciona: ${selectedSystem.name}`);
    console.log(`   🏷️ Slug disponível: ${selectedSystem.slug}`);
    
    // 3. Frontend navega para gestão de ficheiros
    console.log(`   🔄 Frontend navega para /systems/${selectedSystem._id}/files`);
    
    // 4. Página de ficheiros usa slug diretamente
    console.log(`   📁 Página usa slug para API: /api/files/${selectedSystem.slug}`);
    
    // 5. Carregar ficheiros
    const filesResponse = await axios.get(`${BASE_URL}/files/${selectedSystem.slug}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (filesResponse.data.success) {
      console.log(`   ✅ Ficheiros carregados: ${filesResponse.data.data.pagination.totalFiles}`);
      console.log('   🎉 Fluxo frontend completo com sucesso!');
      return true;
    } else {
      console.log('   ❌ Erro ao carregar ficheiros');
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ Erro no fluxo:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  console.log('🧪 Testando Integração Frontend com Slugs');
  console.log('==========================================\n');
  
  // Verificar se servidor está a correr
  try {
    await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Servidor está a correr');
  } catch (error) {
    console.log('❌ Servidor não está a correr. Inicie o servidor primeiro.');
    process.exit(1);
  }
  
  // Fazer login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Não foi possível fazer login.');
    process.exit(1);
  }
  
  // 1. Testar listagem (obter primeiro sistema)
  const firstSystem = await testSystemsList();
  if (!firstSystem) {
    console.log('❌ Não foi possível obter sistemas para teste.');
    process.exit(1);
  }
  
  const systemId = firstSystem._id;
  const systemSlug = firstSystem.slug;
  
  // 2. Testar busca por ID
  const systemById = await testSystemById(systemId);
  
  // 3. Testar informações básicas
  const basicInfo = await testSystemBasicInfo(systemId);
  
  // 4. Testar conversão ID → Slug
  const slugData = await testGetSlug(systemId);
  
  // 5. Testar busca por slug
  const systemBySlug = await testSystemBySlug(systemSlug);
  
  // 6. Testar integração com API de ficheiros
  const fileApiWorking = await testFileApiIntegration(systemSlug);
  
  // 7. Simular fluxo frontend completo
  const frontendFlowWorking = await simulateFrontendFlow();
  
  // Resumo final
  console.log('\n📊 Resumo dos Testes');
  console.log('====================');
  console.log(`✅ Listagem de sistemas: ${firstSystem ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Busca por ID: ${systemById ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Informações básicas: ${basicInfo ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Conversão ID → Slug: ${slugData ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Busca por slug: ${systemBySlug ? 'OK' : 'FALHOU'}`);
  console.log(`✅ API de ficheiros: ${fileApiWorking ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Fluxo frontend: ${frontendFlowWorking ? 'OK' : 'FALHOU'}`);
  
  console.log('\n🎯 Conclusão');
  console.log('=============');
  
  if (firstSystem && systemById && basicInfo && slugData && systemBySlug && fileApiWorking && frontendFlowWorking) {
    console.log('🎉 Todos os testes passaram! Integração frontend está pronta.');
    console.log('\n📝 O frontend pode agora:');
    console.log('   • Obter slugs automaticamente nas listagens');
    console.log('   • Converter IDs em slugs quando necessário');
    console.log('   • Usar slugs para API de ficheiros');
    console.log('   • Navegar entre sistemas e ficheiros seamlessly');
  } else {
    console.log('❌ Alguns testes falharam. Verifique os erros acima.');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('\n❌ Erro durante os testes:', error.message);
    process.exit(1);
  });
}

module.exports = runAllTests;