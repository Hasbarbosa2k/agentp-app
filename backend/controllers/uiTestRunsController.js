const UiTestRun = require('../models/UiTestRun');
const UiTest = require('../models/UiTest');
const { runUiAgentTest, UI_AGENT_URL } = require('../services/uiAgentClient');

// Parâmetros fixos
const FIXED_AGENT_PARAMS = Object.freeze({
  recordVideo: true,
  videoSpeed: 2,
  videoCrf: 28,
});

async function createRun(req, res) {
  try {
    const { testId, steps, relatedUiTestId, systemSlug, displayName, description, testType } = req.body;

    // Garantir unicidade de testId
    const existing = await UiTestRun.findOne({ testId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'testId já existe', error: 'TEST_ID_EXISTS' });
    }

    // Validar existência do UiTest relacionado se fornecido
    let related = null;
    if (relatedUiTestId) {
      related = await UiTest.findById(relatedUiTestId).select('_id systemSlug');
      if (!related) {
        return res.status(404).json({ success: false, message: 'UiTest relacionado não encontrado' });
      }
    }

    const run = new UiTestRun({
      testId,
      displayName: displayName || 'UI Test',
      description: description || '',
      relatedUiTestId: related?._id || null,
      systemSlug: systemSlug || related?.systemSlug || null,
      testType: testType || 'ui',
      steps,
      status: 'queued',
      recordVideo: FIXED_AGENT_PARAMS.recordVideo,
      videoSpeed: FIXED_AGENT_PARAMS.videoSpeed,
      videoCrf: FIXED_AGENT_PARAMS.videoCrf,
      agentServiceUrl: UI_AGENT_URL,
      createdBy: req.user?._id || req.user?.userId
    });

    // Persistir antes de chamar o agente
    await run.save();

    // Preparar e chamar agente
    const agentPayload = {
      steps,
      testId,
      recordVideo: FIXED_AGENT_PARAMS.recordVideo,
      videoSpeed: FIXED_AGENT_PARAMS.videoSpeed,
      videoCrf: FIXED_AGENT_PARAMS.videoCrf
    };

    run.agentRequest = agentPayload;
    run.status = 'running';
    run.startedAt = new Date();
    await run.save();

    try {
      const agentResponse = await runUiAgentTest(agentPayload);
      run.agentResponse = agentResponse;
      run.status = 'completed';
      run.completedAt = new Date();
      // Optional: mapear URLs se vierem do serviço
      if (agentResponse?.videoUrl) run.artifacts.videoUrl = agentResponse.videoUrl;
      if (agentResponse?.reportUrl) run.artifacts.reportUrl = agentResponse.reportUrl;
      await run.save();
      return res.status(201).json({ success: true, message: 'UI Test run criado com sucesso', data: { run: run.toObject() } });
    } catch (err) {
      run.status = 'failed';
      run.error = err.message;
      await run.save();
      return res.status(502).json({ success: false, message: 'Falha ao executar teste no agente', error: err.message, data: { run: run.toObject() } });
    }
  } catch (error) {
    console.error('❌ Erro ao criar UI Test run:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

// Listar execuções
async function listRuns(req, res) {
  try {
    const { search, systemSlug, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = {};
    if (systemSlug) filter.systemSlug = systemSlug;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { testId: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    console.log('📋 [UI-TEST-RUNS] Listing runs with filter:', JSON.stringify(filter));
    
    const [items, total] = await Promise.all([
      UiTestRun.find(filter).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      UiTestRun.countDocuments(filter)
    ]);

    console.log('✅ [UI-TEST-RUNS] Found', total, 'runs');
    return res.json({ success: true, data: { total, page: pageNum, limit: limitNum, items } });
  } catch (error) {
    console.error('❌ [UI-TEST-RUNS] Erro ao listar runs:', error.message, error.stack);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
}

// Detalhe de uma execução
async function getRunById(req, res) {
  try {
    const { runId } = req.params;
    // runId já validado como ObjectId pelo validator; fallback defensivo
    if (!runId || String(runId).length < 12) {
      return res.status(400).json({ success: false, message: 'runId inválido' });
    }
    const run = await UiTestRun.findById(runId);
    if (!run) return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    return res.json({ success: true, data: { run } });
  } catch (error) {
    console.error('❌ Erro ao obter UI Test run:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

module.exports = { createRun, listRuns, getRunById };

