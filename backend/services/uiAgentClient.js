const UI_AGENT_URL = process.env.UI_AGENT_URL || 'http://localhost:3002';

/**
 * Dispara execução de UI test no agente externo
 * @param {{ steps: string[], testId: string, recordVideo?: boolean, videoSpeed?: number, videoCrf?: number }} payload
 * @returns {Promise<any>}
 */
async function runUiAgentTest(payload) {
  const url = `${UI_AGENT_URL}/agent/run`;
  console.log('🎬 [UI-AGENT] outbound ->', { url, testId: payload.testId, steps: payload.steps.length });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text().catch(() => '');
  let json; try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  console.log('🎬 [UI-AGENT] inbound <-', { status: res.status, ok: res.ok });
  if (!res.ok) throw new Error(`UI Agent run failed: ${res.status} ${text?.slice(0,200)}`);
  return json || {};
}

module.exports = { UI_AGENT_URL, runUiAgentTest };

