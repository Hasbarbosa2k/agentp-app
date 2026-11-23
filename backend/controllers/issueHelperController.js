const IssueMessage = require('../models/IssueMessage');
const { issueSolver } = require('../services/aiClient');

// Criar uma nova mensagem de issue (user -> system)
async function createIssueMessage(req, res) {
  try {
    const userId = req.user?._id;
    const { systemId, subject, message, context } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }
    if (!systemId) {
      return res.status(400).json({ success: false, message: 'systemId é obrigatório' });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Mensagem é obrigatória' });
    }

    const doc = await IssueMessage.create({
      userId,
      systemId,
      subject: subject?.trim() || null,
      message: message.trim(),
      context: context || {},
      status: 'pending'
    });

    return res.status(201).json({ success: true, message: 'Issue registada', data: doc });
  } catch (err) {
    console.error('Erro a criar IssueMessage:', err);
    return res.status(500).json({ success: false, message: 'Erro interno', error: err.message });
  }
}

// Obter mensagem por id
async function getIssueMessageById(req, res) {
  try {
    const { id } = req.params;
    const doc = await IssueMessage.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Registo não encontrado' });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro interno', error: err.message });
  }
}

// Listar mensagens por sistema
async function listIssuesBySystem(req, res) {
  try {
    const { systemId } = req.params;
    const { limit = 50, status, since } = req.query;
    const query = { systemId };
    if (status) query.status = status;
    if (since) query.createdAt = { $gte: new Date(since) };
    const items = await IssueMessage.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro interno', error: err.message });
  }
}

// Listar mensagens do utilizador autenticado
async function listIssuesByUser(req, res) {
  try {
    const userId = req.user?._id;
    const { limit = 50, status, since } = req.query;
    if (!userId) return res.status(401).json({ success: false, message: 'Não autenticado' });
    const query = { userId };
    if (status) query.status = status;
    if (since) query.createdAt = { $gte: new Date(since) };
    const items = await IssueMessage.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro interno', error: err.message });
  }
}

// Endpoint para registar resposta vinda do motor de IA externo
async function setAIResponse(req, res) {
  try {
    const { id } = req.params;
    const { aiResponse, status = 'answered', aiMeta } = req.body;
    const update = {
      aiResponse: aiResponse ?? null,
      status,
      respondedAt: ['answered', 'failed'].includes(status) ? new Date() : null
    };
    if (aiMeta) update.aiMeta = aiMeta;
    const doc = await IssueMessage.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Registo não encontrado' });
    return res.json({ success: true, message: 'Resposta registada', data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro interno', error: err.message });
  }
}

module.exports = {
  createIssueMessage,
  getIssueMessageById,
  listIssuesBySystem,
  listIssuesByUser,
  setAIResponse,
  // Chamar IA para resolver issue e gravar resposta
  async solveIssueWithAI(req, res) {
    try {
      const { id } = req.params;
      const doc = await IssueMessage.findById(id);
      if (!doc) return res.status(404).json({ success: false, message: 'Registo não encontrado' });

      // Atualizar estado para processing
      await IssueMessage.updateOne({ _id: id }, { status: 'processing' });

      // Derivar parâmetros a partir do registo se não vierem no body
      const body = req.body || {};
      const topK = body.topK ?? 8;
      const effectiveSystem = body.system
        || doc?.context?.system?.name
        || doc?.context?.system?.id
        || String(doc.systemId);
      const effectiveIssue = body.issue || doc.message;

      // Construir histórico a partir do contexto e/ou body
      const contextHistory = Array.isArray(doc?.context?.previousMessages)
        ? doc.context.previousMessages
        : [];
      const bodyHistory = Array.isArray(body.history) ? body.history : [];
      const history = bodyHistory.length > 0 ? bodyHistory : contextHistory;
      const historyPrompt = body.historyPrompt || doc?.context?.historyPrompt;

      // Incluir histórico dentro de options para o servidor de IA (compatível)
      const options = {
        ...(body.options || {}),
        history,
        historyPrompt
      };

      // Logs: pedido recebido
      console.log('🧠 [ISSUE-HELPER][SOLVE] request params:', { id });
      console.log('🧠 [ISSUE-HELPER][SOLVE] request body:', body);
      console.log('🧠 [ISSUE-HELPER][SOLVE] effective payload:', {
        system: effectiveSystem,
        issue: effectiveIssue,
        topK,
        options: {
          ...options,
          // resumir histórico nos logs
          history: Array.isArray(options.history) ? `items: ${options.history.length}` : undefined,
          historyPreview: Array.isArray(options.history) ? options.history.slice(0, 2) : undefined,
          historyPrompt: options.historyPrompt ? `${String(options.historyPrompt).slice(0, 200)}...` : undefined
        }
      });

      const ai = await issueSolver({ system: effectiveSystem, issue: effectiveIssue, topK, options });
      const updated = await IssueMessage.findByIdAndUpdate(
        id,
        {
          status: 'answered',
          aiResponse: ai,
          respondedAt: new Date()
        },
        { new: true }
      );
      return res.json({ success: true, message: 'Resposta obtida', data: updated });
    } catch (err) {
      console.error('Erro em solveIssueWithAI:', err);
      return res.status(500).json({ success: false, message: 'Erro ao consultar IA', error: err.message });
    }
  }
};

