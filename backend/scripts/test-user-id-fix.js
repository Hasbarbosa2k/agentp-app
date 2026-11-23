#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function testUserIdFix() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. Verificar onboarding processes existentes
    console.log('\n📊 Verificando processos de onboarding...');
    const processes = await db.collection('onboardingprocesses').find({}).toArray();
    
    console.log(`Total de processos: ${processes.length}`);
    
    processes.forEach((process, idx) => {
      console.log(`\n--- PROCESSO ${idx + 1} ---`);
      console.log(`ID: ${process._id}`);
      console.log(`System ID: ${process.systemId}`);
      console.log(`Status: ${process.status}`);
      console.log(`Initiated By: ${process.initiatedBy || 'UNDEFINED/NULL'}`);
      console.log(`Template: ${process.templateName || 'N/A'}`);
    });
    
    // 2. Verificar usuário com o token
    console.log('\n👤 Verificando usuário do token...');
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`Total de usuários: ${users.length}`);
    users.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.username} (ID: ${user._id})`);
    });
    
    console.log('\n🔧 CORREÇÕES APLICADAS:');
    console.log('═════════════════════════');
    console.log('✅ Controller: userId = req.user?._id (antes era req.user.userId)');
    console.log('✅ Validação: Adicionada verificação de userId obrigatório');
    console.log('✅ Service: Validação de userId no onboardingPersistenceService');
    console.log('✅ Debug: Logs adicionados para debuggar req.user');
    
    console.log('\n🎯 PRÓXIMO TESTE:');
    console.log('1. Frontend faz nova chamada para POST /onboarding-execution/run');
    console.log('2. Verificar logs no backend para ver req.user e userId');
    console.log('3. Processo deve ser criado com initiatedBy preenchido');
    
    await mongoose.disconnect();
    console.log('\n🔒 Teste concluído - Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    await mongoose.disconnect();
  }
}

testUserIdFix();