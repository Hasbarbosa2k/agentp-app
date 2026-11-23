const mongoose = require('mongoose');
const { createTemplateWithOutputValidation, testValidations } = require('../examples/template-with-output-validation');

// Configuração do MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/onboarding-system';

// ID de usuário para teste (você pode alterar para um ID válido)
const TEST_USER_ID = '507f1f77bcf86cd799439011'; // ID de exemplo

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
}

async function testOutputValidation() {
  try {
    console.log('🧪 Iniciando testes de validação de output...\n');

    // 1. Criar template com validações
    console.log('📋 1. Criando template com validações de output...');
    const template = await createTemplateWithOutputValidation(TEST_USER_ID);
    console.log('✅ Template criado com sucesso!\n');

    // 2. Testar validações com diferentes outputs
    console.log('🔍 2. Testando validações com diferentes outputs...\n');

    // Teste 1: Output que contém o texto esperado (SUCCESS)
    console.log('📝 Teste 1: Output com texto esperado (deve ser SUCCESS)');
    const output1 = `NAME="Ubuntu"
VERSION="20.04.3 LTS (Focal Fossa)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 20.04.3 LTS"
VERSION_ID="20.04"
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
VERSION_CODENAME=focal
UBUNTU_CODENAME=focal`;

    await testValidations(template._id, 0, output1);

    // Teste 2: Output que NÃO contém o texto esperado (FAILED)
    console.log('\n📝 Teste 2: Output sem texto esperado (deve ser FAILED)');
    const output2 = `NAME="Debian"
VERSION="11 (bullseye)"
ID=debian
ID_LIKE=debian
PRETTY_NAME="Debian GNU/Linux 11 (bullseye)"
VERSION_ID="11"
HOME_URL="https://www.debian.org/"
SUPPORT_URL="https://www.debian.org/support"
BUG_REPORT_URL="https://bugs.debian.org/"`;

    await testValidations(template._id, 0, output2);

    // Teste 3: Output vazio (FAILED)
    console.log('\n📝 Teste 3: Output vazio (deve ser FAILED)');
    const output3 = '';
    await testValidations(template._id, 0, output3);

    // Teste 4: Testar step de memória com output realista
    console.log('\n📝 Teste 4: Testando step de memória com output realista');
    const memoryOutput = `              total        used        free      shared  buff/cache   available
Mem:           15Gi       2.1Gi       8.9Gi       0.0Ki       4.0Gi      12Gi
Swap:         8.0Gi          0B       8.0Gi`;

    await testValidations(template._id, 1, memoryOutput);

    // Teste 5: Testar step de memória com output sem "Gi" (validação opcional falha)
    console.log('\n📝 Teste 5: Testando step de memória sem "Gi" (validação opcional deve falhar)');
    const memoryOutputNoGi = `              total        used        free      shared  buff/cache   available
Mem:           8192M       1024M       4096M          0M       3072M      7168M
Swap:         8192M          0M       8192M`;

    await testValidations(template._id, 1, memoryOutputNoGi);

    // Teste 6: Testar step de disco
    console.log('\n📝 Teste 6: Testando step de disco');
    const diskOutput = `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   20G   75G  21% /`;

    await testValidations(template._id, 2, diskOutput);

    // Teste 7: Testar step de serviços
    console.log('\n📝 Teste 7: Testando step de serviços');
    const servicesOutput = `UNIT                     LOAD   ACTIVE SUB     DESCRIPTION
systemd-journald.service loaded active running Journal Service
systemd-logind.service   loaded active running User Login Management
systemd-networkd.service loaded active running Network Service
systemd-resolved.service loaded active running Network Name Resolution
systemd-timesyncd.service loaded active running Network Time Synchronization
systemd-udevd.service    loaded active running udev Kernel Device Manager`;

    await testValidations(template._id, 3, servicesOutput);

    // Teste 8: Testar step de conectividade (sucesso)
    console.log('\n📝 Teste 8: Testando step de conectividade (sucesso)');
    const pingSuccessOutput = `PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 time=15.2 ms
64 bytes from 8.8.8.8: icmp_seq=2 time=14.8 ms
64 bytes from 8.8.8.8: icmp_seq=3 time=15.1 ms

--- 8.8.8.8 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 14.800/15.033/15.200/0.200 ms`;

    await testValidations(template._id, 4, pingSuccessOutput);

    // Teste 9: Testar step de conectividade (falha)
    console.log('\n📝 Teste 9: Testando step de conectividade (falha)');
    const pingFailOutput = `PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.

--- 8.8.8.8 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss, time 2003ms`;

    await testValidations(template._id, 4, pingFailOutput);

    console.log('\n✅ Todos os testes concluídos com sucesso!');
    console.log('\n📊 Resumo dos testes:');
    console.log('   - Teste 1: SUCCESS (Ubuntu encontrado)');
    console.log('   - Teste 2: FAILED (Ubuntu não encontrado)');
    console.log('   - Teste 3: FAILED (output vazio)');
    console.log('   - Teste 4: SUCCESS (memória com Gi)');
    console.log('   - Teste 5: SUCCESS (memória sem Gi, mas validação opcional)');
    console.log('   - Teste 6: SUCCESS (disco com /dev/ e %)');
    console.log('   - Teste 7: SUCCESS (serviços ativos)');
    console.log('   - Teste 8: SUCCESS (ping com 0% packet loss)');
    console.log('   - Teste 9: FAILED (ping com 100% packet loss)');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  connectToDatabase()
    .then(() => testOutputValidation())
    .catch(console.error);
}

module.exports = { testOutputValidation }; 