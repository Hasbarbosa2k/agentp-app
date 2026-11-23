require('dotenv').config();
const mongoose = require('mongoose');
const System = require('../models/System');
const User = require('../models/User');
const { generateUniqueSlug } = require('../utils/slugGenerator');
const { createSystemDirectory } = require('../utils/knowledgeBaseManager');

const sampleSystems = [
  {
    name: 'Production Web Server',
    ip: '192.168.1.100',
    status: 'online',
    os: 'Ubuntu 22.04',
    owner: 'DevOps Team',
    description: 'Servidor web principal de produção',
    environment: 'production',
    uptime: '45 days',
    port: 443,
    protocol: 'https',
    tags: ['web', 'production', 'critical'],
    monitoringEnabled: true,
    alertsEnabled: true
  },
  {
    name: 'Database Server',
    ip: '192.168.1.101',
    status: 'online',
    os: 'CentOS 7',
    owner: 'Database Team',
    description: 'Servidor de base de dados MySQL principal',
    environment: 'production',
    uptime: '30 days',
    port: 3306,
    protocol: 'other',
    tags: ['database', 'mysql', 'production'],
    monitoringEnabled: true,
    alertsEnabled: true
  },
  {
    name: 'Staging Web Server',
    ip: '192.168.1.200',
    status: 'online',
    os: 'Ubuntu 22.04',
    owner: 'Development Team',
    description: 'Servidor de staging para testes',
    environment: 'staging',
    uptime: '15 days',
    port: 80,
    protocol: 'http',
    tags: ['web', 'staging', 'testing'],
    monitoringEnabled: true,
    alertsEnabled: false
  },
  {
    name: 'Development API Server',
    ip: '192.168.1.300',
    status: 'maintenance',
    os: 'Windows Server 2019',
    owner: 'API Team',
    description: 'Servidor de API de desenvolvimento',
    environment: 'development',
    uptime: '5 days',
    port: 8080,
    protocol: 'http',
    tags: ['api', 'development', 'nodejs'],
    monitoringEnabled: false,
    alertsEnabled: false
  },
  {
    name: 'File Storage Server',
    ip: '192.168.1.150',
    status: 'offline',
    os: 'FreeBSD 13',
    owner: 'Infrastructure Team',
    description: 'Servidor de armazenamento de ficheiros',
    environment: 'production',
    uptime: '0 days',
    port: 21,
    protocol: 'ftp',
    tags: ['storage', 'ftp', 'files'],
    monitoringEnabled: true,
    alertsEnabled: true
  }
];

const createSampleSystems = async () => {
  try {
    // Conectar à base de dados
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Conectado à base de dados MongoDB');

    // Encontrar um admin para ser o criador
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ Nenhum administrador encontrado. Execute "npm run create-admin" primeiro.');
      process.exit(1);
    }

    console.log(`👤 Usando admin: ${admin.username}`);

    // Verificar se já existem sistemas
    const existingSystems = await System.countDocuments();
    if (existingSystems > 0) {
      console.log(`⚠️  Já existem ${existingSystems} sistemas na base de dados.`);
      console.log('Deseja continuar? Os IPs duplicados serão ignorados.');
    }

    let created = 0;
    let skipped = 0;

    for (const systemData of sampleSystems) {
      try {
        // Verificar se IP já existe
        const existingSystem = await System.findOne({ ip: systemData.ip });
        if (existingSystem) {
          console.log(`⏭️  Sistema com IP ${systemData.ip} já existe: ${existingSystem.name}`);
          skipped++;
          continue;
        }

        // Gerar slug único para o sistema
        const slug = await generateUniqueSlug(systemData.name);

        // Criar sistema
        const system = new System({
          ...systemData,
          slug,
          createdBy: admin._id,
          updatedBy: admin._id
        });

        await system.save();

        // Criar diretório na knowledge_base
        try {
          await createSystemDirectory(slug, systemData.name);
          console.log(`✅ Sistema criado: ${system.name} (${system.ip}) - Diretório: ${slug}`);
        } catch (dirError) {
          console.log(`⚠️  Sistema criado: ${system.name} (${system.ip}) - Erro no diretório: ${dirError.message}`);
        }
        
        created++;

      } catch (error) {
        console.log(`❌ Erro ao criar sistema ${systemData.name}: ${error.message}`);
        skipped++;
      }
    }

    console.log('\n📊 Resumo:');
    console.log(`✅ Criados: ${created}`);
    console.log(`⏭️  Ignorados: ${skipped}`);
    console.log(`📝 Total na BD: ${await System.countDocuments()}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado da base de dados');
    process.exit(0);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  createSampleSystems();
}

module.exports = createSampleSystems; 