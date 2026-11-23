require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Script para testar a API de ficheiros
 * NOTA: Este script pressupõe que o servidor está a correr e que existe um utilizador autenticado
 */

// Configuração
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_SYSTEM_SLUG = 'servidor-web-teste'; // Slug de um sistema existente
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
 * Criar um ficheiro de teste
 */
function createTestFile(fileName, content = 'Este é um ficheiro de teste criado automaticamente.') {
  const tempDir = path.join(__dirname, 'temp');
  
  // Criar diretório temp se não existir
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, content, 'utf8');
  
  return filePath;
}

/**
 * Testar upload de ficheiro único
 */
async function testSingleUpload() {
  try {
    console.log('\n1️⃣ Testando upload de ficheiro único...');
    
    // Criar ficheiro de teste
    const testFilePath = createTestFile('teste-upload.txt', 'Conteúdo do ficheiro de teste\nLinha 2\nLinha 3');
    
    // Preparar FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('description', 'Ficheiro de teste carregado via API');
    
    const response = await axios.post(
      `${BASE_URL}/files/${TEST_SYSTEM_SLUG}/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Upload único realizado com sucesso');
      console.log(`   Ficheiro: ${response.data.data.file.name}`);
      console.log(`   Tamanho: ${response.data.data.file.size} bytes`);
    } else {
      console.log('❌ Erro no upload:', response.data.message);
    }
    
    // Limpar ficheiro temporário
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.log('❌ Erro no upload único:', error.response?.data?.message || error.message);
  }
}

/**
 * Testar upload de múltiplos ficheiros
 */
async function testMultipleUpload() {
  try {
    console.log('\n2️⃣ Testando upload de múltiplos ficheiros...');
    
    // Criar ficheiros de teste
    const file1Path = createTestFile('config.json', JSON.stringify({ app: 'teste', version: '1.0' }, null, 2));
    const file2Path = createTestFile('readme.md', '# Ficheiro README\n\nEste é um ficheiro de teste.\n');
    const file3Path = createTestFile('dados.csv', 'nome,idade,cidade\nJoão,30,Lisboa\nMaria,25,Porto\n');
    
    // Preparar FormData
    const formData = new FormData();
    formData.append('files', fs.createReadStream(file1Path));
    formData.append('files', fs.createReadStream(file2Path));
    formData.append('files', fs.createReadStream(file3Path));
    formData.append('description', 'Múltiplos ficheiros de teste');
    
    const response = await axios.post(
      `${BASE_URL}/files/${TEST_SYSTEM_SLUG}/upload-multiple`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Upload múltiplo realizado com sucesso');
      console.log(`   Ficheiros carregados: ${response.data.data.totalFiles}`);
      console.log(`   Tamanho total: ${response.data.data.totalSize} bytes`);
    } else {
      console.log('❌ Erro no upload múltiplo:', response.data.message);
    }
    
    // Limpar ficheiros temporários
    [file1Path, file2Path, file3Path].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
  } catch (error) {
    console.log('❌ Erro no upload múltiplo:', error.response?.data?.message || error.message);
  }
}

/**
 * Testar listagem de ficheiros
 */
async function testListFiles() {
  try {
    console.log('\n3️⃣ Testando listagem de ficheiros...');
    
    const response = await axios.get(
      `${BASE_URL}/files/${TEST_SYSTEM_SLUG}?page=1&limit=10&sortBy=name`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Listagem realizada com sucesso');
      console.log(`   Total de ficheiros: ${response.data.data.pagination.totalFiles}`);
      
      if (response.data.data.files.length > 0) {
        console.log('   Ficheiros encontrados:');
        response.data.data.files.forEach((file, index) => {
          console.log(`     ${index + 1}. ${file.name} (${file.size} bytes, ${file.mimeType})`);
        });
      } else {
        console.log('   Nenhum ficheiro encontrado');
      }
    } else {
      console.log('❌ Erro na listagem:', response.data.message);
    }
    
  } catch (error) {
    console.log('❌ Erro na listagem:', error.response?.data?.message || error.message);
  }
}

/**
 * Testar estatísticas do diretório
 */
async function testGetStats() {
  try {
    console.log('\n4️⃣ Testando estatísticas do diretório...');
    
    const response = await axios.get(
      `${BASE_URL}/files/${TEST_SYSTEM_SLUG}/stats`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Estatísticas obtidas com sucesso');
      const stats = response.data.data.stats;
      console.log(`   Total de ficheiros: ${stats.totalFiles}`);
      console.log(`   Tamanho total: ${stats.totalSize} bytes`);
      console.log(`   Tipos de ficheiro:`, stats.fileTypes);
    } else {
      console.log('❌ Erro nas estatísticas:', response.data.message);
    }
    
  } catch (error) {
    console.log('❌ Erro nas estatísticas:', error.response?.data?.message || error.message);
  }
}

/**
 * Testar visualização de ficheiro
 */
async function testViewFile() {
  try {
    console.log('\n5️⃣ Testando visualização de ficheiro...');
    
    // Primeiro, obter lista de ficheiros para encontrar um ficheiro de texto
    const listResponse = await axios.get(
      `${BASE_URL}/files/${TEST_SYSTEM_SLUG}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (listResponse.data.success && listResponse.data.data.files.length > 0) {
      // Encontrar um ficheiro de texto
      const textFile = listResponse.data.data.files.find(file => 
        file.mimeType.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')
      );
      
      if (textFile) {
        const response = await axios.get(
          `${BASE_URL}/files/${TEST_SYSTEM_SLUG}/${textFile.name}/view`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          }
        );
        
        if (response.data.success) {
          console.log('✅ Visualização realizada com sucesso');
          console.log(`   Ficheiro: ${textFile.name}`);
          console.log(`   Conteúdo preview:`);
          console.log('   ---');
          console.log(response.data.data.content.substring(0, 200) + (response.data.data.content.length > 200 ? '...' : ''));
          console.log('   ---');
        } else {
          console.log('❌ Erro na visualização:', response.data.message);
        }
      } else {
        console.log('ℹ️ Nenhum ficheiro de texto encontrado para visualização');
      }
    } else {
      console.log('ℹ️ Nenhum ficheiro encontrado para visualização');
    }
    
  } catch (error) {
    console.log('❌ Erro na visualização:', error.response?.data?.message || error.message);
  }
}

