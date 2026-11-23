#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function checkTemplateSteps() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // Verificar o template Basicov5
    const templateId = '68921512861b2289eac5cac6';
    const template = await db.collection('onboardingtemplates').findOne({ 
      _id: new mongoose.Types.ObjectId(templateId)
    });
    
    if (!template) {
      console.log('❌ Template não encontrado!');
      return;
    }
    
    console.log('\n📋 TEMPLATE BASICOV5:');
    console.log('═════════════════════');
    console.log(`ID: ${template._id}`);
    console.log(`Name: ${template.name}`);
    console.log(`Status: ${template.status}`);
    console.log(`Steps: ${template.steps?.length || 0}`);
    
    if (template.steps && template.steps.length > 0) {
      console.log('\n📝 Steps do template:');
      template.steps.forEach((step, idx) => {
        console.log(`\n--- STEP ${idx + 1} ---`);
        console.log(`Name: ${step.name}`);
        console.log(`Command: ${step.command}`);
        console.log(`Description: ${step.description || 'N/A'}`);
        console.log(`Required: ${step.required || false}`);
        if (step.validations && step.validations.length > 0) {
          console.log(`Validations: ${step.validations.length}`);
        }
      });
    } else {
      console.log('\n❌ PROBLEMA: Template SEM STEPS!');
    }
    
    console.log('\n🔍 DIAGNÓSTICO:');
    console.log('═══════════════');
    if (template.steps && template.steps.length > 0) {
      console.log('✅ Template tem steps definidos');
      console.log('❌ Problema está no POST /onboarding/start');
      console.log('   → Não está copiando steps do template para o processo');
    } else {
      console.log('❌ Template não tem steps definidos');
      console.log('   → Problema na criação do template');
    }
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await mongoose.disconnect();
  }
}

checkTemplateSteps();