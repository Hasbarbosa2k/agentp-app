const System = require('../models/System');
const { generateUniqueSlug } = require('../utils/slugGenerator');
const { 
  createSystemDirectory, 
  removeSystemDirectory, 
  renameSystemDirectory 
} = require('../utils/knowledgeBaseManager');

// Criar novo sistema
const createSystem = async (req, res) => {
  try {
    const {
      name,
      ip,
      status,
      os,
      owner,
      description,
      environment,
      uptime,
      port,
      protocol,
      tags,
      monitoringEnabled,
      alertsEnabled
    } = req.body;

    // Verificar se já existe sistema com o mesmo IP
    const existingSystem = await System.findOne({ ip, isActive: true });
    if (existingSystem) {
      return res.status(400).json({
        success: false,
        message: `Já existe um sistema com o IP ${ip}: ${existingSystem.name}`
      });
    }

    // Gerar slug único para o sistema
    const slug = await generateUniqueSlug(name);

    // Criar novo sistema
    const system = new System({
      name,
      slug,
      ip,
      status: status || 'unknown',
      os,
      owner,
      description,
      environment: environment || 'development',
      uptime: uptime || 'Unknown',
      port,
      protocol: protocol || 'http',
      tags: tags || [],
      monitoringEnabled: monitoringEnabled !== undefined ? monitoringEnabled : true,
      alertsEnabled: alertsEnabled !== undefined ? alertsEnabled : true,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await system.save();

    // Criar diretório na knowledge_base
    try {
      await createSystemDirectory(slug, name);
      console.log(`📁 Diretório criado para sistema ${name}: ${slug}`);
    } catch (dirError) {
      console.warn(`⚠️ Erro ao criar diretório para sistema ${name}:`, dirError.message);
      // Não falhar a criação do sistema por causa do diretório
    }

    // Populate para resposta
    await system.populate('createdBy', 'username email');

    res.status(201).json({
      success: true,
      message: `Sistema "${name}" criado com sucesso`,
      data: {
        system
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'IP já está em uso por outro sistema'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Listar todos os sistemas
const getAllSystems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      environment,
      owner,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filters = { isActive: true };
    
    if (status) filters.status = status;
    if (environment) filters.environment = environment;
    if (owner) filters.owner = { $regex: owner, $options: 'i' };
    
    // Pesquisa por nome, IP ou descrição
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ip: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { os: { $regex: search, $options: 'i' } }
      ];
    }

    // Configurar ordenação
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const { includeOnboarding } = req.query; // Query param para incluir dados básicos de onboarding

    const systems = await System.find(filters)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalSystems = await System.countDocuments(filters);

    // Adicionar informações básicas de onboarding se solicitado
    let systemsWithOnboarding = systems;
    if (includeOnboarding === 'true') {
      try {
        const OnboardingProcess = require('../models/OnboardingProcess');
        
        // Buscar processos de onboarding para todos os sistemas da página
        const systemIds = systems.map(sys => sys._id);
        const onboardingProcesses = await OnboardingProcess.find({ 
          systemId: { $in: systemIds } 
        }).select('systemId status progress totalSteps completedSteps startedAt completedAt');

        // Criar mapa para acesso rápido
        const onboardingMap = {};
        onboardingProcesses.forEach(process => {
          onboardingMap[process.systemId.toString()] = {
            hasOnboarding: true,
            status: process.status,
            progress: process.progress,
            totalSteps: process.totalSteps,
            completedSteps: process.completedSteps,
            startedAt: process.startedAt,
            completedAt: process.completedAt
          };
        });

        // Adicionar dados de onboarding aos sistemas
        systemsWithOnboarding = systems.map(system => ({
          ...system.toObject(),
          onboarding: onboardingMap[system._id.toString()] || {
            hasOnboarding: false,
            status: system.onboardingStatus,
            statusDisplay: system.onboardingStatusDisplay,
            required: system.onboardingRequired,
            needsOnboarding: system.needsOnboarding()
          }
        }));
      } catch (onboardingError) {
        console.warn('⚠️ Erro ao buscar dados de onboarding em lote:', onboardingError.message);
        // Em caso de erro, manter sistemas sem dados de onboarding
      }
    }

    res.json({
      success: true,
      message: 'Lista de sistemas obtida com sucesso',
      data: {
        systems: systemsWithOnboarding,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalSystems / limit),
          totalSystems,
          hasNext: page < Math.ceil(totalSystems / limit),
          hasPrev: page > 1
        },
        filters: {
          status,
          environment,
          owner,
          search
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter sistema específico
const getSystemById = async (req, res) => {
  try {
    const { systemId } = req.params;
    const { includeOnboarding } = req.query; // Query param para incluir dados de onboarding

    const system = await System.findOne({ _id: systemId, isActive: true })
      .populate('createdBy', 'username email role')
      .populate('updatedBy', 'username email role');

    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    // Preparar resposta
    const responseData = { system };

    // Incluir dados de onboarding se solicitado
    if (includeOnboarding === 'true') {
      try {
        const OnboardingProcess = require('../models/OnboardingProcess');
        
        const onboardingProcess = await OnboardingProcess.findOne({ systemId })
          .populate('initiatedBy', 'username email displayName')
          .populate('completedBy', 'username email displayName');

        if (onboardingProcess) {
          responseData.onboarding = {
            ...onboardingProcess.toObject(),
            detailedStatus: onboardingProcess.detailedStatus
          };
        } else {
          responseData.onboarding = {
            hasOnboarding: false,
            status: system.onboardingStatus,
            statusDisplay: system.onboardingStatusDisplay,
            required: system.onboardingRequired,
            needsOnboarding: system.needsOnboarding()
          };
        }
      } catch (onboardingError) {
        console.warn('⚠️ Erro ao buscar dados de onboarding:', onboardingError.message);
        responseData.onboarding = {
          hasOnboarding: false,
          error: 'Erro ao carregar dados de onboarding'
        };
      }
    }

    res.json({
      success: true,
      message: 'Detalhes do sistema obtidos com sucesso',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar sistema
const updateSystem = async (req, res) => {
  try {
    const { systemId } = req.params;
    const updateData = req.body;

    const system = await System.findOne({ _id: systemId, isActive: true });
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    // Se IP está sendo alterado, verificar duplicação
    if (updateData.ip && updateData.ip !== system.ip) {
      const existingSystem = await System.findOne({ 
        ip: updateData.ip, 
        isActive: true,
        _id: { $ne: systemId }
      });
      
      if (existingSystem) {
        return res.status(400).json({
          success: false,
          message: `IP ${updateData.ip} já está em uso pelo sistema: ${existingSystem.name}`
        });
      }
    }

    // Verificar se o nome está sendo alterado (para atualizar slug)
    const nameChanged = updateData.name && updateData.name !== system.name;
    let newSlug = system.slug;

    if (nameChanged) {
      // Gerar novo slug baseado no novo nome
      newSlug = await generateUniqueSlug(updateData.name, system._id);
      updateData.slug = newSlug;
    }

    // Atualizar campos
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'createdBy') {
        system[key] = updateData[key];
      }
    });

    system.updatedBy = req.user._id;
    await system.save();

    // Se o slug mudou, renomear o diretório
    if (nameChanged && newSlug !== system.slug) {
      const oldSlug = system.slug;
      try {
        await renameSystemDirectory(oldSlug, newSlug, updateData.name);
        console.log(`📁 Diretório renomeado: ${oldSlug} → ${newSlug}`);
      } catch (dirError) {
        console.warn(`⚠️ Erro ao renomear diretório:`, dirError.message);
        // Não falhar a atualização do sistema por causa do diretório
      }
    }

    // Populate para resposta
    await system.populate('createdBy', 'username email');
    await system.populate('updatedBy', 'username email');

    res.json({
      success: true,
      message: `Sistema "${system.name}" atualizado com sucesso`,
      data: { system }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Apagar sistema (soft delete)
const deleteSystem = async (req, res) => {
  try {
    const { systemId } = req.params;

    const system = await System.findOne({ _id: systemId, isActive: true });
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    // Soft delete - marcar como inativo
    system.isActive = false;
    system.updatedBy = req.user._id;
    await system.save();

    // Remover diretório do knowledge_base
    try {
      await removeSystemDirectory(system.slug);
      console.log(`🗑️ Diretório removido para sistema ${system.name}: ${system.slug}`);
    } catch (dirError) {
      console.warn(`⚠️ Erro ao remover diretório para sistema ${system.name}:`, dirError.message);
      // Não falhar a remoção do sistema por causa do diretório
    }

    res.json({
      success: true,
      message: `Sistema "${system.name}" removido com sucesso`,
      data: {
        systemId: system._id,
        name: system.name,
        slug: system.slug,
        ip: system.ip,
        deletedAt: new Date(),
        deletedBy: {
          id: req.user._id,
          username: req.user.username
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Testar conectividade do sistema
const connectivityService = require('../services/connectivityService');
const testSystem = async (req, res) => {
  try {
    const { systemId } = req.params;

    const system = await System.findOne({ _id: systemId, isActive: true });
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    // Teste rápido: apenas ping
    const result = await connectivityService.quickPing(system.ip, 2);
    // Para Windows, quickPing já aplica heurística via testPing
    const testSuccess = !!result?.success;

    // Atualizar último teste
    system.lastTest = new Date();
    system.lastTestStatus = testSuccess ? 'success' : 'failed';
    
    // Atualizar status
    system.status = testSuccess ? 'online' : 'offline';

    system.updatedBy = req.user._id;
    await system.save();

    res.json({
      success: true,
      message: `Teste do sistema "${system.name}" concluído`,
      data: {
        system: {
          id: system._id,
          name: system.name,
          slug: system.slug,
          ip: system.ip,
          status: system.status
        },
        testResult: {
          success: testSuccess,
          timestamp: system.lastTest,
          message: testSuccess ? 'Sistema respondeu com sucesso' : 'Sistema não responde',
          details: { ping: result }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter estatísticas dos sistemas
const getSystemStats = async (req, res) => {
  try {
    const totalSystems = await System.countDocuments({ isActive: true });
    const onlineSystems = await System.countDocuments({ isActive: true, status: 'online' });
    const offlineSystems = await System.countDocuments({ isActive: true, status: 'offline' });
    const maintenanceSystems = await System.countDocuments({ isActive: true, status: 'maintenance' });
    const unknownSystems = await System.countDocuments({ isActive: true, status: 'unknown' });

    // Sistemas por ambiente
    const environmentStats = await System.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$environment', count: { $sum: 1 } } }
    ]);

    // Sistemas por owner
    const ownerStats = await System.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$owner', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Últimos sistemas criados
    const recentSystems = await System.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name ip status environment createdAt')
      .populate('createdBy', 'username');

    res.json({
      success: true,
      message: 'Estatísticas dos sistemas obtidas com sucesso',
      data: {
        overview: {
          totalSystems,
          onlineSystems,
          offlineSystems,
          maintenanceSystems,
          unknownSystems,
          uptimePercentage: totalSystems > 0 ? ((onlineSystems / totalSystems) * 100).toFixed(1) + '%' : '0%'
        },
        environmentDistribution: environmentStats,
        topOwners: ownerStats,
        recentSystems
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Obter perfil analisado pela AI
 * @swagger
 * /systems/{id}/ai-profile:
 *   get:
 *     summary: Obter perfil do sistema analisado pela AI
 *     tags: [Systems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do sistema
 *     responses:
 *       200:
 *         description: Perfil analisado obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     topProcesses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           cpuUsage:
 *                             type: string
 *                     activeServices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           status:
 *                             type: string
 *                     openPorts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           port:
 *                             type: string
 *                           protocol:
 *                             type: string
 *                     systemInfo:
 *                       type: object
 *                       properties:
 *                         kernel:
 *                           type: string
 *                         architecture:
 *                           type: string
 *                         loadAverage:
 *                           type: string
 *                         loggedUsers:
 *                           type: string
 *       404:
 *         description: Sistema não encontrado
 *       400:
 *         description: Perfil AI não disponível
 */
const getSystemAIProfile = async (req, res) => {
  try {
    logRequest(req);

    const { id } = req.params;

    // Buscar sistema
    const system = await System.findById(id)
      .populate('onboardingProcess')
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    // Verificar se há perfil AI analisado
    if (!system.aiAnalyzedProfile || !system.aiAnalyzedProfile.lastAnalyzedAt) {
      return res.status(400).json({
        success: false,
        message: 'Perfil AI não disponível',
        details: 'O onboarding deve estar completo para gerar o perfil analisado pela AI',
        onboardingStatus: system.onboardingStatus
      });
    }

    console.log(`📊 Perfil AI obtido para sistema: ${system.name}`);

    res.json({
      success: true,
      message: 'Perfil analisado pela AI obtido com sucesso',
      data: {
        systemId: system._id,
        systemName: system.name,
        systemIP: system.ip,
        onboardingStatus: system.onboardingStatus,
        profile: {
          topProcesses: system.aiAnalyzedProfile.topProcesses || [],
          activeServices: system.aiAnalyzedProfile.activeServices || [],
          openPorts: system.aiAnalyzedProfile.openPorts || [],
          systemInfo: system.aiAnalyzedProfile.systemInfo || {}
        },
        metadata: {
          lastAnalyzedAt: system.aiAnalyzedProfile.lastAnalyzedAt,
          aiModel: system.aiAnalyzedProfile.aiMetadata?.model,
          tokensUsed: system.aiAnalyzedProfile.aiMetadata?.tokensUsed,
          onboardingId: system.aiAnalyzedProfile.aiMetadata?.onboardingId
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter perfil AI do sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obter informações básicas de um sistema (apenas campos essenciais)
 */
const getSystemBasicInfo = async (req, res) => {
  try {
    const { systemId } = req.params;

    const system = await System.findOne({ _id: systemId, isActive: true })
      .select('_id name slug ip status environment owner description createdAt updatedAt');

    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Informações básicas do sistema obtidas com sucesso',
      data: {
        system: {
          id: system._id,
          name: system.name,
          slug: system.slug,
          ip: system.ip,
          status: system.status,
          environment: system.environment,
          owner: system.owner,
          description: system.description,
          createdAt: system.createdAt,
          updatedAt: system.updatedAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Converter ID do sistema em slug
 */
const getSystemSlug = async (req, res) => {
  try {
    const { systemId } = req.params;

    const system = await System.findOne({ _id: systemId, isActive: true })
      .select('slug name');

    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Slug do sistema obtido com sucesso',
      data: {
        systemId,
        slug: system.slug,
        name: system.name,
        fileApiBasePath: `/api/files/${system.slug}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Buscar sistema por slug
 */
const getSystemBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const system = await System.findOne({ slug, isActive: true })
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Sistema encontrado pelo slug',
      data: {
        system
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

/**
 * Re-parsear perfil do sistema a partir do último onboarding
 * POST /systems/:id/reparse-profile
 */
const reparseSystemProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const OnboardingProcess = require('../models/OnboardingProcess');
    const { getSystemProfileParser } = require('../services/systemProfileParser');

    // Buscar sistema
    const system = await System.findById(id);
    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'Sistema não encontrado'
      });
    }

    // Buscar último onboarding do sistema
    const onboardingProcess = await OnboardingProcess.findOne({ systemId: id })
      .sort({ createdAt: -1 });

    if (!onboardingProcess) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum onboarding encontrado para este sistema',
        details: 'Execute o onboarding primeiro para poder gerar o perfil'
      });
    }

    // Verificar se há passos com sucesso
    const successfulSteps = onboardingProcess.steps.filter(s => s.status === 'success' && s.output);
    if (successfulSteps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum passo do onboarding foi executado com sucesso',
        details: 'Execute o onboarding com comandos básicos para poder gerar o perfil'
      });
    }

    // Parsear perfil a partir do onboarding
    const parser = getSystemProfileParser();
    const updatedSystem = await parser.parseOnboardingAndUpdateProfile(onboardingProcess, id);

    console.log(`🔄 Perfil do sistema ${system.name} reparsado com sucesso`);

    res.json({
      success: true,
      message: 'Perfil do sistema reparsado com sucesso',
      data: {
        systemId: updatedSystem._id,
        systemName: updatedSystem.name,
        profile: updatedSystem.aiAnalyzedProfile,
        onboardingId: onboardingProcess._id,
        stepsUsed: successfulSteps.map(s => s.step)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao reparsear perfil do sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createSystem,
  getAllSystems,
  getSystemById,
  getSystemBasicInfo,
  getSystemSlug,
  getSystemBySlug,
  updateSystem,
  deleteSystem,
  testSystem,
  getSystemStats,
  getSystemAIProfile,
  reparseSystemProfile
}; 