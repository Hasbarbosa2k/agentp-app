const System = require('../models/System');
const sshService = require('../services/sshService');
const { getOpenAIEngine } = require('../ai/engines/openai');

function buildAISummaryPrompt(top, systemctl, netstat, osRelease) {
  const system = `You are an expert Linux system analyzer. Summarize the provided raw command outputs into a strict JSON object with the following shape (no extra keys, no markdown, no prose):\n\n{\n  "summary": {\n    "topProcesses": [ { "name": string, "cpuPercent": number } ],\n    "activeServices": [ { "name": string, "state": string } ],\n    "openPorts": [ { "port": number, "label": string, "proto": string, "process": string } ],\n    "systemInfo": {\n      "kernel": string,\n      "arch": string,\n      "loadAvg": [number, number, number],\n      "users": number,\n      "osName": string,\n      "osVersion": string\n    }\n  }\n}\n\nRules:\n- Return JSON only.\n- Numbers must be numbers (not strings).\n- Derive kernel/arch from context if available; else set empty string.\n- If a field cannot be determined, use sensible defaults: empty arrays or empty strings and 0s.\n- Limit topProcesses to 10 at most.`;

  const user = [
    `TOP OUTPUT:\n${top || ''}`,
    `SYSTEMCTL ACTIVE SERVICES:\n${systemctl || ''}`,
    `NETSTAT LISTENING:\n${netstat || ''}`,
    `OS RELEASE:\n${osRelease || ''}`
  ].join('\n\n');

  return { system, user, temperature: 0.2, maxTokens: 1200 };
}

