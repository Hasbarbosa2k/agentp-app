/**
 * Utilitário para tratamento seguro de erros
 * Não expõe detalhes internos em produção
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Formata resposta de erro de forma segura
 * @param {Error} error - Objeto de erro
 * @param {string} defaultMessage - Mensagem default para produção
 * @returns {Object} Objeto formatado para resposta
 */
const formatError = (error, defaultMessage = 'Erro interno do servidor') => {
  if (isProduction) {
    return {
      success: false,
      message: defaultMessage
    };
  }
  
  // Em desenvolvimento, incluir detalhes
  return {
    success: false,
    message: defaultMessage,
    error: error.message,
    stack: error.stack
  };
};

/**
 * Determina código HTTP baseado no tipo de erro
 * @param {Error} error - Objeto de erro
 * @returns {number} Código HTTP
 */
const getHttpCode = (error) => {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('não encontrado') || message.includes('not found')) {
    return 404;
  }
  if (message.includes('já existe') || message.includes('já em progresso') || message.includes('duplicate')) {
    return 409;
  }
  if (message.includes('inválido') || message.includes('invalid') || message.includes('obrigatório')) {
    return 400;
  }
  if (message.includes('não autorizado') || message.includes('unauthorized')) {
    return 401;
  }
  if (message.includes('proibido') || message.includes('forbidden')) {
    return 403;
  }
  
  return 500;
};

/**
 * Handler de erro para controllers
 * @param {Object} res - Express response object
 * @param {Error} error - Erro capturado
 * @param {string} defaultMessage - Mensagem default
 * @param {number} [forceCode] - Forçar código HTTP específico
 */
const handleControllerError = (res, error, defaultMessage = 'Erro interno do servidor', forceCode = null) => {
  const statusCode = forceCode || getHttpCode(error);
  const response = formatError(error, defaultMessage);
  
  // Log interno (sempre completo)
  console.error(`❌ [${statusCode}] ${defaultMessage}:`, error.message);
  
  return res.status(statusCode).json(response);
};

module.exports = {
  formatError,
  getHttpCode,
  handleControllerError,
  isProduction
};
