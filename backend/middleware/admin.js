const adminMiddleware = (req, res, next) => {
  try {
    // Verifica se utilizador está autenticado (deve vir após authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária'
      });
    }

    // Verifica se utilizador é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissões de administrador necessárias.'
      });
    }

    // Verifica se admin não está bloqueado
    if (req.user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Conta de administrador bloqueada'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

module.exports = adminMiddleware; 