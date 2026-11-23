require('dotenv').config();
const mongoose = require('mongoose');
const { generateSlug, generateUniqueSlug, isValidSlug } = require('../utils/slugGenerator');
const { 
  ensureKnowledgeBaseExists, 
  createSystemDirectory, 
  listSystemDirectories,
  getSystemDirectoryInfo,
  KNOWLEDGE_BASE_PATH 
} = require('../utils/knowledgeBaseManager');

/**
 * Script para testar a funcionalidade de slugs e diretórios
 */
async function testSlugAndDirectories() {
  console.log('🧪 Testando funcionalidade de Slugs e Diretórios');
  console.log('================================================\n');

  try {
    // Conectar à base de dados
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado à base de dados\n');

    // 1. Testar geração de slugs
    console.log('1️⃣ Testando geração de slugs:');
    const testNames = [
      'Servidor Web Principal',
      'Base de Dados MySQL',
      'API Gateway - Production!!!',
      'Sistema com (parênteses) & símbolos especiais',
      'Múltiplos     espaços',
      '123 Servidor Numérico',
      'a',
      'Sistema com nome muito longo que vai ser cortado para não exceder o limite'
    ];

    for (const name of testNames) {
      const slug = generateSlug(name);
      const isValid = isValidSlug(slug);
      console.log(`  "${name}" → "${slug}" ${isValid ? '✅' : '❌'}`);
    }

    // 2. Testar geração de slugs únicos
    console.log('\n2️⃣ Testando geração de slugs únicos:');
    const uniqueSlug1 = await generateUniqueSlug('Servidor Teste');
    const uniqueSlug2 = await generateUniqueSlug('Servidor Teste'); // Deve ser diferente
    console.log(`  Primeiro slug: "${uniqueSlug1}"`);
    console.log(`  Segundo slug: "${uniqueSlug2}"`);

    // 3. Testar criação de knowledge_base
    console.log('\n3️⃣ Testando criação do diretório knowledge_base:');
    await ensureKnowledgeBaseExists();
    console.log(`  ✅ Diretório knowledge_base: ${KNOWLEDGE_BASE_PATH}`);

    // 4. Testar criação de diretórios de sistema
    console.log('\n4️⃣ Testando criação de diretórios de sistema:');
    const testSystems = [
      { slug: 'servidor-web', name: 'Servidor Web' },
      { slug: 'api-gateway', name: 'API Gateway' },
      { slug: 'database-mysql', name: 'Database MySQL' }
    ];

    for (const system of testSystems) {
      try {
        const dirPath = await createSystemDirectory(system.slug, system.name);
        console.log(`  ✅ Criado: ${system.slug} (${dirPath})`);
      } catch (error) {
        console.log(`  ❌ Erro ao criar ${system.slug}: ${error.message}`);
      }
    }

    // 5. Listar diretórios criados
    console.log('\n5️⃣ Listando diretórios criados:');
    const directories = await listSystemDirectories();
    console.log(`  📁 Diretórios encontrados: ${directories.length}`);
    for (const dir of directories) {
      const info = await getSystemDirectoryInfo(dir);
      if (info) {
        console.log(`    - ${dir}: ${info.systemName} (criado em ${new Date(info.createdAt).toLocaleString()})`);
      } else {
        console.log(`    - ${dir}: (sem informações)`);
      }
    }

    // 6. Testar validação de slugs inválidos
    console.log('\n6️⃣ Testando validação de slugs inválidos:');
    const invalidSlugs = [
      '',
      '-invalid',
      'invalid-',
      'UPPERCASE',
      'with spaces',
      'with_underscores',
      'with@symbols',
      'a'.repeat(51) // Muito longo
    ];

    for (const slug of invalidSlugs) {
      const isValid = isValidSlug(slug);
      console.log(`  "${slug}" → ${isValid ? '✅' : '❌'} ${isValid ? 'válido' : 'inválido'}`);
    }

    console.log('\n🎉 Testes concluídos com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n📡 Desconectado da base de dados');
    }
    process.exit(0);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testSlugAndDirectories();
}

module.exports = testSlugAndDirectories;