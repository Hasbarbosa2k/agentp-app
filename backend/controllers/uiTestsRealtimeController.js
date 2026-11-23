const { logRequest } = require('../middleware/auth');
const UiTest = require('../models/UiTest');

// Mapa de conexões SSE por uiTestId
const uiTestConnections = new Map(); // uiTestId -> Set<{res, sendEvent, connectedAt}>

function addConnection(uiTestId, res, sendEvent) {
  const set = uiTestConnections.get(uiTestId) || new Set();
  set.add({ res, sendEvent, connectedAt: new Date() });
  uiTestConnections.set(uiTestId, set);
}

function removeConnection(uiTestId, res) {
  const set = uiTestConnections.get(uiTestId);
  if (!set) return;
  for (const conn of set) {
    if (conn.res === res) set.delete(conn);
  }
  if (set.size === 0) uiTestConnections.delete(uiTestId);
}

function broadcastUiTestEvent(uiTestId, eventType, data) {
  const set = uiTestConnections.get(String(uiTestId));
  if (!set || set.size === 0) return;
  for (const conn of set) {
    try {
      conn.sendEvent(eventType, data);
    } catch (e) {
      // falha ao enviar, ignora
    }
  }
}

async function streamUiTestUpdates(req, res) {
  try {
    logRequest(req);
    const { uiTestId } = req.params;

    const exists = await UiTest.findById(uiTestId).select('_id status systemSlug createdAt updatedAt');
    if (!exists) {
      return res.status(404).json({ success: false, message: 'UI Test não encontrado' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendEvent = (eventType, data) => {
      const payload = JSON.stringify(data);
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${payload}\n\n`);
    };

    addConnection(String(uiTestId), res, sendEvent);

    // envia estado inicial
    sendEvent('initial_state', { uiTest: exists.toObject() });

    const heartbeat = setInterval(() => {
      sendEvent('heartbeat', { timestamp: new Date().toISOString() });
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeConnection(String(uiTestId), res);
    });
  } catch (err) {
    console.error('❌ Erro ao estabelecer stream de UI Test:', err);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

module.exports = { streamUiTestUpdates, broadcastUiTestEvent };