/**
 * Testar remoção de ficheiro
 */
async function testDeleteFile() {
  try {
    console.log('\n6️⃣ Testando remoção de ficheiro...');
    
    // Primeiro, obter lista de ficheiros
    const listResponse = await axios.get(
      `${BASE_URL}/files/${TEST_SYSTEM_SLUG}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (listResponse.data.success && listResponse.data.data.files.length > 0) {
      // Encontrar um ficheiro para remover (preferencialmente ficheiro de teste)
      const fileToDelete = listResponse.data.data.files.find(file => 
        file.name.includes('teste') || file.name.includes('test')
      ) || listResponse.data.data.files[0];
      
      const response = await axios.delete(
        `${BASE_URL}/files/${TEST_SYSTEM_SLUG}/${fileToDelete.name}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (response.data.success) {
        console.log('✅ Remoção realizada com sucesso');
        console.log(`   Ficheiro removido: ${fileToDelete.name}`);
      } else {
        console.log('❌ Erro na remoção:', response.data.message);
      }
    } else {
      console.log('ℹ️ Nenhum ficheiro encontrado para remoção');
    }
    
  } catch (error) {
    console.log('❌ Erro na remoção:', error.response?.data?.message || error.message);
  }
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  console.log('🧪 Iniciando testes da API de Ficheiros');
  console.log('====================================\n');
  
  // Verificar se servidor está a correr
  try {
    await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Servidor está a correr');
  } catch (error) {
    console.log('❌ Servidor não está a correr. Inicie o servidor primeiro.');
    console.log('   Comando: npm start ou npm run dev');
    process.exit(1);
  }
  
  // Fazer login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Não foi possível fazer login. Verifique as credenciais.');
    process.exit(1);
  }
  
  // Executar testes
  await testSingleUpload();
  await testMultipleUpload();
  await testListFiles();
  await testGetStats();
  await testViewFile();
  await testDeleteFile();
  
  // Limpar diretório temporário
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  console.log('\n🎉 Testes concluídos!');
  console.log('================\n');
  
  console.log('📝 Endpoints testados:');
  console.log(`   POST ${BASE_URL}/files/{systemSlug}/upload`);
  console.log(`   POST ${BASE_URL}/files/{systemSlug}/upload-multiple`);
  console.log(`   GET  ${BASE_URL}/files/{systemSlug}`);
  console.log(`   GET  ${BASE_URL}/files/{systemSlug}/stats`);
  console.log(`   GET  ${BASE_URL}/files/{systemSlug}/{fileName}/view`);
  console.log(`   DELETE ${BASE_URL}/files/{systemSlug}/{fileName}`);
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('\n❌ Erro durante os testes:', error.message);
    process.exit(1);
  });
}

module.exports = runAllTests;