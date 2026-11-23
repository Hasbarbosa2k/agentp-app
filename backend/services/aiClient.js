const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3001';

async function healthCheck() {
  const res = await fetch(`${AI_SERVER_URL}/health`, { method: 'GET' });
  if (!res.ok) throw new Error(`AI health failed: ${res.status}`);
  return res.json();
}

/**
 * Chama o endpoint de diagnóstico com RAG por sistema
 * @param {{system: string, issue: string, topK?: number, options?: object}} payload 
 */
async function issueSolver(payload) {
  console.log('🧠 [AI-CLIENT] outbound ->', {
    url: `${AI_SERVER_URL}/api/issue-solver`,
    bodyPreview: {
      system: payload.system,
      issuePreview: String(payload.issue).slice(0, 180) + (String(payload.issue).length > 180 ? '...' : ''),
      topK: payload.topK,
      options: {
        ...(payload.options || {}),
        history: Array.isArray(payload.options?.history) ? `items: ${payload.options.history.length}` : undefined,
        historyPrompt: payload.options?.historyPrompt ? `${String(payload.options.historyPrompt).slice(0, 200)}...` : undefined
      }
    }
  });
  const res = await fetch(`${AI_SERVER_URL}/api/issue-solver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: payload.system,
      issue: payload.issue,
      topK: payload.topK ?? 8,
      options: payload.options || {}
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI issue-solver failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  console.log('🧠 [AI-CLIENT] inbound <-', {
    ok: true,
    hasText: !!json?.text,
    refs: Array.isArray(json?.references) ? json.references.length : 0
  });
  return json;
}

module.exports = { AI_SERVER_URL, healthCheck, issueSolver };

/**
 * Envia outputs de comandos para sumarização de sistema
 * @param {{ top?: string, systemctl?: string, netstat?: string, osRelease?: string }} payload
 */
async function systemSummary(payload) {
  const url = `${AI_SERVER_URL}/api/system/summary`;
  console.log('🧠 [AI-CLIENT] outbound ->', {
    url,
    bodyPreview: {
      top: payload.top ? `${payload.top.slice(0, 120)}${payload.top.length > 120 ? '...' : ''}` : undefined,
      systemctl: payload.systemctl ? `${payload.systemctl.slice(0, 120)}${payload.systemctl.length > 120 ? '...' : ''}` : undefined,
      netstat: payload.netstat ? `${payload.netstat.slice(0, 120)}${payload.netstat.length > 120 ? '...' : ''}` : undefined,
      osRelease: payload.osRelease ? `${payload.osRelease.slice(0, 120)}${payload.osRelease.length > 120 ? '...' : ''}` : undefined
    }
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text().catch(() => '');
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  console.log('🧠 [AI-CLIENT] inbound <-', {
    status: res.status,
    ok: res.ok,
    hasSummary: !!(json && (json.summary || json.data?.summary)),
    bodyLength: text?.length || 0
  });

  if (!res.ok) {
    throw new Error(`AI system-summary failed: ${res.status} ${text?.slice(0, 200)}`);
  }

  // Normalização mínima para facilitar consumo no controller
  const normalized = json || {};
  if (!normalized.plan && normalized.text) {
    normalized.plan = normalized.text;
  }
  if (!normalized.steps && Array.isArray(normalized.data?.steps)) {
    normalized.steps = normalized.data.steps;
  }
  return normalized;
}

module.exports.systemSummary = systemSummary;

/**
 * Solicita plano de teste UI ou Sistema
 * @param {{ instruction: string, system: string, testType?: string, options?: object }} payload
 */
async function uiTestPlan(payload) {
  const url = `${AI_SERVER_URL}/api/ui/test-plan`;
  const testType = payload.testType || 'ui';
  
  console.log('🧠 [AI-CLIENT] outbound ->', {
    url,
    bodyPreview: {
      instructionPreview: String(payload.instruction || '').slice(0, 160),
      system: payload.system,
      testType
    }
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: payload.instruction,
      system: payload.system,
      testType,
      options: payload.options || {}
    })
  });

  const text = await res.text().catch(() => '');
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    throw new Error(`AI ui-test-plan failed: ${res.status} ${text?.slice(0, 200)}`);
  }

  console.log('🧠 [AI-CLIENT] inbound <-', {
    status: res.status,
    ok: res.ok,
    hasPlan: !!(json && (json.plan || json.data?.plan || json.steps))
  });

  // Log detalhado do plano (quando disponível)
  try {
    const planText = (json && (json.plan || json.data?.plan)) ? (json.plan || json.data?.plan) : null;
    const steps = (json && (Array.isArray(json.steps) ? json.steps : (Array.isArray(json.data?.steps) ? json.data.steps : null))) || null;
    if (planText) {
      const maxLen = 8000; // evitar logs infinitos
      const fullOrTruncated = String(planText).length > maxLen ? `${String(planText).slice(0, maxLen)}... [truncated]` : String(planText);
      console.log('🧠 [AI-CLIENT] ui-test-plan PLAN <-\n' + fullOrTruncated);
    }
    if (steps) {
      console.log('🧠 [AI-CLIENT] ui-test-plan STEPS <- count:', steps.length);
      // imprimir até 20 passos detalhados
      const maxSteps = 20;
      const detailed = steps.slice(0, maxSteps);
      console.log('🧠 [AI-CLIENT] ui-test-plan STEPS DETAILS <-', JSON.stringify(detailed, null, 2));
      if (steps.length > maxSteps) {
        console.log(`🧠 [AI-CLIENT] ui-test-plan STEPS <- more steps not shown: ${steps.length - maxSteps}`);
      }
    }
  } catch (e) {
    console.warn('⚠️ [AI-CLIENT] Failed to log detailed ui-test-plan:', e.message);
  }

  return json || {};
}

module.exports.uiTestPlan = uiTestPlan;

