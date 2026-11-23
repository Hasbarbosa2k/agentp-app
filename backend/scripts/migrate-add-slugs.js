require('dotenv').config();
const mongoose = require('mongoose');
const System = require('../models/System');
const { generateUniqueSlug } = require('../utils/slugGenerator');
const { createSystemDirectory } = require('../utils/knowledgeBaseManager');

/**
 * Script de migração para adicionar slugs aos sistemas existentes
 * e criar os diretórios correspondentes na knowledge_base
 */
async function migrateAddSlugs() {
  console.log('🔄 Migração: Adicionando slugs aos sistemas existentes');
  console.log('===================================================\n');

  try {
    // Conectar à base de dados
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado à base de dados\n');

    // Buscar sistemas sem slug
    const systemsWithoutSlug = await System.find({ 
      slug: { $exists: false },
      isActive: true 
    });

    console.log(`📋 Encontrados ${systemsWithoutSlug.length} sistemas sem slug\n`);

    if (systemsWithoutSlug.length === 0) {
      console.log('✅ Todos os sistemas já possuem slug');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const system of systemsWithoutSlug) {
      try {
        console.log(`🔄 Processando: ${system.name} (${system.ip})`);

        // Gerar slug único
        const slug = await generateUniqueSlug(system.name, system._id);
        
        // Atualizar sistema com o slug
        system.slug = slug;
        await system.save();

        // Criar diretório correspondente
        try {
          await createSystemDirectory(slug, system.name);
          console.log(`  ✅ Slug criado: "${slug}" - Diretório criado`);
        } catch (dirError) {
          console.log(`  ⚠️  Slug criado: "${slug}" - Erro no diretório: ${dirError.message}`);
        }

        updated++;

      } catch (error) {
        console.log(`  ❌ Erro ao processar ${system.name}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n📊 Resumo da migração:');
    console.log(`✅ Sistemas atualizados: ${updated}`);
    console.log(`❌ Erros encontrados: ${errors}`);

    // Verificar se ainda há sistemas sem slug
    const remainingSystems = await System.countDocuments({ 
      slug: { $exists: false },
      isActive: true 
    });

    if (remainingSystems === 0) {
      console.log('🎉 Migração concluída com sucesso!');
    } else {
      console.log(`⚠️  Ainda restam ${remainingSystems} sistemas sem slug`);
    }

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
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
  migrateAddSlugs();
}

module.exports = migrateAddSlugs;