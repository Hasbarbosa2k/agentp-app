const OnboardingTemplate = require('../models/OnboardingTemplate');
const { logRequest } = require('../middleware/auth');

/**
 * Criar novo template de onboarding
 * @swagger
 * /templates:
 *   post:
 *     summary: Criar novo template de onboarding
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - steps
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome único do template
 *               description:
 *                 type: string
 *                 description: Descrição do template
 *               category:
 *                 type: string
 *                 enum: [system_discovery, security_audit, performance_check, service_discovery, custom]
 *               supportedOS:
 *                 type: array
 *                 items:
 *                   type: string
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     command:
 *                       type: string
 *                     validations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [string_contains, string_not_contains, regex_match, numeric_range, exists, not_exists]
 *                           value:
 *                             type: string
 *                           description:
 *                             type: string
 *     responses:
 *       201:
 *         description: Template criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Template com este nome já existe
 */
const createTemplate = async (req, res) => {
  try {
    logRequest(req);

    const userId = req.user?.userId || req.user?._id;
    const templateData = {
      ...req.body,
      createdBy: userId
    };

    // Validar se nome não existe
    const existingTemplate = await OnboardingTemplate.findOne({ 
      name: templateData.name 
    });
    
    if (existingTemplate) {
      return res.status(409).json({
        success: false,
        message: 'Template com este nome já existe',
        error: 'TEMPLATE_NAME_EXISTS'
      });
    }

    // Validar estrutura dos passos
    if (!templateData.steps || templateData.steps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Template deve ter pelo menos um passo',
        error: 'NO_STEPS_DEFINED'
      });
    }

    // Adicionar ordem automática se não definida
    templateData.steps.forEach((step, index) => {
      if (!step.order) {
        step.order = index + 1;
      }
    });

    const template = new OnboardingTemplate(templateData);
    await template.save();

    console.log(`✅ Template criado: ${template.name} por usuário ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Template criado com sucesso',
      data: {
        template: template.toObject()
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar template:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        error: error.message,
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Listar templates
 * @swagger
 * /templates:
 *   get:
 *     summary: Listar templates de onboarding
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoria
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por status
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filtrar por tag
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nome ou descrição
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Lista de templates
 */
const listTemplates = async (req, res) => {
  try {
    logRequest(req);

    const {
      category,
      status,
      tag,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = {};
    
    if (category) {
      filters.category = category;
    }
    
    if (status) {
      filters.status = status;
    }
    
    if (tag) {
      filters.tags = { $in: [tag] };
    }
    
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Buscar templates
    const templates = await OnboardingTemplate.find(filters)
      .populate('createdBy', 'username email displayName')
      .populate('lastModifiedBy', 'username email displayName')
      .sort({ 'usage.timesUsed': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await OnboardingTemplate.countDocuments(filters);

    // Estatísticas agregadas
    const stats = await OnboardingTemplate.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalTemplates: { $sum: 1 },
          activeTemplates: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          averageSteps: { $avg: { $size: '$steps' } },
          totalUsage: { $sum: '$usage.timesUsed' },
          averageSuccessRate: { $avg: '$usage.successRate' }
        }
      }
    ]);

    console.log(`📋 Listados ${templates.length} templates`);

    res.json({
      success: true,
      message: 'Templates listados com sucesso',
      data: {
        templates: templates.map(template => ({
          ...template.toObject(),
          stepsSummary: template.steps.map(step => ({
            name: step.name,
            command: step.command.substring(0, 50) + (step.command.length > 50 ? '...' : ''),
            validationCount: step.validations.length
          }))
        })),
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats: stats[0] || {
          totalTemplates: 0,
          activeTemplates: 0,
          averageSteps: 0,
          totalUsage: 0,
          averageSuccessRate: 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar templates:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obter template por ID
 * @swagger
 * /templates/{templateId}:
 *   get:
 *     summary: Obter template específico
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do template
 *     responses:
 *       200:
 *         description: Template encontrado
 *       404:
 *         description: Template não encontrado
 */
const getTemplate = async (req, res) => {
  try {
    logRequest(req);

    const { templateId } = req.params;

    const template = await OnboardingTemplate.findById(templateId)
      .populate('createdBy', 'username email displayName')
      .populate('lastModifiedBy', 'username email displayName')
      .populate('baseTemplate', 'name version');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado'
      });
    }

    console.log(`📋 Template obtido: ${template.name}`);

    res.json({
      success: true,
      message: 'Template obtido com sucesso',
      data: {
        template: template.toObject()
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter template:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Atualizar template
 * @swagger
 * /templates/{templateId}:
 *   put:
 *     summary: Atualizar template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do template
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do template
 *               description:
 *                 type: string
 *                 description: Descrição do template
 *               version:
 *                 type: string
 *                 description: Nova versão do template
 *               category:
 *                 type: string
 *                 enum: [system_discovery, security_audit, performance_check, service_discovery, custom]
 *               status:
 *                 type: string
 *                 enum: [draft, active, deprecated, archived]
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *               changeDescription:
 *                 type: string
 *                 description: Descrição das mudanças
 *     responses:
 *       200:
 *         description: Template atualizado
 *       403:
 *         description: Sem permissão para editar
 *       404:
 *         description: Template não encontrado
 *       409:
 *         description: Nome já existe
 */
const updateTemplate = async (req, res) => {
  try {
    logRequest(req);

    const { templateId } = req.params;
    const userId = req.user?.userId || req.user?._id;
    const updateData = { ...req.body };

    const template = await OnboardingTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado'
      });
    }

    // Verificar permissões (apenas criador ou admin pode editar)
    const isCreator = template.createdBy?.toString() === userId?.toString();
    const isAdmin = req.user?.role === 'admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para editar este template',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Verificar se template está arquivado
    if (template.status === 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível editar um template arquivado',
        error: 'TEMPLATE_ARCHIVED'
      });
    }

    // Verificar se o nome foi alterado e se já existe
    if (updateData.name && updateData.name !== template.name) {
      const existingTemplate = await OnboardingTemplate.findOne({ 
        name: updateData.name,
        _id: { $ne: templateId }
      });
      
      if (existingTemplate) {
        return res.status(409).json({
          success: false,
          message: 'Template com este nome já existe',
          error: 'TEMPLATE_NAME_EXISTS'
        });
      }
    }

    // Atualizar lastModifiedBy
    updateData.lastModifiedBy = userId;

    // Se steps foram atualizados, reordenar
    if (updateData.steps) {
      updateData.steps.forEach((step, index) => {
        if (!step.order) {
          step.order = index + 1;
        }
      });
    }

    // Criar entrada no changelog se versão foi alterada
    if (updateData.version && updateData.version !== template.version) {
      if (!template.changelog) {
        template.changelog = [];
      }
      template.changelog.push({
        version: updateData.version,
        changes: updateData.changeDescription || 'Atualização do template',
        changedBy: userId,
        changedAt: new Date()
      });
    }

    // Atualizar template
    Object.assign(template, updateData);
    await template.save();

    console.log(`✅ Template atualizado: ${template.name} por usuário ${userId}`);

    res.json({
      success: true,
      message: 'Template atualizado com sucesso',
      data: {
        template: template.toObject()
      }
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar template:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        error: error.message,
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Clonar template
 * @swagger
 * /templates/{templateId}/clone:
 *   post:
 *     summary: Clonar template existente
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do template a clonar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do novo template
 *               description:
 *                 type: string
 *                 description: Descrição personalizada
 *     responses:
 *       201:
 *         description: Template clonado com sucesso
 *       404:
 *         description: Template original não encontrado
 */
const cloneTemplate = async (req, res) => {
  try {
    logRequest(req);

    const { templateId } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.userId || req.user?._id;

    const originalTemplate = await OnboardingTemplate.findById(templateId);
    
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template original não encontrado'
      });
    }

    // Verificar se nome não existe
    const existingTemplate = await OnboardingTemplate.findOne({ name });
    
    if (existingTemplate) {
      return res.status(409).json({
        success: false,
        message: 'Template com este nome já existe',
        error: 'TEMPLATE_NAME_EXISTS'
      });
    }

    // Clonar template
    const clonedTemplate = originalTemplate.clone(name, userId);
    
    if (description) {
      clonedTemplate.description = description;
    }

    await clonedTemplate.save();

    console.log(`📋 Template clonado: ${originalTemplate.name} -> ${clonedTemplate.name}`);

    res.status(201).json({
      success: true,
      message: 'Template clonado com sucesso',
      data: {
        template: clonedTemplate.toObject(),
        originalTemplate: {
          id: originalTemplate._id,
          name: originalTemplate.name
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao clonar template:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Deletar template
 * @swagger
 * /templates/{templateId}:
 *   delete:
 *     summary: Deletar template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do template
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *                 description: Forçar exclusão mesmo se template estiver em uso
 *               reason:
 *                 type: string
 *                 description: Motivo da exclusão
 *     responses:
 *       200:
 *         description: Template deletado
 *       404:
 *         description: Template não encontrado
 *       409:
 *         description: Template está em uso e não pode ser deletado
 */
const deleteTemplate = async (req, res) => {
  try {
    logRequest(req);

    const { templateId } = req.params;
    // Support both body and query params for DELETE requests
    const force = req.body?.force || req.query?.force === 'true' || false;
    const reason = req.body?.reason || req.query?.reason || '';
    const userId = req.user?.userId || req.user?._id;

    const template = await OnboardingTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado'
      });
    }

    // Verificar se template está sendo usado ativamente
    const OnboardingProcess = require('../models/OnboardingProcess');
    const activeProcesses = await OnboardingProcess.find({
      templateId: templateId,
      status: { $in: ['running', 'pending', 'paused'] }
    }).limit(1);

    if (activeProcesses.length > 0 && !force) {
      return res.status(409).json({
        success: false,
        message: 'Template está sendo usado em processos ativos e não pode ser deletado',
        error: 'TEMPLATE_IN_USE',
        data: {
          activeProcesses: activeProcesses.length,
          templateName: template.name
        }
      });
    }

    // Verificar se é um template do sistema (não pode ser deletado)
    if (template.isSystemTemplate && !force) {
      return res.status(403).json({
        success: false,
        message: 'Templates do sistema não podem ser deletados',
        error: 'SYSTEM_TEMPLATE_PROTECTED'
      });
    }

    // Verificar permissões (apenas criador ou admin pode deletar)
    const isCreator = template.createdBy?.toString() === userId?.toString();
    const isAdmin = req.user?.role === 'admin';
    
    if (!isCreator && !isAdmin && !force) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para deletar este template',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Registrar motivo da exclusão se fornecido
    if (reason) {
      console.log(`🗑️ Template ${template.name} deletado por ${userId}. Motivo: ${reason}`);
    }

    // Soft delete - marcar como arquivado em vez de deletar completamente
    if (!force) {
      template.status = 'archived';
      template.archivedAt = new Date();
      template.archivedBy = userId;
      template.archiveReason = reason;
      await template.save();

      console.log(`📦 Template arquivado: ${template.name} por usuário ${userId}`);

      res.json({
        success: true,
        message: 'Template arquivado com sucesso',
        data: {
          archivedTemplate: {
            id: template._id,
            name: template.name,
            archivedAt: template.archivedAt
          }
        }
      });
    } else {
      // Hard delete - remover completamente
      await OnboardingTemplate.findByIdAndDelete(templateId);

      console.log(`🗑️ Template deletado permanentemente: ${template.name} por usuário ${userId}`);

      res.json({
        success: true,
        message: 'Template deletado permanentemente com sucesso',
        data: {
          deletedTemplate: {
            id: template._id,
            name: template.name
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro ao deletar template:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Testar validações de um template
 * @swagger
 * /templates/{templateId}/test-validations:
 *   post:
 *     summary: Testar validações de um template com outputs de exemplo
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do template
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testOutputs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     stepIndex:
 *                       type: integer
 *                     output:
 *                       type: string
 *     responses:
 *       200:
 *         description: Validações testadas
 */
/**
 * Restaurar template arquivado
 * @swagger
 * /templates/{templateId}/restore:
 *   post:
 *     summary: Restaurar template arquivado
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do template
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newStatus:
 *                 type: string
 *                 enum: [draft, active]
 *                 default: draft
 *                 description: Status para restaurar o template
 *     responses:
 *       200:
 *         description: Template restaurado
 *       404:
 *         description: Template não encontrado
 *       400:
 *         description: Template não está arquivado
 */
const restoreTemplate = async (req, res) => {
  try {
    logRequest(req);

    const { templateId } = req.params;
    const { newStatus = 'draft' } = req.body;
    const userId = req.user?.userId || req.user?._id;

    const template = await OnboardingTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado'
      });
    }

    // Verificar se template está arquivado
    if (template.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Template não está arquivado',
        error: 'TEMPLATE_NOT_ARCHIVED'
      });
    }

    // Verificar permissões (apenas criador ou admin pode restaurar)
    const isCreator = template.createdBy?.toString() === userId?.toString();
    const isAdmin = req.user?.role === 'admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para restaurar este template',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Restaurar template
    template.status = newStatus;
    template.restoredAt = new Date();
    template.restoredBy = userId;
    template.lastModifiedBy = userId;
    
    // Limpar campos de arquivamento
    template.archivedAt = undefined;
    template.archivedBy = undefined;
    template.archiveReason = undefined;

    await template.save();

    console.log(`📦 Template restaurado: ${template.name} por usuário ${userId}`);

    res.json({
      success: true,
      message: 'Template restaurado com sucesso',
      data: {
        restoredTemplate: {
          id: template._id,
          name: template.name,
          status: template.status,
          restoredAt: template.restoredAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao restaurar template:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const testTemplateValidations = async (req, res) => {
  try {
    logRequest(req);

    const { templateId } = req.params;
    const { testOutputs } = req.body;

    const template = await OnboardingTemplate.findById(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado'
      });
    }

    const results = [];

    for (const testOutput of testOutputs) {
      const { stepIndex, output } = testOutput;
      
      try {
        const validationResult = template.validateStepOutput(stepIndex, output);
        results.push({
          stepIndex,
          stepName: validationResult.stepName,
          output: output.substring(0, 200) + (output.length > 200 ? '...' : ''),
          ...validationResult
        });
      } catch (error) {
        results.push({
          stepIndex,
          error: error.message,
          success: false
        });
      }
    }

    res.json({
      success: true,
      message: 'Validações testadas com sucesso',
      data: {
        templateName: template.name,
        testResults: results,
        summary: {
          totalTests: results.length,
          successfulTests: results.filter(r => r.overallSuccess).length,
          failedTests: results.filter(r => !r.overallSuccess).length
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao testar validações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  cloneTemplate,
  deleteTemplate,
  restoreTemplate,
  testTemplateValidations
};