#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function checkOnboardingHistory() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // Verificar todos os processos de onboarding para JanvsAI-Ubuntu
    const systemId = '6882101cd96c7f1f265e0de4';
    
    console.log('🔍 Verificando histórico de onboarding para JanvsAI-Ubuntu...');
    const processes = await db.collection('onboardingprocesses').find({ 
      systemId 
    }).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`\n📊 Total de processos encontrados: ${processes.length}`);
    
    if (processes.length === 0) {
      console.log('❌ Nenhum processo de onboarding encontrado para este sistema.');
      return;
    }
    
    // Mostrar o último processo (mais recente)
    const latestProcess = processes[0];
    console.log('\n🎯 ÚLTIMO PROCESSO DE ONBOARDING:');
    console.log(`ID: ${latestProcess._id}`);
    console.log(`Status: ${latestProcess.status}`);
    console.log(`Criado: ${latestProcess.createdAt}`);
    console.log(`Atualizado: ${latestProcess.updatedAt}`);
    console.log(`Template: ${latestProcess.templateName || 'N/A'}`);
    console.log(`Template ID: ${latestProcess.templateId || 'N/A'}`);
    console.log(`Total Steps: ${latestProcess.steps?.length || 0}`);
    console.log(`Progresso: ${latestProcess.progress || 0}%`);
    
    if (latestProcess.steps && latestProcess.steps.length > 0) {
      console.log('\n📋 DETALHE DOS STEPS:');
      latestProcess.steps.forEach((step, stepIdx) => {
        console.log(`\n  ${stepIdx + 1}. ${step.step}`);
        console.log(`     Status: ${step.status}`);
        console.log(`     Comando: ${step.command ? step.command.substring(0, 80) + '...' : 'N/A'}`);
        console.log(`     Duração: ${step.duration || 0}ms`);
        console.log(`     Iniciado: ${step.startedAt || 'N/A'}`);
        console.log(`     Terminado: ${step.endedAt || 'N/A'}`);
        
        if (step.output) {
          if (typeof step.output === 'string') {
            console.log(`     Output: ${step.output.substring(0, 200)}${step.output.length > 200 ? '...' : ''}`);
          } else {
            console.log(`     Output: [Objeto JSON com ${Object.keys(step.output).length} propriedades]`);
          }
        }
        
        if (step.error) {
          console.log(`     Erro: ${step.error}`);
        }
        
        // Mostrar validações se existirem
        if (step.validations && step.validations.length > 0) {
          console.log(`     Validações: ${step.validations.length}`);
          step.validations.forEach((validation, vIdx) => {
            console.log(`       ${vIdx + 1}. ${validation.type}: ${validation.value} - ${validation.success ? '✅' : '❌'}`);
          });
        }
      });
    }
    
    // Mostrar logs se existirem
    if (latestProcess.logs && latestProcess.logs.length > 0) {
      console.log('\n📝 ÚLTIMOS LOGS:');
      latestProcess.logs.slice(-5).forEach((log, idx) => {
        console.log(`  ${idx + 1}. [${log.level}] ${log.message} - ${log.timestamp}`);
      });
    }
    
    // Mostrar informações do sistema operativo se detectado
    if (latestProcess.osInfo) {
      console.log('\n🖥️ INFORMAÇÕES DO SISTEMA OPERATIVO:');
      console.log(`OS: ${latestProcess.osInfo.name || 'N/A'}`);
      console.log(`Versão: ${latestProcess.osInfo.version || 'N/A'}`);
      console.log(`Arquitetura: ${latestProcess.osInfo.architecture || 'N/A'}`);
      console.log(`Kernel: ${latestProcess.osInfo.kernel || 'N/A'}`);
    }
    
    // Mostrar estatísticas gerais
    console.log('\n📊 ESTATÍSTICAS DO PROCESSO:');
    console.log(`Passos Completados: ${latestProcess.completedSteps || 0}`);
    console.log(`Passos Falhados: ${latestProcess.failedSteps || 0}`);
    console.log(`Passos Ignorados: ${latestProcess.skippedSteps || 0}`);
    console.log(`Duração Total: ${latestProcess.totalDuration || 0}ms`);
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
  }
}

checkOnboardingHistory(); 