const System = require('../models/System');

/**
 * Gera um slug único a partir de um nome
 * @param {string} name - Nome para converter em slug
 * @returns {string} - Slug único
 */
function generateSlug(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Nome deve ser uma string válida');
  }

  // Converter para lowercase e remover caracteres especiais
  let slug = name
    .toLowerCase()
    .trim()
    // Substituir espaços e caracteres especiais por hífens
    .replace(/[^a-z0-9\s-]/g, '')
    // Substituir múltiplos espaços/hífens por um único hífen
    .replace(/[\s-]+/g, '-')
    // Remover hífens do início e fim
    .replace(/^-+|-+$/g, '');

  // Garantir que o slug não está vazio
  if (!slug) {
    slug = 'sistema';
  }

  // Limitar o tamanho do slug
  if (slug.length > 50) {
    slug = slug.substring(0, 50).replace(/-+$/, '');
  }

  return slug;
}

/**
 * Gera um slug único verificando duplicados na base de dados
 * @param {string} name - Nome para converter em slug
 * @param {string} excludeId - ID do sistema a excluir da verificação (para updates)
 * @returns {Promise<string>} - Slug único
 */
async function generateUniqueSlug(name, excludeId = null) {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  // Verificar se o slug já existe
  while (await slugExists(slug, excludeId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    // Prevenir loops infinitos
    if (counter > 999) {
      throw new Error('Não foi possível gerar um slug único');
    }
  }

  return slug;
}

/**
 * Verifica se um slug já existe na base de dados
 * @param {string} slug - Slug para verificar
 * @param {string} excludeId - ID do sistema a excluir da verificação
 * @returns {Promise<boolean>} - True se o slug existe
 */
async function slugExists(slug, excludeId = null) {
  try {
    const query = { slug, isActive: true };
    
    // Excluir um ID específico da verificação (útil para updates)
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingSystem = await System.findOne(query);
    return !!existingSystem;
  } catch (error) {
    console.error('Erro ao verificar slug:', error);
    return false;
  }
}

/**
 * Valida se um slug tem formato válido
 * @param {string} slug - Slug para validar
 * @returns {boolean} - True se o slug é válido
 */
function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Slug deve ter entre 1 e 50 caracteres
  if (slug.length < 1 || slug.length > 50) {
    return false;
  }

  // Slug deve conter apenas letras minúsculas, números e hífens
  // Não deve começar ou terminar com hífen
  const slugRegex = /^[a-z0-9]+([a-z0-9-]*[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

module.exports = {
  generateSlug,
  generateUniqueSlug,
  slugExists,
  isValidSlug
};