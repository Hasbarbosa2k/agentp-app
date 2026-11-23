#!/usr/bin/env node

/**
 * SCRIPT DE LIMPEZA DOS DADOS DE ONBOARDING ANTIGOS
 * Remove processos de onboarding existentes e reseta status dos sistemas
 * Para testar apenas com novos templates e endpoints
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function cleanupOnboardingData() {
  console.log('🧹 INICIANDO LIMPEZA DOS DADOS DE ONBOARDING ANTIGOS\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. Contar dados existentes
    console.log('\n📊 DADOS EXISTENTES:');
    const systemsCount = await db.collection('systems').countDocuments();
    const processesCount = await db.collection('onboardingprocesses').countDocuments();
    const templatesCount = await db.collection('onboardingtemplates').countDocuments();
    
    console.log(`   - Sistemas: ${systemsCount}`);
    console.log(`   - Processos de Onboarding: ${processesCount}`);
    console.log(`   - Templates: ${templatesCount}`);
    
    if (processesCount === 0) {
      console.log('\n✅ Nenhum processo de onboarding encontrado para limpar');
      return;
    }
    
    // 2. Mostrar processos existentes
    console.log('\n🔍 PROCESSOS DE ONBOARDING EXISTENTES:');
    const processes = await db.collection('onboardingprocesses').find({}, {
      projection: { systemId: 1, status: 1, progress: 1, createdAt: 1 }
    }).toArray();
    
    for (const proc of processes) {
      const system = await db.collection('systems').findOne(
        { _id: proc.systemId }, 
        { projection: { name: 1, ip: 1 } }
      );
      console.log(`   - ${system?.name || 'Sistema'} (${system?.ip || 'N/A'}) - ${proc.status} (${proc.progress || 0}%)`);
    }
    
    // 3. Remover todos os processos de onboarding
    console.log('\n🗑️ REMOVENDO PROCESSOS DE ONBOARDING...');
    const deleteResult = await db.collection('onboardingprocesses').deleteMany({});
    console.log(`   ✅ ${deleteResult.deletedCount} processos removidos`);
    
    // 4. Resetar status de onboarding dos sistemas
    console.log('\n🔄 RESETANDO STATUS DOS SISTEMAS...');
    const updateResult = await db.collection('systems').updateMany(
      {},
      {
        $set: {
          onboardingStatus: 'not_started',
          lastOnboardingAttempt: null,
          onboardingRequired: true
        },
        $unset: {
          aiAnalyzedProfile: "",
          lastOnboardingError: ""
        }
      }
    );
    console.log(`   ✅ ${updateResult.modifiedCount} sistemas resetados`);
    
    // 5. Verificar resultado final
    console.log('\n📊 DADOS APÓS LIMPEZA:');
    const finalSystemsCount = await db.collection('systems').countDocuments();
    const finalProcessesCount = await db.collection('onboardingprocesses').countDocuments();
    const finalTemplatesCount = await db.collection('onboardingtemplates').countDocuments();
    
    console.log(`   - Sistemas: ${finalSystemsCount} (mantidos)`);
    console.log(`   - Processos de Onboarding: ${finalProcessesCount} (limpos)`);
    console.log(`   - Templates: ${finalTemplatesCount} (mantidos)`);
    
    // 6. Mostrar sistemas resetados
    console.log('\n✅ SISTEMAS PRONTOS PARA NOVO ONBOARDING:');
    const resetSystems = await db.collection('systems').find({}, {
      projection: { name: 1, ip: 1, onboardingStatus: 1 }
    }).toArray();
    
    resetSystems.forEach((system, idx) => {
      console.log(`   ${idx + 1}. ${system.name} (${system.ip}) - Status: ${system.onboardingStatus}`);
    });
    
    console.log('\n🎉 LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('\n🆕 PRÓXIMOS PASSOS:');
    console.log('   1. Criar templates de onboarding');
    console.log('   2. Testar novos endpoints de templates');
    console.log('   3. Iniciar onboarding com templates personalizados');
    
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
  cleanupOnboardingData()
    .then(() => {
      console.log('\n✅ Script de limpeza concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script falhou:', error.message);
      process.exit(1);
    });
}

module.exports = { cleanupOnboardingData };