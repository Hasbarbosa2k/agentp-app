/**
 * Utilitário para detectar sistema operativo via SSH
 */

/**
 * Detectar sistema operativo remotamente
 * @param {Object} sshService - Serviço SSH
 * @param {string} connectionId - ID da conexão SSH
 * @returns {Promise<Object>} Informações do OS detectado
 */
async function detectOS(sshService, connectionId) {
  console.log('🔍 Iniciando detecção do sistema operativo...');
  
  const osInfo = {
    id: null,
    version: null,
    like: null,
    name: null,
    prettyName: null,
    versionCodename: null,
    architecture: null,
    kernel: null,
    detectionMethod: null,
    raw: {}
  };

  try {
    // 1. Tentar detectar via /etc/os-release (padrão moderno)
    const osReleaseResult = await tryDetectOSRelease(sshService, connectionId);
    if (osReleaseResult.success) {
      Object.assign(osInfo, osReleaseResult.data);
      osInfo.detectionMethod = 'os-release';
      console.log(`✅ OS detectado via /etc/os-release: ${osInfo.prettyName || osInfo.name}`);
      
      // Obter arquitetura e kernel
      await enrichWithSystemInfo(sshService, connectionId, osInfo);
      return osInfo;
    }
    
    // 2. Fallback: Tentar via uname e /etc/issue
    const unameResult = await tryDetectUname(sshService, connectionId);
    if (unameResult.success) {
      Object.assign(osInfo, unameResult.data);
      osInfo.detectionMethod = 'uname';
      console.log(`✅ OS detectado via uname: ${osInfo.name}`);
      return osInfo;
    }
    
    // 3. Fallback: Tentar métodos específicos para sistemas antigos
    const legacyResult = await tryDetectLegacy(sshService, connectionId);
    if (legacyResult.success) {
      Object.assign(osInfo, legacyResult.data);
      osInfo.detectionMethod = 'legacy';
      console.log(`✅ OS detectado via métodos legacy: ${osInfo.name}`);
      return osInfo;
    }
    
    console.warn('⚠️ Não foi possível detectar o sistema operativo');
    osInfo.detectionMethod = 'failed';
    return osInfo;
    
  } catch (error) {
    console.error('❌ Erro na detecção do OS:', error.message);
    osInfo.detectionMethod = 'error';
    osInfo.error = error.message;
    return osInfo;
  }
}

/**
 * Detectar OS via /etc/os-release
 */
async function tryDetectOSRelease(sshService, connectionId) {
  try {
    const result = await sshService.executeCommand(connectionId, 'cat /etc/os-release', { timeout: 10000 });
    
    if (!result.success || !result.stdout) {
      console.log(`🔍 DEBUG - OS Release result: success=${result.success}, stdout="${result.stdout}"`);
      return { success: false };
    }
    
    const osInfo = parseOSRelease(result.stdout);
    return { success: true, data: osInfo };
    
  } catch (error) {
    console.warn('⚠️ Falha na detecção via /etc/os-release:', error.message);
    return { success: false };
  }
}

/**
 * Detectar OS via uname
 */
async function tryDetectUname(sshService, connectionId) {
  try {
    const unameResult = await sshService.executeCommand(connectionId, 'uname -a', { timeout: 5000 });
    
    if (!unameResult.success || !unameResult.stdout) {
      console.log(`🔍 DEBUG - Uname result: success=${unameResult.success}, stdout="${unameResult.stdout}"`);
      return { success: false };
    }
    
    const osInfo = parseUname(unameResult.stdout);
    
    // Tentar obter mais informações via /etc/issue
    try {
      const issueResult = await sshService.executeCommand(connectionId, 'cat /etc/issue', { timeout: 5000 });
      if (issueResult.success && issueResult.stdout) {
        const issueInfo = parseIssue(issueResult.stdout);
        Object.assign(osInfo, issueInfo);
      }
    } catch (error) {
      console.warn('⚠️ Não foi possível ler /etc/issue:', error.message);
    }
    
    return { success: true, data: osInfo };
    
  } catch (error) {
    console.warn('⚠️ Falha na detecção via uname:', error.message);
    return { success: false };
  }
}

/**
 * Detectar OS via métodos legacy
 */
async function tryDetectLegacy(sshService, connectionId) {
  try {
    const commands = [
      'cat /etc/redhat-release',
      'cat /etc/debian_version',
      'cat /etc/SuSE-release',
      'cat /etc/centos-release',
      'cat /etc/fedora-release'
    ];
    
    for (const command of commands) {
      try {
        const result = await sshService.executeCommand(connectionId, command, { timeout: 5000 });
        if (result.success && result.stdout.trim()) {
          const osInfo = parseLegacyRelease(result.stdout, command);
          if (osInfo.name) {
            return { success: true, data: osInfo };
          }
        }
      } catch (error) {
        // Continuar para o próximo comando
      }
    }
    
    return { success: false };
    
  } catch (error) {
    console.warn('⚠️ Falha na detecção via métodos legacy:', error.message);
    return { success: false };
  }
}

/**
 * Enriquecer informações do OS com dados do sistema
 */
async function enrichWithSystemInfo(sshService, connectionId, osInfo) {
  try {
    // Obter arquitetura
    const archResult = await sshService.executeCommand(connectionId, 'uname -m', { timeout: 5000 });
    if (archResult.success && archResult.stdout) {
      osInfo.architecture = archResult.stdout.trim();
    }
    
    // Obter versão do kernel
    const kernelResult = await sshService.executeCommand(connectionId, 'uname -r', { timeout: 5000 });
    if (kernelResult.success && kernelResult.stdout) {
      osInfo.kernel = kernelResult.stdout.trim();
    }
    
  } catch (error) {
    console.warn('⚠️ Erro ao enriquecer informações do sistema:', error.message);
  }
}

