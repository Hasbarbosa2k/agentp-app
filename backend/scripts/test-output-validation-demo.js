const mongoose = require('mongoose');
const OnboardingTemplate = require('../models/OnboardingTemplate');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/onboarding-system';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    throw error;
  }
}

async function demonstrateOutputValidation() {
  try {
    await connectToDatabase();

    // 1. Criar um template de exemplo
    const template = new OnboardingTemplate({
      name: 'Demonstração Output Validation',
      description: 'Exemplo de como funciona a validação output_contains',
      version: '1.0.0',
      category: 'custom',
      createdBy: new mongoose.Types.ObjectId(),
      steps: [
        {
          name: 'Verificar OS',
          description: 'Detecta se é Ubuntu',
          command: 'cat /etc/os-release',
          order: 1,
          category: 'system',
          validations: [
            {
              type: 'output_contains',
              value: 'Ubuntu',
              description: 'Procura pela palavra Ubuntu no output',
              required: true
            }
          ]
        }
      ]
    });

    await template.save();
    console.log('✅ Template criado:', template.name);

    // 2. Simular diferentes outputs e testar validação
    const testCases = [
      {
        name: 'Output com Ubuntu (SUCCESS)',
        output: 'NAME="Ubuntu"\nVERSION="22.04.3 LTS"\nID=ubuntu\nPRETTY_NAME="Ubuntu 22.04.3 LTS"',
        expected: true
      },
      {
        name: 'Output sem Ubuntu (FAILED)',
        output: 'NAME="Debian GNU/Linux"\nVERSION="11 (bullseye)"\nID=debian\nPRETTY_NAME="Debian GNU/Linux 11"',
        expected: false
      },
      {
        name: 'Output vazio (FAILED)',
        output: '',
        expected: false
      }
    ];

    console.log('\n🧪 Testando validações:\n');

    for (const testCase of testCases) {
      console.log(`📋 Teste: ${testCase.name}`);
      console.log(`📤 Output simulado: "${testCase.output.substring(0, 50)}${testCase.output.length > 50 ? '...' : ''}"`);
      
      const validation = template.steps[0].validations[0];
      const result = template.executeValidation(validation, testCase.output);
      
      console.log(`📊 Resultado:`);
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Details: ${result.details}`);
      console.log(`   - Esperado: ${testCase.expected}`);
      console.log(`   - ✅ Teste: ${result.success === testCase.expected ? 'PASSOU' : 'FALHOU'}\n`);
    }

    // 3. Cleanup
    await template.deleteOne();
    console.log('🧹 Template de teste removido');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

if (require.main === module) {
  demonstrateOutputValidation().catch(console.error);
}

module.exports = { demonstrateOutputValidation };