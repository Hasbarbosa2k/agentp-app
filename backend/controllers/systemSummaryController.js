const { getOpenAIEngine } = require('../ai/engines/openai');

function buildPrompt(top, systemctl, netstat, osRelease) {
  const system = `You are an expert Linux system analyzer. Summarize the provided raw command outputs into a strict JSON object with the following shape (no extra keys, no markdown, no prose):\n\n{\n  "summary": {\n    "topProcesses": [ { "name": string, "cpuPercent": number } ],\n    "activeServices": [ { "name": string, "state": string } ],\n    "openPorts": [ { "port": number, "label": string, "proto": string, "process": string } ],\n    "systemInfo": {\n      "kernel": string,\n      "arch": string,\n      "loadAvg": [number, number, number],\n      "users": number,\n      "osName": string,\n      "osVersion": string\n    }\n  }\n}\n\nRules:\n- Return JSON only.\n- Numbers must be numbers (not strings).\n- Derive kernel/arch from context if available; else set empty string.\n- If a field cannot be determined, use sensible defaults: empty arrays or empty strings and 0s.\n- Limit topProcesses to 10 at most.`;

  const user = [
    `TOP OUTPUT:\n${top || ''}`,
    `SYSTEMCTL ACTIVE SERVICES:\n${systemctl || ''}`,
    `NETSTAT LISTENING:\n${netstat || ''}`,
    `OS RELEASE:\n${osRelease || ''}`
  ].join('\n\n');

  return { system, user, temperature: 0.2, maxTokens: 1200 };
}

function cleanAndParseJson(possibleJson) {
  if (!possibleJson) return null;
  const cleaned = String(possibleJson)
    .replace(/^```json\s*/i, '')
    .replace(/^```/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function summarizeSystem(req, res) {
  try {
    const { top, systemctl, netstat, osRelease } = req.body || {};
    if (!top && !systemctl && !netstat && !osRelease) {
      return res.status(400).json({ success: false, message: 'Envie pelo menos um dos campos: top, systemctl, netstat, osRelease' });
    }

    const engine = getOpenAIEngine();
    if (!engine.isConfigured()) {
      return res.status(503).json({ success: false, message: 'OPENAI_API_KEY não configurada no backend' });
    }

    const prompt = buildPrompt(top, systemctl, netstat, osRelease);
    const response = await engine.generateContent(prompt, { model: process.env.OPENAI_MODEL, maxTokens: 1400, temperature: 0.2 });
    const parsed = cleanAndParseJson(response.content);

    if (!parsed || !parsed.summary) {
      return res.status(502).json({ success: false, message: 'Falha ao interpretar resposta da IA', raw: response.content });
    }

    return res.json({ success: true, data: parsed });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
  }
}

module.exports = { summarizeSystem };

