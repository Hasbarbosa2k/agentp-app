const mongoose = require('mongoose');
const OnboardingTemplate = require('../models/OnboardingTemplate');

// Exemplo de template com validação de output
const templateWithOutputValidation = {
  name: "Template com Validação de Output",
  description: "Template que demonstra como usar validações de output para determinar sucesso/falha dos steps",
  version: "1.0.0",
  category: "custom",
  tags: ["validação", "output", "exemplo"],
  status: "active",
  supportedOS: ["ubuntu", "debian"],
  steps: [
    {
      name: "Verificar Sistema Operacional",
      description: "Verifica qual sistema operacional está instalado",
      command: "cat /etc/os-release",
      order: 1,
      category: "system",
      validations: [
        {
          type: "output_contains",
          value: "Ubuntu",
          description: "Verifica se o sistema é Ubuntu",
          required: true
        }
      ],
      timeout: 30000,
      retryable: true,
      required: true,
      continueOnFailure: false
    },
    {
      name: "Verificar Memória RAM",
      description: "Verifica a quantidade de memória RAM disponível",
      command: "free -h",
      order: 2,
      category: "system",
      validations: [
        {
          type: "output_contains",
          value: "Mem:",
          description: "Verifica se o comando free retornou informações de memória",
          required: true
        },
        {
          type: "output_contains",
          value: "Gi",
          description: "Verifica se a memória está em GB (indica sistema com boa memória)",
          required: false
        }
      ],
      timeout: 30000,
      retryable: true,
      required: true,
      continueOnFailure: false
    },
    {
      name: "Verificar Espaço em Disco",
      description: "Verifica o espaço disponível em disco",
      command: "df -h /",
      order: 3,
      category: "system",
      validations: [
        {
          type: "output_contains",
          value: "/dev/",
          description: "Verifica se há um dispositivo de disco montado",
          required: true
        },
        {
          type: "output_contains",
          value: "%",
          description: "Verifica se o output mostra percentagem de uso",
          required: true
        }
      ],
      timeout: 30000,
      retryable: true,
      required: true,
      continueOnFailure: false
    },
    {
      name: "Verificar Serviços Ativos",
      description: "Verifica quais serviços estão ativos no sistema",
      command: "systemctl list-units --state=active --type=service | head -10",
      order: 4,
      category: "services",
      validations: [
        {
          type: "output_contains",
          value: "active",
          description: "Verifica se há serviços ativos",
          required: true
        },
        {
          type: "output_contains",
          value: "systemd",
          description: "Verifica se o systemd está funcionando",
          required: true
        }
      ],
      timeout: 30000,
      retryable: true,
      required: true,
      continueOnFailure: false
    },
    {
      name: "Verificar Conectividade de Rede",
      description: "Verifica se há conectividade com a internet",
      command: "ping -c 3 8.8.8.8",
      order: 5,
      category: "network",
      validations: [
        {
          type: "output_contains",
          value: "3 packets transmitted",
          description: "Verifica se o ping foi executado",
          required: true
        },
        {
          type: "output_contains",
          value: "0% packet loss",
          description: "Verifica se não há perda de pacotes (conectividade boa)",
          required: false
        }
      ],
      timeout: 60000,
      retryable: true,
      required: true,
      continueOnFailure: false
    }
  ],
  config: {
    stopOnFirstError: false,
    allowParallelExecution: false,
    globalTimeout: 600,
    maxRetries: 3
  }
};

// Função para criar o template
async function createTemplateWithOutputValidation(userId) {
  try {
    // Verificar se já existe um template com este nome
    const existingTemplate = await OnboardingTemplate.findOne({ 
      name: templateWithOutputValidation.name 
    });
    
    if (existingTemplate) {
      console.log(`Template "${templateWithOutputValidation.name}" já existe.`);
      return existingTemplate;
    }

    // Criar novo template
    const template = new OnboardingTemplate({
      ...templateWithOutputValidation,
      createdBy: userId
    });

    await template.save();
    console.log(`✅ Template "${template.name}" criado com sucesso!`);
    console.log(`📋 ID do template: ${template._id}`);
    console.log(`🔍 Total de steps: ${template.steps.length}`);
    
    // Mostrar detalhes das validações
    console.log('\n📝 Detalhes das validações por step:');
    template.steps.forEach((step, index) => {
      console.log(`\n  Step ${index + 1}: ${step.name}`);
      console.log(`  Comando: ${step.command}`);
      console.log(`  Validações: ${step.validations.length}`);
      step.validations.forEach((validation, vIndex) => {
        console.log(`    ${vIndex + 1}. Tipo: ${validation.type}`);
        console.log(`       Valor: "${validation.value}"`);
        console.log(`       Descrição: ${validation.description}`);
        console.log(`       Obrigatória: ${validation.required ? 'Sim' : 'Não'}`);
      });
    });

    return template;
  } catch (error) {
    console.error('❌ Erro ao criar template:', error.message);
    throw error;
  }
}

// Função para testar validações
async function testValidations(templateId, stepIndex, output) {
  try {
    const template = await OnboardingTemplate.findById(templateId);
    if (!template) {
      throw new Error('Template não encontrado');
    }

    console.log(`\n🧪 Testando validações para step ${stepIndex + 1}: ${template.steps[stepIndex].name}`);
    console.log(`📤 Output fornecido: "${output}"`);
    
    const validationResults = template.validateStepOutput(stepIndex, output);
    
    console.log(`\n📊 Resultados das validações:`);
    console.log(`   Total: ${validationResults.totalValidations}`);
    console.log(`   Passaram: ${validationResults.passedValidations}`);
    console.log(`   Falharam: ${validationResults.failedValidations}`);
    console.log(`   Sucesso geral: ${validationResults.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    validationResults.validationResults.forEach((result, index) => {
      console.log(`\n   Validação ${index + 1}:`);
      console.log(`     Tipo: ${result.type}`);
      console.log(`     Valor: "${result.value}"`);
      console.log(`     Sucesso: ${result.success ? '✅' : '❌'}`);
      console.log(`     Detalhes: ${result.details}`);
      console.log(`     Obrigatória: ${result.required ? 'Sim' : 'Não'}`);
    });

    return validationResults;
  } catch (error) {
    console.error('❌ Erro ao testar validações:', error.message);
    throw error;
  }
}

module.exports = {
  templateWithOutputValidation,
  createTemplateWithOutputValidation,
  testValidations
};

// Se executado diretamente
if (require.main === module) {
  console.log('📋 Exemplo de template com validação de output');
  console.log('Para usar este exemplo:');
  console.log('1. Importe as funções no seu script');
  console.log('2. Chame createTemplateWithOutputValidation(userId) para criar o template');
  console.log('3. Use testValidations(templateId, stepIndex, output) para testar validações');
  
  console.log('\n📝 Exemplo de uso:');
  console.log(`
const { createTemplateWithOutputValidation, testValidations } = require('./examples/template-with-output-validation');

// Criar template
const template = await createTemplateWithOutputValidation(userId);

// Testar validações
const results = await testValidations(template._id, 0, 'NAME="Ubuntu"');
  `);
} 