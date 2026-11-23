/**
 * Script para corrigir índices do modelo System
 * Remove índices antigos e cria novos com partialFilterExpression
 * 
 * Executar: node scripts/fixSystemIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    // Conectar à base de dados
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';
    console.log(`🔗 Conectando a ${mongoUri}...`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('systems');

    // Listar índices actuais
    console.log('\n📋 Índices actuais:');
    const currentIndexes = await collection.indexes();
    currentIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (unique)' : ''}`);
    });

    // Remover índices problemáticos
    console.log('\n🗑️ Removendo índices antigos...');
    
    try {
      await collection.dropIndex('ip_1');
      console.log('   ✅ Índice ip_1 removido');
    } catch (e) {
      console.log(`   ⚠️ Índice ip_1: ${e.message}`);
    }

    try {
      await collection.dropIndex('slug_1');
      console.log('   ✅ Índice slug_1 removido');
    } catch (e) {
      console.log(`   ⚠️ Índice slug_1: ${e.message}`);
    }

    // Criar novos índices com partialFilterExpression
    console.log('\n🔧 Criando novos índices...');
    
    await collection.createIndex(
      { ip: 1 },
      { 
        unique: true, 
        partialFilterExpression: { isActive: true },
        name: 'ip_1_active'
      }
    );
    console.log('   ✅ Índice ip_1_active criado');

    await collection.createIndex(
      { slug: 1 },
      { 
        unique: true, 
        partialFilterExpression: { isActive: true },
        name: 'slug_1_active'
      }
    );
    console.log('   ✅ Índice slug_1_active criado');

    // Criar índice para isActive se não existir
    await collection.createIndex(
      { isActive: 1 },
      { name: 'isActive_1' }
    );
    console.log('   ✅ Índice isActive_1 criado');

    // Verificar índices finais
    console.log('\n📋 Índices após correcção:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (unique)' : ''}${idx.partialFilterExpression ? ' (partial)' : ''}`);
    });

    console.log('\n✅ Índices corrigidos com sucesso!');
    console.log('💡 Agora podes reutilizar IPs/slugs de sistemas apagados.');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔒 Conexão fechada');
  }
}

fixIndexes();

