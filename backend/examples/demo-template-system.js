#!/usr/bin/env node

/**
 * DEMONSTRAÇÃO DO SISTEMA DE TEMPLATES DE ONBOARDING
 * 
 * Script para demonstrar o novo sistema de templates personalizáveis
 * conforme solicitado pelo usuário.
 * 
 * Uso: node examples/demo-template-system.js
 */

const axios = require('axios');
const { systemDiscoveryTemplate } = require('./template-examples');

// Configuração
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

if (!AUTH_TOKEN) {
  console.error('❌ TOKEN de autenticação necessário. Defina AUTH_TOKEN=your_token');
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function demonstrateTemplateSystem() {
  console.log('🚀 DEMONSTRAÇÃO DO SISTEMA DE TEMPLATES DE ONBOARDING');
  console.log('=' .repeat(60));
  
  try {
    // 1. Criar template de exemplo
    console.log('\n📋 1. Criando template de exemplo...');
    const createResponse = await api.post('/templates', systemDiscoveryTemplate);
    const templateId = createResponse.data.data.template._id;
    
    console.log('✅ Template criado com sucesso!');
    console.log(`   ID: ${templateId}`);
    console.log(`   Nome: ${createResponse.data.data.template.name}`);
    console.log(`   Passos: ${createResponse.data.data.template.totalSteps}`);
    console.log(`   Validações: ${createResponse.data.data.template.totalValidations}`);
    
    // 2. Listar templates
    console.log('\n📋 2. Listando templates disponíveis...');
    const listResponse = await api.get('/templates');
    
    console.log('✅ Templates encontrados:');
    listResponse.data.data.templates.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.name} (${template.status})`);
      console.log(`      - Categoria: ${template.category}`);
      console.log(`      - OS Suportados: ${template.supportedOS.join(', ')}`);
      console.log(`      - Usado ${template.usage.timesUsed} vezes`);
    });
    
    // 3. Obter detalhes do template
    console.log('\n📋 3. Obtendo detalhes do template criado...');
    const detailsResponse = await api.get(`/templates/${templateId}`);
    const template = detailsResponse.data.data.template;
    
    console.log('✅ Detalhes do template:');
    console.log(`   Nome: ${template.name}`);
    console.log(`   Versão: ${template.version}`);
    console.log(`   Passos:`);
    
    template.steps.forEach((step, index) => {
      console.log(`     ${index + 1}. ${step.name}`);
      console.log(`        Comando: ${step.command}`);
      console.log(`        Validações: ${step.validations.length}`);
      step.validations.forEach((validation, vIndex) => {
        console.log(`          ${vIndex + 1}. ${validation.type}: "${validation.value}"`);
        if (validation.description) {
          console.log(`             (${validation.description})`);
        }
      });
    });
    
    // 4. Testar validações do template
    console.log('\n🧪 4. Testando validações do template...');
    
    const testOutputs = [
      {
        stepIndex: 0,
        output: `NAME="Ubuntu"
VERSION="20.04.3 LTS (Focal Fossa)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 20.04.3 LTS"
VERSION_ID="20.04"
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"`
      },
      {
        stepIndex: 1,
        output: `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
sshd:x:110:65534::/run/sshd:/usr/sbin/nologin`
      },
      {
        stepIndex: 2,
        output: `● snmpd.service - Simple Network Management Protocol (SNMP) Daemon.
   Loaded: loaded (/lib/systemd/system/snmpd.service; enabled; vendor preset: enabled)
   Active: active (running) since Mon 2023-12-11 10:00:00 UTC; 2h 15min ago
     Docs: man:snmpd(8)
 Main PID: 1234 (snmpd)
    Tasks: 1 (limit: 2339)
   Memory: 4.2M
   CGroup: /system.slice/snmpd.service
           └─1234 /usr/sbin/snmpd -Lsd -Lf /dev/null -u Debian-snmp -g Debian-snmp -I -smux mteTrigger mteTriggerConf`
      }
    ];
    
    const testResponse = await api.post(`/templates/${templateId}/test-validations`, {
      testOutputs
    });
    
    console.log('✅ Resultados dos testes de validação:');
    console.log(`   Total de testes: ${testResponse.data.data.summary.totalTests}`);
    console.log(`   Testes bem-sucedidos: ${testResponse.data.data.summary.successfulTests}`);
    console.log(`   Testes falhados: ${testResponse.data.data.summary.failedTests}`);
    
    testResponse.data.data.testResults.forEach((result, index) => {
      console.log(`\n   Teste ${index + 1}: ${result.stepName}`);
      console.log(`     Status: ${result.overallSuccess ? '✅ PASSOU' : '❌ FALHOU'}`);
      console.log(`     Validações: ${result.passedValidations}/${result.totalValidations} passaram`);
      
      if (result.validationResults) {
        result.validationResults.forEach((validation, vIndex) => {
          const status = validation.success ? '✅' : '❌';
          console.log(`       ${vIndex + 1}. ${status} ${validation.type}: "${validation.value}"`);
          console.log(`          ${validation.details}`);
        });
      }
    });
    
    // 5. Demonstrar como usar template em onboarding
    console.log('\n🎯 5. Exemplo de como usar o template em onboarding:');
    console.log(`
Para usar este template em um onboarding real, faça:

POST /onboarding/start
{
  "systemId": "SEU_SYSTEM_ID_AQUI",
  "templateId": "${templateId}",
  "config": {
    "maxRetries": 2,
    "timeoutSeconds": 300
  }
}

O sistema irá:
1. Executar cada comando do template
2. Validar automaticamente os outputs
3. Reportar sucesso/falha baseado nas validações
4. Continuar ou parar baseado na configuração
`);
    
    // 6. Clonar template
    console.log('\n📋 6. Clonando template para demonstrar...');
    const cloneResponse = await api.post(`/templates/${templateId}/clone`, {
      name: "System Discovery - Cloned Demo",
      description: "Cópia do template original para demonstração"
    });
    
    console.log('✅ Template clonado com sucesso!');
    console.log(`   ID do clone: ${cloneResponse.data.data.template._id}`);
    console.log(`   Nome: ${cloneResponse.data.data.template.name}`);
    
    // 7. Limpar recursos de demonstração (opcional)
    console.log('\n🧹 7. Limpando recursos de demonstração...');
    
    try {
      await api.delete(`/templates/${templateId}`);
      console.log('✅ Template original removido');
    } catch (error) {
      console.log('⚠️ Não foi possível remover template original');
    }
    
    try {
      await api.delete(`/templates/${cloneResponse.data.data.template._id}`);
      console.log('✅ Template clonado removido');
    } catch (error) {
      console.log('⚠️ Não foi possível remover template clonado');
    }
    
    console.log('\n🎉 DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\nO sistema de templates está funcionando corretamente e pronto para uso.');
    console.log('\nVocê pode agora:');
    console.log('- Criar templates personalizados via API ou interface');
    console.log('- Usar templates em processos de onboarding');
    console.log('- Validar outputs automaticamente');
    console.log('- Clonar e modificar templates existentes');
    
  } catch (error) {
    console.error('\n❌ Erro durante a demonstração:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Mensagem: ${error.response.data.message || error.response.statusText}`);
      if (error.response.data.error) {
        console.error(`Erro: ${error.response.data.error}`);
      }
    } else if (error.request) {
      console.error('Erro de conexão. Verifique se o servidor está executando.');
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

// Verificação de dependências
async function checkDependencies() {
  console.log('🔍 Verificando dependências...');
  
  try {
    // Testar conexão com API
    const healthResponse = await api.get('/health');
    console.log('✅ Servidor está respondendo');
    
    // Verificar autenticação
    const authTestResponse = await api.get('/profile');
    console.log('✅ Autenticação válida');
    
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ Token de autenticação inválido');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Não foi possível conectar ao servidor');
      console.error(`   Verifique se o servidor está executando em ${BASE_URL}`);
    } else {
      console.error('❌ Erro de verificação:', error.message);
    }
    return false;
  }
}

// Executar demonstração
async function main() {
  const dependenciesOk = await checkDependencies();
  
  if (!dependenciesOk) {
    console.log('\n💡 Para corrigir:');
    console.log('1. Certifique-se de que o servidor está executando: npm start');
    console.log('2. Obtenha um token válido fazendo login na API');
    console.log('3. Execute: AUTH_TOKEN=seu_token node examples/demo-template-system.js');
    process.exit(1);
  }
  
  await demonstrateTemplateSystem();
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  demonstrateTemplateSystem,
  checkDependencies
};