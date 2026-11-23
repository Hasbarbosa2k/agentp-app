#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function checkCurrentProcess() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // Verificar o processo específico
    const processId = '6891cc3f09170554a41c6d0c';
    const process = await db.collection('onboardingprocesses').findOne({ 
      _id: new mongoose.Types.ObjectId(processId)
    });
    
    if (!process) {
      console.log('❌ Processo não encontrado!');
      return;
    }
    
    console.log('\n📋 ESTADO ATUAL DO PROCESSO:');
    console.log('═══════════════════════════════');
    console.log(`ID: ${process._id}`);
    console.log(`Status: ${process.status}`);
    console.log(`System ID: ${process.systemId}`);
    console.log(`Template ID: ${process.templateId || 'UNDEFINED'}`);
    console.log(`Template Name: ${process.templateName || 'UNDEFINED'}`);
    console.log(`Steps: ${process.steps?.length || 0}`);
    console.log(`Criado: ${process.createdAt}`);
    console.log(`Atualizado: ${process.updatedAt}`);
    
    if (process.steps && process.steps.length > 0) {
      console.log('\n📝 Steps definidos:');
      process.steps.forEach((step, idx) => {
        console.log(`  ${idx + 1}. ${step.step} (${step.status || 'pending'})`);
      });
    } else {
      console.log('\n❌ PROBLEMA: Processo SEM STEPS!');
      console.log('Isso significa que o template não foi associado corretamente.');
    }
    
    // Verificar templates disponíveis
    console.log('\n📋 Templates disponíveis:');
    const templates = await db.collection('onboardingtemplates').find({ status: 'active' }).toArray();
    templates.forEach((template, idx) => {
      console.log(`  ${idx + 1}. ${template.name} (ID: ${template._id}) - ${template.steps?.length || 0} steps`);
    });
    
    console.log('\n🎯 SOLUÇÃO:');
    console.log('═════════════');
    console.log('1. Frontend deve chamar POST /onboarding/start primeiro');
    console.log('2. Com templateId obrigatório');
    console.log('3. Isso vai associar template e adicionar steps');
    console.log('4. Depois chamar POST /onboarding-execution/run');
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
  }
}

checkCurrentProcess();