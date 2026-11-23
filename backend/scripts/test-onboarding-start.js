#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function testOnboardingStart() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    console.log('\n🧹 LIMPANDO PROCESSO ATUAL...');
    
    // Apagar processo existente para teste limpo
    const systemId = '6882101cd96c7f1f265e0de4';
    const deleteResult = await db.collection('onboardingprocesses').deleteMany({ 
      systemId: systemId 
    });
    
    console.log(`✅ ${deleteResult.deletedCount} processos apagados`);
    
    console.log('\n📋 TESTANDO FLUXO CORRETO:');
    console.log('═══════════════════════════');
    
    // Verificar template disponível
    const templateId = '68921512861b2289eac5cac6'; // Basicov5
    const template = await db.collection('onboardingtemplates').findOne({ 
      _id: new mongoose.Types.ObjectId(templateId)
    });
    
    if (!template) {
      console.log('❌ Template não encontrado!');
      return;
    }
    
    console.log(`✅ Template encontrado: ${template.name}`);
    console.log(`✅ Template tem ${template.steps.length} steps`);
    
    console.log('\n🎯 PRÓXIMO PASSO:');
    console.log('Frontend deve fazer:');
    console.log('POST /onboarding/start');
    console.log(`Body: { systemId: "${systemId}", templateId: "${templateId}" }`);
    console.log('');
    console.log('Isso deve:');
    console.log('1. Criar novo processo de onboarding');
    console.log('2. Associar template Basicov5');
    console.log('3. Copiar 1 step do template para o processo');
    console.log('4. Processo.steps.length deve ser 1');
    console.log('');
    console.log('Depois pode executar:');
    console.log('POST /onboarding-execution/run');
    console.log(`Body: { systemId: "${systemId}", credentials: {...} }`);
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
  }
}

testOnboardingStart();