#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function showSpecificOnboarding() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // ID do processo específico que queremos mostrar
    const processId = '6891cc3f09170554a41c6d0c';
    
    console.log('🔍 Buscando processo de onboarding específico...');
    const process = await db.collection('onboardingprocesses').findOne({ 
      _id: new mongoose.Types.ObjectId(processId)
    });
    
    if (!process) {
      console.log('❌ Processo de onboarding não encontrado');
      return;
    }
    
    console.log('\n🎯 DETALHES DO ÚLTIMO ONBOARDING DO JANVSAI-UBUNTU');
    console.log('=====================================================');
    console.log(`ID do Processo: ${process._id}`);
    console.log(`Status: ${process.status}`);
    console.log(`Template Usado: ${process.templateName || 'N/A'}`);
    console.log(`Template ID: ${process.templateId || 'N/A'}`);
    console.log(`Criado em: ${process.createdAt}`);
    console.log(`Atualizado em: ${process.updatedAt}`);
    console.log(`Progresso: ${process.progress || 0}%`);
    console.log(`Total de Steps: ${process.steps?.length || 0}`);
    
    if (process.steps && process.steps.length > 0) {
      console.log('\n📋 DETALHE COMPLETO DOS STEPS EXECUTADOS:');
      console.log('===========================================');
      
      process.steps.forEach((step, idx) => {
        console.log(`\n--- STEP ${idx + 1}: ${step.step} ---`);
        console.log(`Status: ${step.status}`);
        console.log(`Duração: ${step.duration || 0}ms`);
        console.log(`Comando: ${step.command || 'N/A'}`);
        
        if (step.output) {
          console.log('\n📤 OUTPUT COMPLETO:');
          if (typeof step.output === 'string') {
            console.log(step.output);
          } else {
            console.log(JSON.stringify(step.output, null, 2));
          }
        }
        
        if (step.error) {
          console.log(`\n❌ ERRO: ${step.error}`);
        }
        
        if (step.templateValidations && step.templateValidations.length > 0) {
          console.log(`\n✅ Validações do Template: ${step.templateValidations.length}`);
          step.templateValidations.forEach((validation, vIdx) => {
            console.log(`  ${vIdx + 1}. Tipo: ${validation.type}, Valor: ${validation.value || 'N/A'}`);
          });
        }
      });
    }
    
    if (process.logs && process.logs.length > 0) {
      console.log('\n📝 LOGS DO PROCESSO:');
      console.log('====================');
      process.logs.forEach((log, idx) => {
        console.log(`${idx + 1}. [${log.level}] ${log.message} (${log.timestamp})`);
      });
    }
    
    // Mostrar informações do sistema operativo detectado
    if (process.osInfo) {
      console.log('\n🖥️ INFORMAÇÕES DO SISTEMA OPERATIVO DETECTADO:');
      console.log('===============================================');
      console.log(`ID: ${process.osInfo.id || 'N/A'}`);
      console.log(`Nome: ${process.osInfo.name || 'N/A'}`);
      console.log(`Versão: ${process.osInfo.version || 'N/A'}`);
      console.log(`Nome Completo: ${process.osInfo.prettyName || 'N/A'}`);
      console.log(`Arquitetura: ${process.osInfo.architecture || 'N/A'}`);
      console.log(`Kernel: ${process.osInfo.kernel || 'N/A'}`);
    }
    
    // Mostrar informações de rede
    if (process.networkInfo) {
      console.log('\n🌐 INFORMAÇÕES DE REDE:');
      console.log('========================');
      console.log(`Conectividade: ${process.networkInfo.connectivity ? 'Sim' : 'Não'}`);
      console.log(`Tempo de Resposta: ${process.networkInfo.responseTime || 'N/A'}ms`);
    }
    
    // Mostrar estatísticas do processo
    console.log('\n📊 ESTATÍSTICAS DO PROCESSO:');
    console.log('=============================');
    console.log(`Passos Completados: ${process.completedSteps || 0}`);
    console.log(`Passos Falhados: ${process.failedSteps || 0}`);
    console.log(`Passos Ignorados: ${process.skippedSteps || 0}`);
    console.log(`Duração Total: ${process.totalDuration || 0}ms`);
    
    console.log('\n✅ Detalhes do onboarding mostrados com sucesso!');
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
  }
}

showSpecificOnboarding(); 