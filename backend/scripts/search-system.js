#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function searchSystem() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados');
    
    const db = mongoose.connection.db;
    
    // Procurar sistema por IP
    console.log('\n🔍 Procurando sistema com IP: 203.0.113.10');
    const system = await db.collection('systems').findOne({ ip: '203.0.113.10' });
    
    if (!system) {
      console.log('❌ Sistema não encontrado na base de dados');
      return;
    }
    
    console.log('\n📊 SISTEMA ENCONTRADO:');
    console.log('ID:', system._id);
    console.log('Nome:', system.name);
    console.log('IP:', system.ip);
    console.log('OS:', system.os);
    console.log('Status:', system.status);
    console.log('Owner:', system.owner);
    console.log('Onboarding Status:', system.onboardingStatus);
    
    // Procurar processos de onboarding
    console.log('\n🔍 PROCURANDO PROCESSOS DE ONBOARDING...');
    const processes = await db.collection('onboardingprocesses').find({ 
      systemId: system._id 
    }).sort({ createdAt: -1 }).toArray();
    
    console.log('Total de processos encontrados:', processes.length);
    
    if (processes.length === 0) {
      console.log('❌ Nenhum processo de onboarding encontrado');
      return;
    }
    
    processes.forEach((proc, idx) => {
      console.log(`\n--- PROCESSO ${idx + 1} ---`);
      console.log('ID:', proc._id);
      console.log('Status:', proc.status);
      console.log('Progresso:', proc.progress + '%');
      console.log('Total Steps:', proc.steps ? proc.steps.length : 0);
      console.log('Template:', proc.templateName || 'Sem template');
      console.log('Criado:', proc.createdAt);
      console.log('Atualizado:', proc.updatedAt);
      
      if (proc.steps && proc.steps.length > 0) {
        console.log('\nDETALHE DOS STEPS:');
        proc.steps.forEach((step, stepIdx) => {
          console.log(`  ${stepIdx + 1}. ${step.step}`);
          console.log(`     Status: ${step.status}`);
          console.log(`     Duração: ${step.duration || 0}ms`);
          console.log(`     Comando: ${step.command ? step.command.substring(0, 50) + '...' : 'N/A'}`);
          if (step.output) {
            console.log(`     Output: ${typeof step.output === 'string' ? step.output.substring(0, 100) + '...' : 'Objeto JSON'}`);
          }
          console.log('');
        });
      }
      
      if (proc.logs && proc.logs.length > 0) {
        console.log('ÚLTIMOS LOGS:');
        proc.logs.slice(-3).forEach(log => {
          console.log(`  [${log.level}] ${log.message}`);
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

searchSystem();