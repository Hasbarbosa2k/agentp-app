require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const initializeSettings = async () => {
  try {
    // Conectar à base de dados
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Conectado à base de dados MongoDB');

    // Verificar se já existem configurações
    const existingSettings = await Settings.findOne();
    if (existingSettings) {
      console.log('✅ Configurações já existem no sistema');
      console.log('📋 Resumo das configurações atuais:');
      console.log(`   - Versão: ${existingSettings.version}`);
      console.log(`   - Backup: ${existingSettings.database.backupFrequency}`);
      console.log(`   - Tema padrão: ${existingSettings.system.appearance?.defaultTheme || 'Não definido'}`);
      console.log(`   - Modo manutenção: ${existingSettings.system.maintenanceMode ? 'Ativo' : 'Inativo'}`);
      console.log(`   - Última atualização: ${existingSettings.lastUpdated}`);
      process.exit(0);
    }

    // Configurações padrão do sistema
    const defaultSettings = {
      // Database settings
      database: {
        backupFrequency: 'daily',
        autoCleanupOldTests: true,
        retentionPeriodDays: 90
      },
      
      // Security settings
      security: {
        sessionTimeoutMinutes: 1440, // 24 hours
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15,
        requirePasswordChange: false,
        passwordChangeDays: 90
      },
      
      // System settings
      system: {
        maintenanceMode: false,
        maintenanceMessage: 'Sistema em manutenção. Tente novamente mais tarde.',
        maxUsersAllowed: 1000,
        allowUserRegistration: true,
        appearance: {
          defaultTheme: 'dark',
          defaultAccentColor: '#3b82f6',
          allowUserCustomization: true
        },
        advanced: {
          debugModeGlobal: false
        }
      },
      
      // Notification settings
      notifications: {
        emailEnabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        emailFrom: 'noreply@agentp.com',
        alertThresholds: {
          systemOfflineMinutes: 5,
          diskUsagePercentage: 85,
          memoryUsagePercentage: 90
        }
      },
      
      // Monitoring settings
      monitoring: {
        enabled: true,
        checkIntervalMinutes: 5,
        logLevel: 'info',
        retainLogsDays: 30
      },
      
      // Version and metadata
      version: '1.0.0',
      lastUpdated: new Date()
    };

    // Criar as configurações
    const settings = new Settings(defaultSettings);
    await settings.save();

    console.log('✅ Configurações padrão criadas com sucesso!');
    console.log('');
    console.log('📋 Configurações criadas:');
    console.log('');
    
    console.log('🗄️  Base de Dados:');
    console.log(`   • Frequência de backup: ${settings.database.backupFrequency}`);
    console.log(`   • Limpeza automática: ${settings.database.autoCleanupOldTests ? 'Ativa' : 'Inativa'}`);
    console.log(`   • Retenção: ${settings.database.retentionPeriodDays} dias`);
    console.log('');
    
    console.log('🔒 Segurança:');
    console.log(`   • Timeout de sessão: ${settings.security.sessionTimeoutMinutes} minutos`);
    console.log(`   • Max tentativas login: ${settings.security.maxLoginAttempts}`);
    console.log(`   • Duração do bloqueio: ${settings.security.lockoutDurationMinutes} minutos`);
    console.log('');
    
    console.log('🎨 Aparência:');
    console.log(`   • Tema padrão: ${settings.system.appearance.defaultTheme}`);
    console.log(`   • Cor de destaque: ${settings.system.appearance.defaultAccentColor}`);
    console.log(`   • Personalização: ${settings.system.appearance.allowUserCustomization ? 'Permitida' : 'Bloqueada'}`);
    console.log('');
    
    console.log('📊 Monitorização:');
    console.log(`   • Status: ${settings.monitoring.enabled ? 'Ativa' : 'Inativa'}`);
    console.log(`   • Intervalo de verificação: ${settings.monitoring.checkIntervalMinutes} minutos`);
    console.log(`   • Nível de logs: ${settings.monitoring.logLevel}`);
    console.log(`   • Retenção de logs: ${settings.monitoring.retainLogsDays} dias`);
    console.log('');
    
    console.log('📧 Notificações:');
    console.log(`   • Email: ${settings.notifications.emailEnabled ? 'Ativo' : 'Inativo'}`);
    console.log(`   • SMTP Host: ${settings.notifications.smtpHost}:${settings.notifications.smtpPort}`);
    console.log(`   • Email remetente: ${settings.notifications.emailFrom}`);
    console.log('');
    
    console.log('⚙️  Sistema:');
    console.log(`   • Modo manutenção: ${settings.system.maintenanceMode ? 'Ativo' : 'Inativo'}`);
    console.log(`   • Registo permitido: ${settings.system.allowUserRegistration ? 'Sim' : 'Não'}`);
    console.log(`   • Máx. utilizadores: ${settings.system.maxUsersAllowed}`);
    console.log(`   • Debug global: ${settings.system.advanced.debugModeGlobal ? 'Ativo' : 'Inativo'}`);
    console.log('');
    
    console.log('📌 Versão: ' + settings.version);
    console.log('📅 Criado em: ' + settings.createdAt.toLocaleString('pt-PT'));
    console.log('');
    
    console.log('🎯 Próximos passos:');
    console.log('   1. Configure o SMTP para notificações por email');
    console.log('   2. Ajuste as configurações conforme necessário via API');
    console.log('   3. Execute backups regulares das configurações');
    console.log('');
    
    console.log('💡 Dicas:');
    console.log('   • Use GET /settings para ver todas as configurações');
    console.log('   • Use PUT /settings/[seção] para atualizar configurações específicas');
    console.log('   • Use GET /settings/export para fazer backup das configurações');
    console.log('   • Documentação completa em http://localhost:3000/api-docs');

  } catch (error) {
    console.error('❌ Erro ao criar configurações padrão:', error.message);
    if (error.name === 'ValidationError') {
      console.error('📋 Detalhes do erro:');
      Object.values(error.errors).forEach(err => {
        console.error(`   • ${err.path}: ${err.message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado da base de dados');
    process.exit(0);
  }
};

// Função para resetar configurações (usar com cuidado!)
const resetSettings = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const result = await Settings.deleteMany({});
    console.log(`🗑️  ${result.deletedCount} configuração(ões) removida(s)`);
    console.log('⚠️  Execute novamente o script para criar configurações padrão');
    
  } catch (error) {
    console.error('❌ Erro ao resetar configurações:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--reset') || args.includes('-r')) {
  console.log('⚠️  ATENÇÃO: Vai remover TODAS as configurações existentes!');
  console.log('🤔 Tem certeza? Execute novamente com --confirm para confirmar');
  
  if (args.includes('--confirm')) {
    resetSettings();
  } else {
    process.exit(1);
  }
} else {
  initializeSettings();
} 