const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');

// Caminho para a pasta knowledge_base na raiz do projeto
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '..', 'knowledge_base');

/**
 * Garante que o diretório knowledge_base existe
 */
async function ensureKnowledgeBaseExists() {
  try {
    await fs.access(KNOWLEDGE_BASE_PATH);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📁 Criando diretório knowledge_base...');
      await fs.mkdir(KNOWLEDGE_BASE_PATH, { recursive: true });
      
      // Criar arquivo README.md explicativo
      const readmeContent = `# Knowledge Base

Esta pasta contém os diretórios de cada sistema criado na plataforma.

## Estrutura

Cada sistema tem seu próprio diretório nomeado com o slug do sistema:
- \`sistema-exemplo/\` - Diretório para o sistema "Sistema Exemplo"
- \`servidor-web/\` - Diretório para o sistema "Servidor Web"

## Uso

Os diretórios são criados automaticamente quando um sistema é adicionado.
Aqui serão armazenados ficheiros relacionados a cada sistema específico.

---
*Pasta criada automaticamente pelo sistema*
`;
      
      await fs.writeFile(path.join(KNOWLEDGE_BASE_PATH, 'README.md'), readmeContent, 'utf8');
      console.log('✅ Diretório knowledge_base criado com sucesso');
    } else {
      throw error;
    }
  }
}

/**
 * Cria um diretório para um sistema específico
 * @param {string} slug - Slug único do sistema
 * @param {string} systemName - Nome do sistema (para documentação)
 * @returns {Promise<string>} - Caminho do diretório criado
 */
async function createSystemDirectory(slug, systemName) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Slug deve ser uma string válida');
  }

  // Garantir que knowledge_base existe
  await ensureKnowledgeBaseExists();

  const systemDirPath = path.join(KNOWLEDGE_BASE_PATH, slug);

  try {
    // Verificar se o diretório já existe
    await fs.access(systemDirPath);
    console.log(`⚠️  Diretório já existe: ${slug}`);
    return systemDirPath;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Diretório não existe, criar
      await fs.mkdir(systemDirPath, { recursive: true });
      
      // Criar arquivo .info com metadata do sistema
      const infoContent = {
        systemName: systemName,
        slug: slug,
        createdAt: new Date().toISOString(),
        description: `Diretório para ficheiros do sistema: ${systemName}`
      };

      await fs.writeFile(
        path.join(systemDirPath, '.info.json'),
        JSON.stringify(infoContent, null, 2),
        'utf8'
      );

      console.log(`✅ Diretório criado para sistema: ${slug}`);
      return systemDirPath;
    } else {
      throw error;
    }
  }
}

/**
 * Remove o diretório de um sistema (quando sistema é removido)
 * @param {string} slug - Slug do sistema
 * @returns {Promise<boolean>} - True se removido com sucesso
 */
