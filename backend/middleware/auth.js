const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acesso em falta ou inválido' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Utilizador não encontrado ou inativo' 
      });
    }

    // Verificar se utilizador está bloqueado
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Conta bloqueada. Contacte o administrador.'
      });
    }

    req.user = user;
    if (typeof next === 'function') {
      next();
    } else {
      console.error('❌ next is not a function in authMiddleware');
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado' 
      });
    }

    console.error('❌ [AUTH] Unexpected error:', error.message, error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// Função de logging simplificada - apenas para endpoints importantes
const logRequest = (req, res, next) => {
  // Apenas logar endpoints importantes (onboarding, templates, auth)
  const importantEndpoints = ['/onboarding', '/templates', '/auth', '/systems', '/issue-helper', '/api/issue-helper', '/ai', '/api/ai'];
  const isImportant = importantEndpoints.some(endpoint => req.originalUrl.startsWith(endpoint));
  
  if (isImportant && req.method !== 'GET') {
    console.log(`🔗 ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
      // Criar cópia para log sem modificar o req.body original
      const safeBody = JSON.parse(JSON.stringify(req.body));
      if (safeBody.credentials && safeBody.credentials.password) {
        safeBody.credentials.password = '***';
      }
      if (safeBody.password) {
        safeBody.password = '***';
      }
      console.log(`📦 Body:`, safeBody);
    }
  }
  
  // Só chama next se for uma função (uso como middleware)
  if (typeof next === 'function') {
    next();
  }
};

module.exports = {
  authenticate: authMiddleware,
  authMiddleware,
  logRequest
}; 