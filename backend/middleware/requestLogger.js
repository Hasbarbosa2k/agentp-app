const crypto = require('crypto');

// Utility para mascarar dados sensíveis
const maskSensitiveData = (obj, sensitiveFields = ['password', 'token', 'authorization']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = { ...obj };
  
  for (const [key, value] of Object.entries(masked)) {
    const keyLower = key.toLowerCase();
    
    if (sensitiveFields.some(field => keyLower.includes(field))) {
      if (typeof value === 'string' && value.length > 0) {
        // Mostrar apenas os primeiros 4 caracteres + ***
        masked[key] = value.substring(0, 4) + '***';
      } else {
        masked[key] = '***';
      }
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, sensitiveFields);
    }
  }
  
  return masked;
};

// Gerar ID único para cada request
const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Middleware de logging simplificado - apenas essencial
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Adicionar ID ao request para tracking
  req.requestId = requestId;
  
  // Filtrar apenas endpoints importantes
  const importantEndpoints = ['/onboarding', '/templates', '/auth', '/systems', '/issue-helper', '/api/issue-helper', '/ai', '/api/ai'];
  const isImportant = importantEndpoints.some(endpoint => req.originalUrl.startsWith(endpoint));
  const isError404 = req.originalUrl.includes('socket.io') || req.originalUrl.includes('favicon');
  
  // Log de saída quando a resposta terminar
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Apenas logar erros importantes ou operações importantes
    if ((res.statusCode >= 400 && !isError404) || (isImportant && req.method !== 'GET')) {
      let statusEmoji = '✅';
      if (res.statusCode >= 400 && res.statusCode < 500) {
        statusEmoji = '⚠️';
      } else if (res.statusCode >= 500) {
        statusEmoji = '❌';
      }
      
      const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
      console.log(`[${logLevel}] ${statusEmoji} ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    }
  });

  next();
};

// Middleware para log de erros
const errorLogger = (err, req, res, next) => {
  console.log('\n💥 ERROR OCCURRED');
  console.log('='.repeat(80));
  console.log('🆔 Request ID:', req.requestId || 'unknown');
  console.log('❌ Error Message:', err.message);
  console.log('📍 Error Stack:');
  console.log(err.stack);
  console.log('🔗 Request:', req.method, req.originalUrl);
  console.log('📍 IP:', req.ip);
  console.log('🕐 Time:', new Date().toISOString());
  console.log('='.repeat(80));
  
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger,
  maskSensitiveData,
  generateRequestId
}; 