function parseJsonSafe(content) {
  if (!content) return null;
  const cleaned = String(content)
    .replace(/^```json\s*/i, '')
    .replace(/^```/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

function coerceSummary(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.summary && typeof parsed.summary === 'object') return parsed;
  const keys = Object.keys(parsed);
  const looksLike = ['topProcesses','activeServices','openPorts','systemInfo'].some(k => keys.includes(k));
  if (looksLike) {
    return {
      summary: {
        topProcesses: Array.isArray(parsed.topProcesses) ? parsed.topProcesses : [],
        activeServices: Array.isArray(parsed.activeServices) ? parsed.activeServices : [],
        openPorts: Array.isArray(parsed.openPorts) ? parsed.openPorts : [],
        systemInfo: typeof parsed.systemInfo === 'object' && parsed.systemInfo !== null ? parsed.systemInfo : { kernel: '', arch: '', loadAvg: [0,0,0], users: 0, osName: '', osVersion: '' }
      }
    };
  }
  return null;
}

function mapSummaryToProfile(summary) {
  const safe = summary || {};
  const tp = Array.isArray(safe.topProcesses) ? safe.topProcesses : [];
  const sv = Array.isArray(safe.activeServices) ? safe.activeServices : [];
  const ps = Array.isArray(safe.openPorts) ? safe.openPorts : [];
  const info = safe.systemInfo || {};

  return {
    topProcesses: tp.map(p => ({
      name: String(p.name || ''),
      cpuUsage: typeof p.cpuPercent === 'number' ? `${p.cpuPercent}%` : String(p.cpuPercent || '')
    })),
    activeServices: sv.map(s => ({
      name: String(s.name || ''),
      status: String(s.state || s.status || '')
    })),
    openPorts: ps.map(p => ({
      port: String(p.port != null ? p.port : p.label || ''),
      protocol: String(p.proto || p.protocol || '')
    })),
    systemInfo: {
      kernel: String(info.kernel || ''),
      architecture: String(info.arch || info.architecture || ''),
      loadAverage: Array.isArray(info.loadAvg) ? info.loadAvg.join(', ') : String(info.loadAvg || info.loadAverage || ''),
      loggedUsers: String(info.users != null ? info.users : info.loggedUsers || '')
    }
  };
}

const runDiagnostics = async (req, res) => {
  try {
    const { systemId } = req.params;
    const { credentials } = req.body;
    if (!credentials || !credentials.username) {
      return res.status(400).json({ success: false, message: 'Credenciais SSH obrigatórias' });
    }

    const system = await System.findById(systemId);
    if (!system) {
      return res.status(404).json({ success: false, message: 'Sistema não encontrado' });
    }

    const commands = [
      'sudo -i',
      'top -b -n1 | head -n 20',
      'systemctl --type=service --state=active --no-pager --no-legend',
      'sudo netstat -plnt',
      'cat /etc/os-release'
    ];

    let connectionId;
    const results = [];
    const startAll = Date.now();

    try {
      const sshConfig = {
        host: system.ip,
        port: system.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        privateKeyPath: credentials.privateKeyPath,
        timeout: 30000,
        frontendUser: req.user?.userId || req.user?._id || 'unknown'
      };

      const connection = await sshService.createConnection(sshConfig);
      connectionId = connection.connectionId;

      for (const command of commands) {
        const t0 = Date.now();
        try {
          const result = await sshService.executeCommand(connectionId, command, { timeout: 30000, frontendUser: sshConfig.frontendUser });
          results.push({
            command,
            success: !!result.success,
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            exitCode: typeof result.exitCode === 'number' ? result.exitCode : (result.success ? 0 : 1),
            durationMs: Date.now() - t0
          });
        } catch (err) {
          results.push({
            command,
            success: false,
            stdout: '',
            stderr: err.message,
            exitCode: 1,
            durationMs: Date.now() - t0
          });
        }
      }

      await sshService.closeConnection(connectionId);
    } catch (sshErr) {
      if (connectionId) {
        try { await sshService.closeConnection(connectionId); } catch {}
      }
      return res.status(500).json({ success: false, message: 'Erro SSH', error: sshErr.message });
    }

    system.lastDiagnostics = {
      executedAt: new Date(),
      results
    };
    await system.save();

    // Preparar inputs para sumarização
    const byCmd = Object.fromEntries(results.map(r => [r.command, r]));
    const topOut = byCmd['top -b -n1 | head -n 20']?.stdout || '';
    const sysctlOut = byCmd['systemctl --type=service --state=active --no-pager --no-legend']?.stdout || '';
    const netstatOut = byCmd['sudo netstat -plnt']?.stdout || '';
    const osRelOut = byCmd['cat /etc/os-release']?.stdout || '';

    // Tentar enviar para o AI service externo (porta 3001)
    // Se falhar, usar o parser local como fallback
    let finalSummary = null;
    let aiSource = 'ai-service';

    try {
      const { systemSummary } = require('../services/aiClient');
      const aiResp = await systemSummary({
        top: topOut,
        systemctl: sysctlOut,
        netstat: netstatOut,
        osRelease: osRelOut
      });

      // Normalizar a forma de retorno { data: { summary } } ou { summary }
      let parsed = aiResp?.data || aiResp || null;
      finalSummary = parsed && parsed.summary ? parsed.summary : null;
      if (!finalSummary) {
        const coerced = coerceSummary(parsed);
        if (coerced) finalSummary = coerced.summary;
      }
    } catch (aiError) {
      console.warn('⚠️ AI service indisponível, usando parser local:', aiError.message);
      aiSource = 'local-parser';
    }

    // Se AI falhou ou não retornou dados, usar parser local
    if (!finalSummary) {
      console.log('📊 Usando parser local para gerar resumo do sistema');
      const { getSystemProfileParser } = require('../services/systemProfileParser');
      const parser = getSystemProfileParser();

      // Parse local dos outputs
      const localSummary = {
        topProcesses: parser.parseProcessesOutput(topOut).map(p => ({
          name: p.name,
          cpuPercent: parseFloat(p.cpuUsage) || 0
        })),
        activeServices: parser.parseServicesOutput(sysctlOut).map(s => ({
          name: s.name,
          state: s.status
        })),
        openPorts: parser.parsePortsOutput(netstatOut).map(p => ({
          port: parseInt(p.port.match(/:(\d+)/)?.[1]) || 0,
          label: p.port,
          proto: p.protocol,
          process: ''
        })),
        systemInfo: {
          kernel: parser.parseSystemInfoOutput(topOut).kernel || '',
          arch: parser.parseSystemInfoOutput(topOut).architecture || '',
          loadAvg: parser.parseSystemInfoOutput(topOut).loadAverage?.split(',').map(v => parseFloat(v.trim()) || 0) || [0, 0, 0],
          users: parseInt(parser.parseSystemInfoOutput(topOut).loggedUsers) || 0,
          osName: '',
          osVersion: ''
        }
      };

      finalSummary = localSummary;
      aiSource = 'local-parser';
    }

    if (!finalSummary) {
      // Último recurso: devolver estrutura vazia com raw para debug, mantendo 200 para não partir UI
      finalSummary = { topProcesses: [], activeServices: [], openPorts: [], systemInfo: { kernel: '', arch: '', loadAvg: [0,0,0], users: 0, osName: '', osVersion: '' } };
      aiSource = 'fallback-empty';
    }

    // Persistir no perfil do sistema (aiAnalyzedProfile)
    const mappedProfile = mapSummaryToProfile(finalSummary);
    system.aiAnalyzedProfile = {
      ...mappedProfile,
      lastAnalyzedAt: new Date(),
      aiMetadata: { model: aiSource, tokensUsed: null, onboardingId: null }
    };
    await system.save();

    res.json({ success: true, data: { summary: finalSummary, source: aiSource }, saved: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
  }
};

module.exports = { runDiagnostics };

