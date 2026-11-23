#!/usr/bin/env node

/**
 * Script para apagar o estado de onboarding do sistema JanvsAI-Ubuntu
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function resetJanvsAIUbuntu() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. Encontrar o sistema JanvsAI-Ubuntu
    console.log('🔍 Procurando sistema JanvsAI-Ubuntu...');
    const system = await db.collection('systems').findOne({ name: 'JanvsAI-Ubuntu' });
    
    if (!system) {
      console.error('❌ Sistema JanvsAI-Ubuntu não encontrado!');
      return;
    }
    
    console.log(`✅ Sistema encontrado: ${system.name} (ID: ${system._id})`);
    
    // 2. Encontrar e apagar processos de onboarding associados
    console.log('\n🗑️ Apagando processos de onboarding associados...');
    const deleteResult = await db.collection('onboardingprocesses').deleteMany({ systemId: system._id });
    console.log(`✅ ${deleteResult.deletedCount} processo(s) removido(s)`);
    
    // 3. Resetar o estado do onboarding no sistema
    console.log('\n🔄 Resetando estado do onboarding no sistema...');
    const updateResult = await db.collection('systems').updateOne(
      { _id: system._id },
      { 
        $set: { 
          onboardingStatus: 'not_started',
          onboardingRequired: true,
          lastOnboardingAttempt: null
        },
        $unset: {
          aiAnalyzedProfile: "",
          lastOnboardingError: ""
        }
      }
    );
    
    console.log(`✅ Sistema atualizado: ${updateResult.modifiedCount === 1 ? 'Sucesso' : 'Falha'}`);
    
    // 4. Confirmar estado atual
    const updatedSystem = await db.collection('systems').findOne({ _id: system._id });
    console.log('\n📊 ESTADO ATUAL DO SISTEMA:');
    console.log(`Nome: ${updatedSystem.name}`);
    console.log(`IP: ${updatedSystem.ip}`);
    console.log(`Status Onboarding: ${updatedSystem.onboardingStatus}`);
    console.log(`Onboarding Requerido: ${updatedSystem.onboardingRequired}`);
    
    console.log('\n✅ Estado de onboarding resetado com sucesso!');
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
  }
}

resetJanvsAIUbuntu();