#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentp';

async function listTemplates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado à base de dados MongoDB');
    
    const db = mongoose.connection.db;
    
    // Listar todos os templates
    const templates = await db.collection('onboardingtemplates').find({}).toArray();
    
    console.log(`\n📋 TEMPLATES ENCONTRADOS: ${templates.length}`);
    templates.forEach((template, idx) => {
      console.log(`\n--- TEMPLATE ${idx + 1} ---`);
      console.log(`ID: ${template._id}`);
      console.log(`Nome: ${template.name}`);
      console.log(`Descrição: ${template.description || 'Sem descrição'}`);
      console.log(`Status: ${template.status}`);
      console.log(`OS Suportados: ${template.supportedOS?.join(', ') || 'Qualquer (não especificado)'}`);
      console.log(`Total Steps: ${template.steps?.length || 0}`);
      
      if (template.steps?.length > 0) {
        console.log(`\nSteps:`);
        template.steps.forEach((step, stepIdx) => {
          console.log(`  ${stepIdx + 1}. ${step.name}`);
          console.log(`     Comando: ${step.command}`);
          console.log(`     Validações: ${step.validations?.length || 0}`);
          if (step.validations?.length > 0) {
            step.validations.forEach((v, vIdx) => {
              console.log(`       ${vIdx + 1}. Tipo: ${v.type}, Valor: ${v.value || 'N/A'}`);
            });
          }
        });
      }
    });
    
    await mongoose.disconnect();
    console.log('\n🔒 Desconectado da base de dados');
    
  } catch (error) {
    console.error('\n❌ Erro ao listar templates:', error.message);
    await mongoose.disconnect();
  }
}

listTemplates();