async function removeSystemDirectory(slug) {
  if (!slug || typeof slug !== 'string') {
    console.warn('Slug inválido para remoção de diretório');
    return false;
  }

  const systemDirPath = path.join(KNOWLEDGE_BASE_PATH, slug);

  try {
    await fs.access(systemDirPath);
    
    // Remover diretório e todo o conteúdo
    await fs.rm(systemDirPath, { recursive: true, force: true });
    console.log(`🗑️  Diretório removido: ${slug}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`ℹ️  Diretório não existe: ${slug}`);
      return true; // Consideramos sucesso se já não existe
    } else {
      console.error(`❌ Erro ao remover diretório ${slug}:`, error);
      return false;
    }
  }
}

/**
 * Renomeia o diretório de um sistema (quando slug muda)
 * @param {string} oldSlug - Slug antigo
 * @param {string} newSlug - Novo slug
 * @param {string} systemName - Nome do sistema (para atualizar .info.json)
 * @returns {Promise<boolean>} - True se renomeado com sucesso
 */
async function renameSystemDirectory(oldSlug, newSlug, systemName) {
  if (!oldSlug || !newSlug || oldSlug === newSlug) {
    return true; // Nada a fazer
  }

  const oldPath = path.join(KNOWLEDGE_BASE_PATH, oldSlug);
  const newPath = path.join(KNOWLEDGE_BASE_PATH, newSlug);

  try {
    // Verificar se diretório antigo existe
    await fs.access(oldPath);
    
    // Verificar se novo caminho já existe
    try {
      await fs.access(newPath);
      throw new Error(`Diretório de destino já existe: ${newSlug}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Renomear diretório
    await fs.rename(oldPath, newPath);

    // Atualizar arquivo .info.json
    const infoPath = path.join(newPath, '.info.json');
    try {
      const infoContent = JSON.parse(await fs.readFile(infoPath, 'utf8'));
      infoContent.slug = newSlug;
      infoContent.systemName = systemName;
      infoContent.lastUpdated = new Date().toISOString();
      
      await fs.writeFile(infoPath, JSON.stringify(infoContent, null, 2), 'utf8');
    } catch (infoError) {
      console.warn('⚠️  Erro ao atualizar .info.json:', infoError.message);
    }

    console.log(`📁 Diretório renomeado: ${oldSlug} → ${newSlug}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`ℹ️  Diretório antigo não existe: ${oldSlug}`);
      // Criar novo diretório
      await createSystemDirectory(newSlug, systemName);
      return true;
    } else {
      console.error(`❌ Erro ao renomear diretório ${oldSlug} → ${newSlug}:`, error);
      return false;
    }
  }
}

/**
 * Lista todos os diretórios de sistemas
 * @returns {Promise<Array>} - Lista de diretórios
 */
async function listSystemDirectories() {
  try {
    await ensureKnowledgeBaseExists();
    
    const entries = await fs.readdir(KNOWLEDGE_BASE_PATH, { withFileTypes: true });
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    return directories;
  } catch (error) {
    console.error('❌ Erro ao listar diretórios de sistemas:', error);
    return [];
  }
}

/**
 * Obtém informações de um diretório de sistema
 * @param {string} slug - Slug do sistema
 * @returns {Promise<Object|null>} - Informações do diretório
 */
async function getSystemDirectoryInfo(slug) {
  const systemDirPath = path.join(KNOWLEDGE_BASE_PATH, slug);
  const infoPath = path.join(systemDirPath, '.info.json');

  try {
    const infoContent = await fs.readFile(infoPath, 'utf8');
    return JSON.parse(infoContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Lista ficheiros de um sistema específico
 * @param {string} slug - Slug do sistema
 * @returns {Promise<Array>} - Lista de ficheiros com metadata
 */
async function listSystemFiles(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Slug deve ser uma string válida');
  }

  const systemDirPath = path.join(KNOWLEDGE_BASE_PATH, slug);

  try {
    await fs.access(systemDirPath);
    
    const entries = await fs.readdir(systemDirPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (entry.isFile() && !entry.name.startsWith('.')) {
        const filePath = path.join(systemDirPath, entry.name);
        const stats = await fs.stat(filePath);
        
        files.push({
          name: entry.name,
          size: stats.size,
          mimeType: mime.lookup(entry.name) || 'application/octet-stream',
          extension: path.extname(entry.name),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          relativePath: entry.name
        });
      }
    }

    return files.sort((a, b) => b.modifiedAt - a.modifiedAt);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Diretório do sistema não encontrado: ${slug}`);
    }
    throw error;
  }
}

/**
 * Obtém informações de um ficheiro específico
 * @param {string} slug - Slug do sistema
 * @param {string} fileName - Nome do ficheiro
 * @returns {Promise<Object>} - Informações do ficheiro
 */
async function getFileInfo(slug, fileName) {
  if (!slug || !fileName) {
    throw new Error('Slug e nome do ficheiro são obrigatórios');
  }

  const filePath = path.join(KNOWLEDGE_BASE_PATH, slug, fileName);

  try {
    const stats = await fs.stat(filePath);
    
    return {
      name: fileName,
      size: stats.size,
      mimeType: mime.lookup(fileName) || 'application/octet-stream',
      extension: path.extname(fileName),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      absolutePath: filePath,
      relativePath: fileName
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Ficheiro não encontrado: ${fileName}`);
    }
    throw error;
  }
}

/**
 * Remove um ficheiro específico
 * @param {string} slug - Slug do sistema
 * @param {string} fileName - Nome do ficheiro
 * @returns {Promise<boolean>} - True se removido com sucesso
 */
async function removeFile(slug, fileName) {
  if (!slug || !fileName) {
    throw new Error('Slug e nome do ficheiro são obrigatórios');
  }

  // Validação de segurança - evitar path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Nome de ficheiro inválido');
  }

  const filePath = path.join(KNOWLEDGE_BASE_PATH, slug, fileName);

  try {
    await fs.unlink(filePath);
    console.log(`🗑️ Ficheiro removido: ${slug}/${fileName}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`ℹ️ Ficheiro não existe: ${slug}/${fileName}`);
      return true; // Consideramos sucesso se já não existe
    } else {
      console.error(`❌ Erro ao remover ficheiro ${slug}/${fileName}:`, error);
      return false;
    }
  }
}

