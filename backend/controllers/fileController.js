const fs = require('fs').promises;
const path = require('path');
const {
  listSystemFiles,
  getFileInfo,
  removeFile,
  fileExists,
  getDirectoryStats,
  KNOWLEDGE_BASE_PATH
} = require('../utils/knowledgeBaseManager');
const System = require('../models/System');

/**
 * Upload de ficheiro único
 */
const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum ficheiro foi enviado'
      });
    }

    const { systemSlug } = req.params;
    const { description } = req.body;

    // Informações do ficheiro carregado
    const fileInfo = {
      name: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      path: req.file.path,
      systemSlug,
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
      description: description || null
    };

    console.log(`📁 Ficheiro carregado: ${systemSlug}/${req.file.filename}`);

    res.status(201).json({
      success: true,
      message: 'Ficheiro carregado com sucesso',
      data: {
        file: fileInfo
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload de ficheiro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Upload de múltiplos ficheiros
 */
const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum ficheiro foi enviado'
      });
    }

    const { systemSlug } = req.params;
    const { description } = req.body;

    // Informações dos ficheiros carregados
    const filesInfo = req.files.map(file => ({
      name: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      path: file.path,
      systemSlug,
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
      description: description || null
    }));

    console.log(`📁 ${req.files.length} ficheiros carregados para: ${systemSlug}`);

    res.status(201).json({
      success: true,
      message: `${req.files.length} ficheiros carregados com sucesso`,
      data: {
        files: filesInfo,
        totalFiles: req.files.length,
        totalSize: req.files.reduce((sum, file) => sum + file.size, 0)
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload de múltiplos ficheiros:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Listar ficheiros de um sistema
 */
const listFiles = async (req, res) => {
  try {
    const { systemSlug } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = 'modifiedAt',
      sortOrder = 'desc',
      fileType,
      search
    } = req.query;

    // Obter lista de ficheiros
    let files = await listSystemFiles(systemSlug);

    // Filtrar por tipo se especificado
    if (fileType) {
      files = files.filter(file => {
        const ext = file.extension.toLowerCase();
        switch (fileType) {
          case 'image':
            return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(ext);
          case 'document':
            return ['.pdf', '.doc', '.docx', '.txt', '.rtf'].includes(ext);
          case 'spreadsheet':
            return ['.xls', '.xlsx', '.csv'].includes(ext);
          case 'archive':
            return ['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext);
          case 'text':
            return ['.txt', '.md', '.json', '.xml', '.log'].includes(ext);
          default:
            return true;
        }
      });
    }

    // Filtrar por pesquisa se especificado
    if (search) {
      const searchLower = search.toLowerCase();
      files = files.filter(file => 
        file.name.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar
    files.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'size') {
        aValue = parseInt(aValue);
        bValue = parseInt(bValue);
      } else if (sortBy === 'createdAt' || sortBy === 'modifiedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else {
        aValue = aValue.toString().toLowerCase();
        bValue = bValue.toString().toLowerCase();
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedFiles = files.slice(startIndex, endIndex);

    // Estatísticas do diretório
    const stats = await getDirectoryStats(systemSlug);

    res.json({
      success: true,
      message: 'Lista de ficheiros obtida com sucesso',
      data: {
        files: paginatedFiles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(files.length / limit),
          totalFiles: files.length,
          hasNext: endIndex < files.length,
          hasPrev: page > 1
        },
        stats,
        filters: {
          fileType,
          search,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar ficheiros:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Obter informações de ficheiro específico
 */
const getFileDetails = async (req, res) => {
  try {
    const { systemSlug, fileName } = req.params;

    const fileInfo = await getFileInfo(systemSlug, fileName);

    res.json({
      success: true,
      message: 'Informações do ficheiro obtidas com sucesso',
      data: {
        file: fileInfo
      }
    });

  } catch (error) {
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    console.error('❌ Erro ao obter informações do ficheiro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Download de ficheiro
 */
const downloadFile = async (req, res) => {
  try {
    const { systemSlug, fileName } = req.params;

    // Verificar se ficheiro existe
    const exists = await fileExists(systemSlug, fileName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Ficheiro não encontrado'
      });
    }

    // Obter informações do ficheiro
    const fileInfo = await getFileInfo(systemSlug, fileName);
    const filePath = path.join(KNOWLEDGE_BASE_PATH, systemSlug, fileName);

    // Configurar headers para download
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileInfo.size);

    // Stream do ficheiro
    const readStream = require('fs').createReadStream(filePath);
    readStream.pipe(res);

    console.log(`📥 Download: ${systemSlug}/${fileName} por ${req.user.username}`);

  } catch (error) {
    console.error('❌ Erro no download:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Visualizar ficheiro (para ficheiros de texto/imagem)
 */
const viewFile = async (req, res) => {
  try {
    const { systemSlug, fileName } = req.params;

    // Verificar se ficheiro existe
    const exists = await fileExists(systemSlug, fileName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Ficheiro não encontrado'
      });
    }

    // Obter informações do ficheiro
    const fileInfo = await getFileInfo(systemSlug, fileName);
    const filePath = path.join(KNOWLEDGE_BASE_PATH, systemSlug, fileName);

    // Verificar se é um tipo de ficheiro visualizável
    const viewableTypes = [
      'text/plain',
      'text/csv',
      'application/json',
      'text/html',
      'text/css',
      'text/javascript',
      'application/xml'
    ];

    const isImage = fileInfo.mimeType.startsWith('image/');
    const isText = viewableTypes.includes(fileInfo.mimeType);

    if (!isImage && !isText) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de ficheiro não suportado para visualização',
        supportedTypes: [...viewableTypes, 'image/*']
      });
    }

    // Para imagens, enviar o ficheiro diretamente
    if (isImage) {
      res.setHeader('Content-Type', fileInfo.mimeType);
      const readStream = require('fs').createReadStream(filePath);
      return readStream.pipe(res);
    }

    // Para ficheiros de texto, ler conteúdo
    if (isText) {
      const content = await fs.readFile(filePath, 'utf8');
      return res.json({
        success: true,
        message: 'Conteúdo do ficheiro obtido com sucesso',
        data: {
          file: fileInfo,
          content: content
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro na visualização:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Remover ficheiro
 */
const deleteFile = async (req, res) => {
  try {
    const { systemSlug, fileName } = req.params;

    // Verificar se ficheiro existe
    const exists = await fileExists(systemSlug, fileName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Ficheiro não encontrado'
      });
    }

    // Obter informações antes de remover
    const fileInfo = await getFileInfo(systemSlug, fileName);

    // Remover ficheiro
    const removed = await removeFile(systemSlug, fileName);

    if (removed) {
      console.log(`🗑️ Ficheiro removido: ${systemSlug}/${fileName} por ${req.user.username}`);
      
      res.json({
        success: true,
        message: 'Ficheiro removido com sucesso',
        data: {
          file: {
            name: fileName,
            size: fileInfo.size,
            systemSlug,
            deletedAt: new Date(),
            deletedBy: {
              id: req.user._id,
              username: req.user.username
            }
          }
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao remover ficheiro'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao remover ficheiro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Obter estatísticas do diretório do sistema
 */
const getStats = async (req, res) => {
  try {
    const { systemSlug } = req.params;

    const stats = await getDirectoryStats(systemSlug);

    res.json({
      success: true,
      message: 'Estatísticas obtidas com sucesso',
      data: {
        systemSlug,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Remover múltiplos ficheiros
 */
const deleteMultipleFiles = async (req, res) => {
  try {
    const { systemSlug } = req.params;
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de ficheiros é obrigatória'
      });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const fileName of files) {
      try {
        const exists = await fileExists(systemSlug, fileName);
        if (!exists) {
          results.push({
            fileName,
            success: false,
            error: 'Ficheiro não encontrado'
          });
          failed++;
          continue;
        }

        const removed = await removeFile(systemSlug, fileName);
        if (removed) {
          results.push({
            fileName,
            success: true
          });
          successful++;
        } else {
          results.push({
            fileName,
            success: false,
            error: 'Erro ao remover ficheiro'
          });
          failed++;
        }
      } catch (error) {
        results.push({
          fileName,
          success: false,
          error: error.message
        });
        failed++;
      }
    }

    console.log(`🗑️ Remoção em lote: ${successful} sucessos, ${failed} falhas em ${systemSlug}`);

    res.json({
      success: true,
      message: `Operação concluída: ${successful} sucessos, ${failed} falhas`,
      data: {
        results,
        summary: {
          total: files.length,
          successful,
          failed
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro na remoção múltipla:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  listFiles,
  getFileDetails,
  downloadFile,
  viewFile,
  deleteFile,
  getStats,
  deleteMultipleFiles
};