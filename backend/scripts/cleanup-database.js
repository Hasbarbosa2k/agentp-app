#!/usr/bin/env node

/**
 * SCRIPT DE LIMPEZA DA BASE DE DADOS
 * Remove tabelas/coleções desnecessárias do projeto
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function listCollections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('\n📋 Collections encontradas na base de dados:');
    collections.forEach((collection, index) => {
      console.log(`   ${index + 1}. ${collection.name}`);
    });
    
    return collections.map(c => c.name);
    
  } catch (error) {
    console.error('❌ Erro ao conectar à base de dados:', error.message);
    throw error;
  }
}

async function dropCollections(collectionNames) {
  console.log(`\n🗑️ Removendo ${collectionNames.length} collections...`);
  
  for (const name of collectionNames) {
    try {
      await mongoose.connection.db.dropCollection(name);
      console.log(`   ✅ ${name} removida`);
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log(`   ⚠️ ${name} não existe (já removida)`);
      } else {
        console.error(`   ❌ Erro ao remover ${name}:`, error.message);
      }
    }
  }
}

async function cleanupDatabase() {
  console.log('🧹 INICIANDO LIMPEZA DA BASE DE DADOS\n');
  
  try {
    // Listar collections existentes
    const existingCollections = await listCollections();
    
    // Collections relacionadas ao sistema de Tests (desnecessárias)
    const testCollections = [
      'tests',
      'testexecutions'
    ];
    
    // Collections relacionadas a funcionalidades desnecessárias
    const unnecessaryCollections = [
      ...testCollections
    ];
    
    // Filtrar apenas as que existem
    const collectionsToRemove = unnecessaryCollections.filter(name => 
      existingCollections.includes(name)
    );
    
    if (collectionsToRemove.length === 0) {
      console.log('\n✅ Nenhuma collection desnecessária encontrada para remover.');
      return;
    }
    
    console.log('\n🎯 Collections identificadas para remoção:');
    collectionsToRemove.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name} (sistema de tests)`);
    });
    
    // Confirmar remoção
    console.log('\n⚠️  ATENÇÃO: Esta operação irá remover permanentemente os dados!');
    console.log('   Collections a remover:', collectionsToRemove.join(', '));
    
    // Em ambiente de produção, adicionar confirmação
    if (process.env.NODE_ENV === 'production') {
      console.log('\n❌ Execução em produção bloqueada. Execute manualmente se necessário.');
      return;
    }
    
    // Remover collections
    await dropCollections(collectionsToRemove);
    
    console.log('\n🎉 Limpeza concluída com sucesso!');
    console.log('\nCollections restantes (necessárias):');
    
    const remainingCollections = await listCollections();
    remainingCollections.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    
  } catch (error) {
    console.error('\n❌ Erro durante a limpeza:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  cleanupDatabase()
    .then(() => {
      console.log('\n✅ Script de limpeza concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script falhou:', error.message);
      process.exit(1);
    });
}

module.exports = { cleanupDatabase, listCollections, dropCollections };