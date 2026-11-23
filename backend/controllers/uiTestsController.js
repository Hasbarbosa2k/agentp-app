const UiTest = require('../models/UiTest');
const System = require('../models/System');
const UiTestRun = require('../models/UiTestRun');
const { uiTestPlan } = require('../services/aiClient');
const { runUiAgentTest } = require('../services/uiAgentClient');
const { broadcastUiTestEvent } = require('./uiTestsRealtimeController');

/**
 * Criar um novo teste de UI
 * Request body esperado:
 *  - systemSlug: string
 *  - url: string
 *  - description: string
 *  - extraDescription?: string
 */
async function createUiTest(req, res) {
  try {
    const { systemSlug, url, description, extraDescription, testType, skipAiPlan } = req.body;

    // Mapear slug -> systemId (se existir)
    const system = await System.findOne({ slug: systemSlug }).select('_id slug name');

    const uiTest = new UiTest({
      systemId: system ? system._id : null,
      systemSlug,
      testType: testType || 'ui',
      url: url || '',
      description,
      extraDescription: extraDescription || '',
      status: 'pending',
      createdBy: req.user?._id || req.user?.userId
    });

    await uiTest.save();

    // Se skipAiPlan=true ou testType não é 'ui', pular geração de plano AI
    if (skipAiPlan || (testType && testType !== 'ui')) {
      await UiTest.findByIdAndUpdate(uiTest._id, { status: 'answered' });
      const fresh = await UiTest.findById(uiTest._id);
      return res.status(201).json({
        success: true,
        message: 'Test created successfully',
        data: { uiTest: fresh.toObject(), aiResponse: null, plan: null, steps: [] }
      });
    }

    const instruction = buildInstruction({ url, description, extraDescription });
    const aiPayload = { instruction, system: systemSlug, options: {} };
    uiTest.aiRequest = aiPayload;
    await uiTest.save();

    // Tentar gerar plano AI, mas não falhar se não conseguir
    try {
      await UiTest.findByIdAndUpdate(uiTest._id, { status: 'processing' });
      const response = await uiTestPlan(aiPayload);
      await UiTest.findByIdAndUpdate(uiTest._id, {
        status: 'answered',
        aiResponse: response,
        respondedAt: new Date()
      });
      try {
        broadcastUiTestEvent(String(uiTest._id), 'ai_plan_ready', { uiTestId: uiTest._id, aiResponse: response });
      } catch (broadcastErr) {
        console.warn('⚠️ Failed to broadcast ai_plan_ready event:', broadcastErr.message);
      }
      const fresh = await UiTest.findById(uiTest._id);
      const planText = extractPlan(response);
      const steps = extractSteps(response);
      return res.status(201).json({
        success: true,
        message: 'Test plan generated successfully',
        data: { uiTest: fresh.toObject(), aiResponse: response, plan: planText, steps }
      });
    } catch (err) {
      // AI falhou, mas criamos o teste mesmo assim
      console.warn('⚠️ AI plan generation failed, continuing without plan:', err.message);
      await UiTest.findByIdAndUpdate(uiTest._id, { status: 'answered', error: `AI plan failed: ${err.message}` });
      const fresh = await UiTest.findById(uiTest._id);
      return res.status(201).json({
        success: true,
        message: 'Teste criado (sem plano AI)',
        data: { uiTest: fresh.toObject(), aiResponse: null, plan: null, steps: [], aiError: err.message }
      });
    }
  } catch (error) {
    console.error('❌ Erro ao criar UI Test:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

function buildInstruction({ url, description, extraDescription }) {
  const parts = [
    `URL: ${url}`,
    `Descrição: ${description}`,
  ];
  if (extraDescription) parts.push(`Detalhes: ${extraDescription}`);
  return parts.join('\n');
}

function extractPlan(aiResponse) {
  if (!aiResponse) return null;
  return (
    aiResponse.plan ||
    aiResponse.text ||
    aiResponse.data?.plan ||
    aiResponse.data?.text ||
    (typeof aiResponse === 'string' ? aiResponse : null) ||
    (typeof aiResponse?.aiPlan === 'string' ? aiResponse.aiPlan : null) ||
    null
  );
}

function extractSteps(aiResponse) {
  if (!aiResponse) return [];
  if (Array.isArray(aiResponse.steps)) return aiResponse.steps;
  if (Array.isArray(aiResponse.data?.steps)) return aiResponse.data.steps;
  if (Array.isArray(aiResponse.plan?.steps)) return aiResponse.plan.steps;
  if (Array.isArray(aiResponse.aiPlan)) return aiResponse.aiPlan;
  return [];
}

async function triggerAiPlan(uiTestId, payload) {
  try {
    // Atualiza estado para processing
    await UiTest.findByIdAndUpdate(uiTestId, { status: 'processing' });
    const response = await uiTestPlan(payload);
    // Logs detalhados da resposta AI
    try {
      console.log('🧠 [UI-TEST] AI response status=ok');
      if (response) {
        const plan = response.plan || response.data?.plan || null;
        const steps = Array.isArray(response.steps) ? response.steps : (Array.isArray(response.data?.steps) ? response.data.steps : null);
        if (plan) {
          const maxLen = 8000;
          console.log('🧠 [UI-TEST] PLAN <-\n' + (String(plan).length > maxLen ? `${String(plan).slice(0, maxLen)}... [truncated]` : String(plan)));
        }
        if (steps) {
          console.log('🧠 [UI-TEST] STEPS count:', steps.length);
          console.log('🧠 [UI-TEST] STEPS details (first 20):', JSON.stringify(steps.slice(0, 20), null, 2));
        }
      }
    } catch (e) {
      console.warn('⚠️ [UI-TEST] Failed to log AI response details:', e.message);
    }
    await UiTest.findByIdAndUpdate(uiTestId, {
      status: 'answered',
      aiResponse: response,
      respondedAt: new Date()
    });
    try {
      broadcastUiTestEvent(String(uiTestId), 'ai_plan_ready', { uiTestId, aiResponse: response });
    } catch (broadcastErr) {
      console.warn('⚠️ Failed to broadcast ai_plan_ready event:', broadcastErr.message);
    }
  } catch (err) {
    await UiTest.findByIdAndUpdate(uiTestId, { status: 'failed', error: err.message });
    try {
      broadcastUiTestEvent(String(uiTestId), 'ai_plan_failed', { uiTestId, error: err.message });
    } catch (broadcastErr) {
      console.warn('⚠️ Failed to broadcast ai_plan_failed event:', broadcastErr.message);
    }
    throw err;
  }
}

// Endpoint: finalizar e executar
async function finalizeAndRun(req, res) {
  try {
    const { title, objective, url, systemSlug, steps, acceptanceCriteria, testType } = req.body;

    // Garantir testId único
    const testId = `${testType || 'ui'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Criar/guardar o UiTest finalizado
    const system = await System.findOne({ slug: systemSlug }).select('_id slug name');
    const uiTest = new UiTest({
      title,
      objective,
      testType: testType || 'ui',
      url: url || '',
      description: objective, // manter compat
      systemId: system ? system._id : null,
      systemSlug,
      steps,
      acceptanceCriteria: acceptanceCriteria || [],
      finalized: true,
      status: 'pending',
      createdBy: req.user?._id || req.user?.userId
    });
    await uiTest.save();

    // Criar execução com testId fixo e parâmetros fixos
    const runReq = {
      steps,
      testId,
      recordVideo: true,
      videoSpeed: 2,
      videoCrf: 28
    };
    const run = new UiTestRun({
      testId,
      displayName: title || objective || 'UI Test',
      description: objective || '',
      relatedUiTestId: uiTest._id,
      systemSlug,
      testType: testType || 'ui',
      steps,
      status: 'running',
      recordVideo: true,
      videoSpeed: 2,
      videoCrf: 28,
      createdBy: req.user?._id || req.user?.userId,
      agentRequest: runReq,
      startedAt: new Date()
    });
    await run.save();

    try {
      const agentResponse = await runUiAgentTest(runReq);
      run.agentResponse = agentResponse;
      run.status = 'completed';
      run.completedAt = new Date();
      if (agentResponse?.videoUrl) run.artifacts.videoUrl = agentResponse.videoUrl;
      if (agentResponse?.reportUrl) run.artifacts.reportUrl = agentResponse.reportUrl;
      await run.save();
      // Atualiza UiTest status
      await UiTest.findByIdAndUpdate(uiTest._id, { status: 'answered' });
      return res.status(201).json({
        success: true,
        message: 'Final test saved and execution started successfully',
        data: { uiTest: uiTest.toObject(), run: run.toObject() }
      });
    } catch (err) {
      run.status = 'failed';
      run.error = err.message;
      await run.save();
      await UiTest.findByIdAndUpdate(uiTest._id, { status: 'failed' });
      return res.status(502).json({ success: false, message: 'Failed to execute test on agent', error: err.message, data: { uiTestId: uiTest._id, run: run.toObject() } });
    }
  } catch (error) {
    console.error('❌ Erro ao finalizar e executar UI Test:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Listar UI Tests com filtros
async function listUiTests(req, res) {
  try {
    const {
      search,
      systemSlug,
      finalized,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (systemSlug) filter.systemSlug = systemSlug;
    if (status) filter.status = status;
    if (typeof finalized !== 'undefined') filter.finalized = String(finalized) === 'true';
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { objective: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const [items, total] = await Promise.all([
      UiTest.find(filter).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
      UiTest.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: {
        total,
        page: pageNum,
        limit: limitNum,
        items
      }
    });
  } catch (error) {
    console.error('❌ Erro ao listar UI Tests:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Detalhe de um UI Test
async function getUiTestById(req, res) {
  try {
    const { uiTestId } = req.params;
    const uiTest = await UiTest.findById(uiTestId);
    if (!uiTest) {
      return res.status(404).json({ success: false, message: 'UI Test not found' });
    }
    // Opcional: trazer execuções relacionadas
    const runs = await UiTestRun.find({ relatedUiTestId: uiTest._id }).sort({ createdAt: -1 }).limit(20);
    return res.json({ success: true, data: { uiTest, runs } });
  } catch (error) {
    console.error('❌ Erro ao obter UI Test:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Apagar um UI Test
async function deleteUiTest(req, res) {
  try {
    const { uiTestId } = req.params;
    const uiTest = await UiTest.findById(uiTestId);
    if (!uiTest) {
      return res.status(404).json({ success: false, message: 'UI Test not found' });
    }
    // Apagar runs relacionadas
    await UiTestRun.deleteMany({ relatedUiTestId: uiTest._id });
    await UiTest.findByIdAndDelete(uiTestId);
    return res.json({ success: true, message: 'UI Test deleted successfully' });
  } catch (error) {
    console.error('❌ Erro ao apagar UI Test:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Executar um teste existente
async function runExistingTest(req, res) {
  try {
    const { uiTestId } = req.params;
    const uiTest = await UiTest.findById(uiTestId);
    if (!uiTest) {
      return res.status(404).json({ success: false, message: 'UI Test not found' });
    }
    if (!uiTest.steps || uiTest.steps.length === 0) {
      return res.status(400).json({ success: false, message: 'Teste não tem steps definidos' });
    }

    const testId = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const runReq = {
      steps: uiTest.steps,
      testId,
      recordVideo: true,
      videoSpeed: 2,
      videoCrf: 28
    };

    const run = new UiTestRun({
      testId,
      displayName: uiTest.title || uiTest.objective || uiTest.description || 'UI Test',
      description: uiTest.objective || uiTest.description || '',
      relatedUiTestId: uiTest._id,
      systemSlug: uiTest.systemSlug,
      testType: uiTest.testType || 'ui',
      steps: uiTest.steps,
      status: 'running',
      recordVideo: true,
      videoSpeed: 2,
      videoCrf: 28,
      createdBy: req.user?._id || req.user?.userId,
      agentRequest: runReq,
      startedAt: new Date()
    });
    await run.save();

    // Actualizar status do teste
    await UiTest.findByIdAndUpdate(uiTestId, { status: 'processing' });

    try {
      const agentResponse = await runUiAgentTest(runReq);
      run.agentResponse = agentResponse;
      run.status = 'completed';
      run.completedAt = new Date();
      if (agentResponse?.videoUrl) run.artifacts.videoUrl = agentResponse.videoUrl;
      if (agentResponse?.reportUrl) run.artifacts.reportUrl = agentResponse.reportUrl;
      await run.save();
      await UiTest.findByIdAndUpdate(uiTestId, { status: 'answered' });
      return res.json({
        success: true,
        message: 'Teste executado com sucesso',
        data: { run: run.toObject() }
      });
    } catch (err) {
      run.status = 'failed';
      run.error = err.message;
      await run.save();
      await UiTest.findByIdAndUpdate(uiTestId, { status: 'failed', error: err.message });
      return res.status(502).json({ success: false, message: 'Falha ao executar teste', error: err.message, data: { run: run.toObject() } });
    }
  } catch (error) {
    console.error('❌ Erro ao executar UI Test:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = { createUiTest, finalizeAndRun, listUiTests, getUiTestById, deleteUiTest, runExistingTest };

