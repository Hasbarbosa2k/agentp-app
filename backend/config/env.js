/**
 * Validação e carregamento de variáveis de ambiente
 * Este ficheiro deve ser importado no início do server.js
 */

require('dotenv').config();

// Variáveis obrigatórias
const REQUIRED_ENV = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

// Variáveis opcionais com valores default
const OPTIONAL_ENV = {
  PORT: 3000,
  NODE_ENV: 'development',
  FRONTEND_URL: 'http://localhost:5173',
  MONITORING_ENABLED: 'true',
  JWT_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d'
};

/**
 * Valida variáveis de ambiente obrigatórias
 * @throws {Error} Se alguma variável obrigatória estiver em falta
 */
function validateEnv() {
  const missing = [];
  
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias em falta:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nCrie um ficheiro .env com estas variáveis ou defina-as no ambiente.');
    process.exit(1);
  }
  
  // Aplicar valores default para opcionais
  for (const [key, defaultValue] of Object.entries(OPTIONAL_ENV)) {
    if (!process.env[key]) {
      process.env[key] = String(defaultValue);
    }
  }
  
  // Validar formato do MONGODB_URI
  if (!process.env.MONGODB_URI.startsWith('mongodb')) {
    console.error('❌ MONGODB_URI deve começar com "mongodb://" ou "mongodb+srv://"');
    process.exit(1);
  }
  
  // Validar segurança dos JWT secrets em produção
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_ACCESS_SECRET.length < 32) {
      console.error('❌ JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres em produção');
      process.exit(1);
    }
    if (process.env.JWT_REFRESH_SECRET.length < 32) {
      console.error('❌ JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres em produção');
      process.exit(1);
    }
  }
  
  console.log('✅ Variáveis de ambiente validadas');
}

/**
 * Retorna configuração do ambiente atual
 */
function getEnvConfig() {
  return {
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',
    mongoUri: process.env.MONGODB_URI,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '15m',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    frontendUrl: process.env.FRONTEND_URL,
    monitoringEnabled: process.env.MONITORING_ENABLED !== 'false'
  };
}

module.exports = {
  validateEnv,
  getEnvConfig,
  REQUIRED_ENV,
  OPTIONAL_ENV
};
