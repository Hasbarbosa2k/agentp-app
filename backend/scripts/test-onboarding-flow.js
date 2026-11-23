#!/usr/bin/env node

/**
 * Script para testar o fluxo completo de onboarding com template
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function testOnboardingFlow() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. Verificar sistema JanvsAI-Ubuntu
    console.log('\n🔍 Verificando sistema JanvsAI-Ubuntu...');
    const system = await db.collection('systems').findOne({ name: 'JanvsAI-Ubuntu' });
    
    if (!system) {
      console.error('❌ Sistema JanvsAI-Ubuntu não encontrado!');
      return;
    }
    
    console.log(`✅ Sistema: ${system.name} (ID: ${system._id})`);
    console.log(`Status Onboarding: ${system.onboardingStatus}`);
    
    // 2. Verificar templates disponíveis
    console.log('\n📋 Verificando templates disponíveis...');
    const templates = await db.collection('onboardingtemplates').find({ status: 'active' }).toArray();
    
    console.log(`Templates ativos: ${templates.length}`);
    templates.forEach((template, idx) => {
      console.log(`  ${idx + 1}. ${template.name} (${template.steps?.length || 0} steps)`);
    });
    
    // 3. Verificar processos de onboarding existentes
    console.log('\n🔍 Verificando processos de onboarding...');
    const processes = await db.collection('onboardingprocesses').find({ systemId: system._id }).toArray();
    
    console.log(`Processos encontrados: ${processes.length}`);
    processes.forEach((process, idx) => {
      console.log(`  ${idx + 1}. Status: ${process.status}, Steps: ${process.steps?.length || 0}`);
      if (process.templateName) {
        console.log(`     Template: ${process.templateName}`);
      }
    });
    
    // 4. Simular fluxo de onboarding
    console.log('\n🚀 SIMULANDO FLUXO DE ONBOARDING:');
    console.log('1. Template association → Cria processo in_progress');
    console.log('2. Execution → Usa processo existente e executa comandos');
    console.log('3. Result → Onboarding completo');
    
    console.log('\n✅ Sistema pronto para teste!');
    console.log('\n📝 PRÓXIMOS PASSOS NO FRONTEND:');
    console.log('1. Associar template via POST /onboarding/start');
    console.log('2. Executar onboarding via POST /onboarding-execution/run');
    console.log('3. Monitorar progresso via WebSocket/SSE');
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
  }
}

testOnboardingFlow(); 

/**
 * Script para testar o fluxo completo de onboarding com template
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function testOnboardingFlow() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. Verificar sistema JanvsAI-Ubuntu
    console.log('\n🔍 Verificando sistema JanvsAI-Ubuntu...');
    const system = await db.collection('systems').findOne({ name: 'JanvsAI-Ubuntu' });
    
    if (!system) {
      console.error('❌ Sistema JanvsAI-Ubuntu não encontrado!');
      return;
    }
    
    console.log(`✅ Sistema: ${system.name} (ID: ${system._id})`);
    console.log(`Status Onboarding: ${system.onboardingStatus}`);
    
    // 2. Verificar templates disponíveis
    console.log('\n📋 Verificando templates disponíveis...');
    const templates = await db.collection('onboardingtemplates').find({ status: 'active' }).toArray();
    
    console.log(`Templates ativos: ${templates.length}`);
    templates.forEach((template, idx) => {
      console.log(`  ${idx + 1}. ${template.name} (${template.steps?.length || 0} steps)`);
    });
    
    // 3. Verificar processos de onboarding existentes
    console.log('\n🔍 Verificando processos de onboarding...');
    const processes = await db.collection('onboardingprocesses').find({ systemId: system._id }).toArray();
    
    console.log(`Processos encontrados: ${processes.length}`);
    processes.forEach((process, idx) => {
      console.log(`  ${idx + 1}. Status: ${process.status}, Steps: ${process.steps?.length || 0}`);
      if (process.templateName) {
        console.log(`     Template: ${process.templateName}`);
      }
    });
    
    // 4. Simular fluxo de onboarding
    console.log('\n🚀 SIMULANDO FLUXO DE ONBOARDING:');
    console.log('1. Template association → Cria processo in_progress');
    console.log('2. Execution → Usa processo existente e executa comandos');
    console.log('3. Result → Onboarding completo');
    
    console.log('\n✅ Sistema pronto para teste!');
    console.log('\n📝 PRÓXIMOS PASSOS NO FRONTEND:');
    console.log('1. Associar template via POST /onboarding/start');
    console.log('2. Executar onboarding via POST /onboarding-execution/run');
    console.log('3. Monitorar progresso via WebSocket/SSE');
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
  }
}

testOnboardingFlow(); 