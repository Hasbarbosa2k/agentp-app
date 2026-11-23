require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createFirstAdmin = async () => {
  try {
    // Conectar à base de dados
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Conectado à base de dados MongoDB');

    // Verificar se já existe um admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('❌ Já existe um administrador:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    // Dados do primeiro admin
    const adminData = {
      username: 'admin',
      email: 'admin@exemplo.com',
      password: 'Admin123!',
      role: 'admin'
    };

    // Criar o administrador
    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Primeiro administrador criado com sucesso!');
    console.log('Username:', admin.username);
    console.log('Email:', admin.email);
    console.log('Password:', 'Admin123!');
    console.log('Role:', admin.role);
    console.log('\n⚠️  IMPORTANTE: Altere a password após o primeiro login!');

  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado da base de dados');
    process.exit(0);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  createFirstAdmin();
}

module.exports = createFirstAdmin; 