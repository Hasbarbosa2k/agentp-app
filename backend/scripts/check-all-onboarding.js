#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function checkAllOnboarding() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    console.log('🔍 Verificando todos os processos de onboarding...');
    const processes = await db.collection('onboardingprocesses').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log(`\n📊 Total de processos encontrados: ${processes.length}`);
    
    if (processes.length === 0) {
      console.log('❌ Nenhum processo de onboarding encontrado na base de dados');
      return;
    }
    
    processes.forEach((process, idx) => {
      console.log(`\n--- PROCESSO ${idx + 1} ---`);
      console.log(`ID: ${process._id}`);
      console.log(`System ID: ${process.systemId}`);
      console.log(`Status: ${process.status}`);
      console.log(`Criado: ${process.createdAt}`);
      console.log(`Template: ${process.templateName || 'N/A'}`);
      console.log(`Steps: ${process.steps?.length || 0}`);
      
      if (process.steps && process.steps.length > 0) {
        console.log('Steps executados:');
        process.steps.forEach((step, stepIdx) => {
          console.log(`  ${stepIdx + 1}. ${step.step} - ${step.status}`);
          if (step.output) {
            console.log(`     Output: ${typeof step.output === 'string' ? step.output.substring(0, 100) + '...' : 'Objeto JSON'}`);
          }
        });
      }
    });
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
  }
}

checkAllOnboarding(); 