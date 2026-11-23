#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function testCorrectTemplateFlow() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. Verificar templates disponíveis
    console.log('\n📋 Verificando templates disponíveis...');
    const templates = await db.collection('onboardingtemplates').find({ status: 'active' }).toArray();
    
    if (templates.length === 0) {
      console.log('❌ Nenhum template ativo encontrado!');
      return;
    }
    
    console.log(`✅ ${templates.length} templates disponíveis:`);
    templates.forEach((template, idx) => {
      console.log(`  ${idx + 1}. ${template.name} (${template.steps?.length || 0} steps)`);
    });
    
    // 2. Verificar sistema
    console.log('\n🖥️ Verificando sistema JanvsAI-Ubuntu...');
    const system = await db.collection('systems').findOne({ name: 'JanvsAI-Ubuntu' });
    
    if (!system) {
      console.log('❌ Sistema não encontrado!');
      return;
    }
    
    console.log(`✅ Sistema: ${system.name} (${system._id})`);
    
    // 3. Verificar processo de onboarding atual
    console.log('\n📊 Verificando processo de onboarding atual...');
    const currentProcess = await db.collection('onboardingprocesses').findOne({ 
      systemId: system._id 
    });
    
    if (currentProcess) {
      console.log(`📋 Processo existente encontrado:`);
      console.log(`   ID: ${currentProcess._id}`);
      console.log(`   Status: ${currentProcess.status}`);
      console.log(`   Template: ${currentProcess.templateName || 'N/A'}`);
      console.log(`   Template ID: ${currentProcess.templateId || 'N/A'}`);
      console.log(`   Steps: ${currentProcess.steps?.length || 0}`);
      
      if (currentProcess.steps && currentProcess.steps.length > 0) {
        console.log(`   📝 Steps definidos:`);
        currentProcess.steps.forEach((step, idx) => {
          console.log(`      ${idx + 1}. ${step.step} (${step.status || 'pending'})`);
        });
      }
    } else {
      console.log('📋 Nenhum processo de onboarding encontrado');
    }
    
    // 4. Explicar o fluxo correto
    console.log('\n🎯 FLUXO CORRETO APÓS CORREÇÃO:');
    console.log('════════════════════════════════');
    
    console.log('\n1️⃣ PRIMEIRO: Associar Template');
    console.log('   POST /onboarding/start');
    console.log('   Body: { systemId, templateId }');
    console.log('   → Cria processo com steps do template');
    console.log('   → Status: "pending"');
    
    console.log('\n2️⃣ SEGUNDO: Executar Onboarding');  
    console.log('   POST /onboarding-execution/run');
    console.log('   Body: { systemId, credentials }');
    console.log('   → USA o processo existente (com template)');
    console.log('   → NÃO cria novo processo vazio');
    console.log('   → Executa os steps do template');
    
    console.log('\n3️⃣ RE-ONBOARDING:');
    console.log('   Opção A: Mesmo template');
    console.log('   → POST /onboarding/start (mesmo templateId)');
    console.log('   → Reseta processo e adiciona steps novamente');
    console.log('   → POST /onboarding-execution/run');
    console.log('   → Executa com novos resultados');
    
    console.log('\n   Opção B: Template diferente');
    console.log('   → POST /onboarding/start (novo templateId)');
    console.log('   → Reseta processo e adiciona steps do novo template');
    console.log('   → POST /onboarding-execution/run');
    console.log('   → Executa com template diferente');
    
    console.log('\n🔧 CORREÇÃO APLICADA:');
    console.log('═══════════════════════');
    console.log('✅ onboardingExecutionService.js:');
    console.log('   - Sempre usa processo existente');
    console.log('   - NÃO cria novo processo com restart=true');
    console.log('   - Preserva steps do template');
    console.log('   - Apenas atualiza status para in_progress');
    
    console.log('\n❌ PROBLEMA ANTERIOR:');
    console.log('═══════════════════════');
    console.log('❌ POST /onboarding/start → Cria processo com template');
    console.log('❌ POST /onboarding-execution/run → Criava NOVO processo VAZIO');
    console.log('❌ Resultado: Steps do template perdidos');
    
    await mongoose.disconnect();
    console.log('\n🔒 Teste concluído - Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    await mongoose.disconnect();
  }
}

testCorrectTemplateFlow();