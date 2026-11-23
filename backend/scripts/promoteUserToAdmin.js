require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const promoteUserToAdmin = async (username) => {
  try {
    // Conectar à base de dados
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado à base de dados MongoDB');

    // Procurar utilizador por username ou email
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: username }
      ]
    });

    if (!user) {
      console.log(`❌ Utilizador "${username}" não encontrado`);
      console.log('💡 Verifique se o username ou email está correto');
      process.exit(1);
    }

    // Verificar se já é admin
    if (user.role === 'admin') {
      console.log(`ℹ️  O utilizador "${user.username}" (${user.email}) já é administrador`);
      process.exit(0);
    }

    // Promover a admin
    user.role = 'admin';
    await user.save();

    console.log('✅ Utilizador promovido a administrador com sucesso!');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Display Name:', user.displayName || 'N/A');

  } catch (error) {
    console.error('❌ Erro ao promover utilizador:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔒 Desconectado da base de dados');
    process.exit(0);
  }
};

// Obter username dos argumentos da linha de comando
const username = process.argv[2];

if (!username) {
  console.log('❌ Uso: node promoteUserToAdmin.js <username ou email>');
  console.log('Exemplo: node promoteUserToAdmin.js hasbarbosa');
  process.exit(1);
}

// Executar
promoteUserToAdmin(username);