/**
 * Verifica se um ficheiro existe
 * @param {string} slug - Slug do sistema
 * @param {string} fileName - Nome do ficheiro
 * @returns {Promise<boolean>} - True se o ficheiro existe
 */
async function fileExists(slug, fileName) {
  if (!slug || !fileName) {
    return false;
  }

  const filePath = path.join(KNOWLEDGE_BASE_PATH, slug, fileName);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calcula o tamanho total dos ficheiros de um sistema
 * @param {string} slug - Slug do sistema
 * @returns {Promise<Object>} - Estatísticas do diretório
 */
async function getDirectoryStats(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Slug deve ser uma string válida');
  }

  const systemDirPath = path.join(KNOWLEDGE_BASE_PATH, slug);

  try {
    const files = await listSystemFiles(slug);
    
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      fileTypes: {},
      oldestFile: null,
      newestFile: null
    };

    // Agrupar por tipo de ficheiro
    files.forEach(file => {
      const ext = file.extension || 'sem-extensao';
      stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
    });

    // Ficheiro mais antigo e mais recente
    if (files.length > 0) {
      stats.oldestFile = files.reduce((oldest, file) => 
        file.createdAt < oldest.createdAt ? file : oldest
      );
      stats.newestFile = files.reduce((newest, file) => 
        file.createdAt > newest.createdAt ? file : newest
      );
    }

    return stats;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {},
        oldestFile: null,
        newestFile: null
      };
    }
    throw error;
  }
}

/**
 * Valida se um ficheiro pode ser carregado
 * @param {string} fileName - Nome do ficheiro
 * @param {number} fileSize - Tamanho do ficheiro em bytes
 * @param {Array} allowedTypes - Tipos MIME permitidos (opcional)
 * @param {number} maxSize - Tamanho máximo em bytes (opcional)
 * @returns {Object} - Resultado da validação
 */
function validateFile(fileName, fileSize, allowedTypes = null, maxSize = 50 * 1024 * 1024) {
  const result = {
    valid: true,
    errors: []
  };

  // Validar nome do ficheiro
  if (!fileName || typeof fileName !== 'string') {
    result.valid = false;
    result.errors.push('Nome do ficheiro é obrigatório');
    return result;
  }

  // Evitar path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    result.valid = false;
    result.errors.push('Nome de ficheiro contém caracteres inválidos');
  }

  // Validar caracteres especiais
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
    result.valid = false;
    result.errors.push('Nome de ficheiro contém caracteres não permitidos');
  }

  // Validar tamanho
  if (fileSize > maxSize) {
    result.valid = false;
    result.errors.push(`Ficheiro muito grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Validar tipo MIME se especificado
  if (allowedTypes && allowedTypes.length > 0) {
    const fileMimeType = mime.lookup(fileName);
    if (!fileMimeType || !allowedTypes.includes(fileMimeType)) {
      result.valid = false;
      result.errors.push(`Tipo de ficheiro não permitido. Permitidos: ${allowedTypes.join(', ')}`);
    }
  }

  return result;
}

module.exports = {
  ensureKnowledgeBaseExists,
  createSystemDirectory,
  removeSystemDirectory,
  renameSystemDirectory,
  listSystemDirectories,
  getSystemDirectoryInfo,
  listSystemFiles,
  getFileInfo,
  removeFile,
  fileExists,
  getDirectoryStats,
  validateFile,
  KNOWLEDGE_BASE_PATH
};