const multer = require('multer');
const path = require('path');
const { KNOWLEDGE_BASE_PATH, validateFile } = require('../utils/knowledgeBaseManager');
const System = require('../models/System');

// Configuração de armazenamento do Multer
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const { systemSlug } = req.params;
      
      if (!systemSlug) {
        return cb(new Error('Slug do sistema é obrigatório'), null);
      }

      // Verificar se o sistema existe
      const system = await System.findOne({ slug: systemSlug, isActive: true });
      if (!system) {
        return cb(new Error('Sistema não encontrado'), null);
      }

      // Definir destino como o diretório do sistema
      const destPath = path.join(KNOWLEDGE_BASE_PATH, systemSlug);
      cb(null, destPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    // Usar nome original ou nome personalizado se fornecido
    const customName = req.body.fileName;
    let finalName = customName || file.originalname;

    // Sanitizar nome do ficheiro
    finalName = finalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Adicionar timestamp se necessário para evitar conflitos
    const timestamp = Date.now();
    const ext = path.extname(finalName);
    const nameWithoutExt = path.basename(finalName, ext);
    
    // Se arquivo com mesmo nome já existe, adicionar timestamp
    if (req.body.addTimestamp === 'true') {
      finalName = `${nameWithoutExt}_${timestamp}${ext}`;
    }

    cb(null, finalName);
  }
});

// Filtro de ficheiros
const fileFilter = (req, file, cb) => {
  // Configurações padrão
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = req.body.allowedTypes ? req.body.allowedTypes.split(',') : null;

  // Validar ficheiro
  const validation = validateFile(
    file.originalname,
    file.size || 0,
    allowedTypes,
    maxSize
  );

  if (!validation.valid) {
    return cb(new Error(validation.errors.join('; ')), false);
  }

  cb(null, true);
};

// Configuração do Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // Máximo 10 ficheiros por upload
  }
});

/**
 * Middleware para upload de ficheiro único
 */
const uploadSingle = upload.single('file');

/**
 * Middleware para upload de múltiplos ficheiros
 */
const uploadMultiple = upload.array('files', 10);

/**
 * Middleware para tratar erros de upload
 */
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'Ficheiro muito grande',
          error: 'Tamanho máximo permitido: 50MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Muitos ficheiros',
          error: 'Máximo 10 ficheiros por upload'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Campo de ficheiro inesperado',
          error: 'Use "file" para um ficheiro ou "files" para múltiplos'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Erro no upload',
          error: error.message
        });
    }
  }

  // Outros erros
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro no upload',
      error: error.message
    });
  }

  next();
};

/**
 * Middleware para validar se o sistema existe antes do upload
 */
const validateSystemExists = async (req, res, next) => {
  try {
    const { systemSlug } = req.params;

    if (!systemSlug) {
      return res.status(400).json({
        success: false,
        message: 'Slug do sistema é obrigatório'
      });
    }

    // Verificar se o sistema existe e está ativo
    const system = await System.findOne({ slug: systemSlug, isActive: true });
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado ou inativo'
      });
    }

    // Adicionar sistema ao request para uso posterior
    req.system = system;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Middleware personalizado para configurações específicas de upload
 */
const configureUpload = (options = {}) => {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB padrão
    allowedTypes = null,
    maxFiles = 10
  } = options;

  return multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      const validation = validateFile(
        file.originalname,
        file.size || 0,
        allowedTypes,
        maxSize
      );

      if (!validation.valid) {
        return cb(new Error(validation.errors.join('; ')), false);
      }

      cb(null, true);
    },
    limits: {
      fileSize: maxSize,
      files: maxFiles
    }
  });
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadErrors,
  validateSystemExists,
  configureUpload,
  upload
};