/**
 * Parsear /etc/os-release
 */
function parseOSRelease(content) {
  const osInfo = { raw: { osRelease: content } };
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const [key, ...valueParts] = trimmed.split('=');
    if (valueParts.length === 0) continue;
    
    let value = valueParts.join('=');
    // Remover aspas
    value = value.replace(/^["']|["']$/g, '');
    
    switch (key) {
      case 'ID':
        osInfo.id = value;
        break;
      case 'VERSION_ID':
        osInfo.version = value;
        break;
      case 'ID_LIKE':
        osInfo.like = value;
        break;
      case 'NAME':
        osInfo.name = value;
        break;
      case 'PRETTY_NAME':
        osInfo.prettyName = value;
        break;
      case 'VERSION_CODENAME':
        osInfo.versionCodename = value;
        break;
    }
  }
  
  return osInfo;
}

/**
 * Parsear output do uname
 */
function parseUname(content) {
  const osInfo = { raw: { uname: content } };
  const parts = content.trim().split(/\s+/);
  
  if (parts.length >= 1) {
    const osName = parts[0].toLowerCase();
    osInfo.name = parts[0];
    
    // Detectar tipo de sistema baseado no nome
    if (osName === 'linux') {
      osInfo.id = 'linux';
    } else if (osName === 'darwin') {
      osInfo.id = 'macos';
      osInfo.name = 'macOS';
    } else if (osName.includes('bsd')) {
      osInfo.id = 'bsd';
    }
  }
  
  if (parts.length >= 3) {
    osInfo.kernel = parts[2];
  }
  
  if (parts.length >= 5) {
    osInfo.architecture = parts[4];
  }
  
  return osInfo;
}

/**
 * Parsear /etc/issue
 */
function parseIssue(content) {
  const osInfo = { raw: { issue: content } };
  const firstLine = content.split('\n')[0].trim();
  
  if (firstLine) {
    // Tentar extrair nome e versão da primeira linha
    if (firstLine.includes('Ubuntu')) {
      osInfo.id = 'ubuntu';
      osInfo.like = 'debian';
      const versionMatch = firstLine.match(/Ubuntu (\d+\.\d+)/);
      if (versionMatch) {
        osInfo.version = versionMatch[1];
      }
    } else if (firstLine.includes('Debian')) {
      osInfo.id = 'debian';
      const versionMatch = firstLine.match(/Debian GNU\/Linux (\d+)/);
      if (versionMatch) {
        osInfo.version = versionMatch[1];
      }
    } else if (firstLine.includes('CentOS')) {
      osInfo.id = 'centos';
      osInfo.like = 'rhel';
      const versionMatch = firstLine.match(/CentOS Linux (\d+)/);
      if (versionMatch) {
        osInfo.version = versionMatch[1];
      }
    }
    
    if (!osInfo.prettyName) {
      osInfo.prettyName = firstLine;
    }
  }
  
  return osInfo;
}

/**
 * Parsear releases legacy
 */
function parseLegacyRelease(content, command) {
  const osInfo = { raw: { legacy: content } };
  const firstLine = content.split('\n')[0].trim();
  
  if (command.includes('redhat')) {
    osInfo.id = 'rhel';
    osInfo.like = 'rhel';
    osInfo.name = 'Red Hat Enterprise Linux';
  } else if (command.includes('centos')) {
    osInfo.id = 'centos';
    osInfo.like = 'rhel';
    osInfo.name = 'CentOS';
  } else if (command.includes('fedora')) {
    osInfo.id = 'fedora';
    osInfo.like = 'rhel';
    osInfo.name = 'Fedora';
  } else if (command.includes('debian')) {
    osInfo.id = 'debian';
    osInfo.name = 'Debian';
    osInfo.version = firstLine;
  } else if (command.includes('SuSE')) {
    osInfo.id = 'opensuse';
    osInfo.like = 'suse';
    osInfo.name = 'openSUSE';
  }
  
  osInfo.prettyName = firstLine;
  
  // Tentar extrair versão do conteúdo
  const versionMatch = firstLine.match(/(\d+(?:\.\d+)*)/);
  if (versionMatch && !osInfo.version) {
    osInfo.version = versionMatch[1];
  }
  
  return osInfo;
}

/**
 * Normalizar ID do OS para correspondência com configurações
 * @param {Object} osInfo - Informações do OS
 * @returns {string} ID normalizado do OS
 */
function normalizeOSId(osInfo) {
  if (!osInfo || !osInfo.id) {
    return 'linux'; // fallback
  }
  
  const id = osInfo.id.toLowerCase();
  
  // Mapeamentos específicos
  const mappings = {
    'rhel': 'centos',
    'fedora': 'centos',
    'rocky': 'centos',
    'almalinux': 'centos',
    'opensuse': 'centos',
    'sles': 'centos'
  };
  
  return mappings[id] || id;
}

/**
 * Validar se as informações do OS estão completas
 * @param {Object} osInfo - Informações do OS
 * @returns {boolean} Se as informações são válidas
 */
function validateOSInfo(osInfo) {
  return osInfo && 
         (osInfo.id || osInfo.name) && 
         osInfo.detectionMethod &&
         osInfo.detectionMethod !== 'failed' &&
         osInfo.detectionMethod !== 'error';
}

module.exports = {
  detectOS,
  normalizeOSId,
  validateOSInfo,
  parseOSRelease,
  parseUname,
  parseIssue
}; 