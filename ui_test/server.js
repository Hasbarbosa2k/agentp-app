const express = require('express');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const { z } = require('zod');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Optional image processing libs
let Jimp = null; try { Jimp = require('jimp'); } catch (_) { Jimp = null; }
let Sharp = null; try { Sharp = require('sharp'); } catch (_) { Sharp = null; }

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',  // Backend
  'http://localhost:5173',  // Frontend (Vite)
  'http://localhost:4173',  // Vite preview
  'http://localhost:3001',  // AI service
  process.env.FRONTEND_URL, // Production frontend
].filter(Boolean);

// Permitir acesso externo em desenvolvimento
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowExternalAccess = process.env.ALLOW_EXTERNAL_ACCESS === 'true' || isDevelopment;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowExternalAccess || !origin || allowedOrigins.includes(origin) || origin === undefined) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all for static assets
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Expose the tests directory so screenshots/videos are directly accessible
app.use('/tests', express.static(path.join(__dirname, 'tests')));
// Also expose under /api prefix for reverse-proxy setups
app.use('/api/tests', express.static(path.join(__dirname, 'tests')));

// In-memory run registry
const runs = new Map(); // runId -> { status, startedAt, finishedAt, testId, childPid, videoProcPid, logsPath }

function newRunRecord({ runId, testId, child, videoProc, logsPath }) {
  runs.set(runId, {
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    testId: testId || null,
    childPid: child?.pid || null,
    videoProcPid: videoProc?.pid || null,
    logsPath: logsPath || null,
  });
}

function completeRunRecord(runId) {
  const r = runs.get(runId);
  if (!r) return;
  r.status = 'finished';
  r.finishedAt = new Date().toISOString();
}

function failRunRecord(runId, message) {
  const r = runs.get(runId);
  if (!r) return;
  r.status = 'error';
  r.finishedAt = new Date().toISOString();
  r.error = message;
}

function stopRunRecord(runId) {
  const r = runs.get(runId);
  if (!r) return;
  r.status = 'stopping';
}

// Swagger/OpenAPI
const cropSchema = z.object({ width: z.number().int().positive(), height: z.number().int().positive(), offsetX: z.number().int().nonnegative().optional(), offsetY: z.number().int().nonnegative().optional() });
const inputSchema = z.object({
  steps: z.any().optional(),
  task: z.string().min(1).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  timeoutSec: z.number().int().positive().optional(),
  testId: z.string().min(1).optional(),
  recordVideo: z.boolean().optional(),
  windowTitle: z.string().min(1).optional(),
  videoCrop: cropSchema.optional(),
  desktopRecorder: z.boolean().optional(),
  videoSpeed: z.number().positive().optional(),
  videoCrf: z.number().min(0).max(51).optional(),
  keepExtraVideos: z.boolean().optional(),
  expected: z.any().optional(),
});

const openApiSpec = {
  openapi: '3.0.0',
  info: { title: 'Browser-Use Agent API', version: '0.2.0', description: 'Async multi-run API with status endpoints.' },
  servers: [{ url: 'http://localhost:3002', description: 'Local' }],
  paths: {
    '/agent/run': {
      post: {
        summary: 'Start a new agent run (async)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
        responses: { '202': { description: 'Accepted', content: { 'application/json': { schema: { type: 'object' } } } } }
      }
    },
    '/agent/logs/{runId}': {
      get: { summary: 'Stream logs of a run', parameters: [{ name: 'runId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'text/plain stream' }, '404': { description: 'Not found' } } }
    },
    '/agent/status/{runId}': {
      get: { summary: 'Get status of a run', parameters: [{ name: 'runId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Run status', content: { 'application/json': { schema: { type: 'object' } } } }, '404': { description: 'Not found' } } }
    },
    '/agent/runs': {
      get: { summary: 'List runs', responses: { '200': { description: 'List of runs', content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } } } } }
    },
    '/agent/stop/{runId}': {
      post: { summary: 'Stop a specific run', parameters: [{ name: 'runId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Stopping/idle' }, '404': { description: 'Not found' } } }
    },
    '/agent/assets/{testId}': {
      get: {
        summary: 'List screenshots and primary video for a testId',
        parameters: [{ name: 'testId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Assets list', content: { 'application/json': { schema: { type: 'object' } } } }, '400': { description: 'Bad testId' } }
      }
    },
    '/agent/test/{testId}': {
      get: {
        summary: 'Get complete test information including plan, assets, logs, and metadata',
        parameters: [{ name: 'testId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Complete test information', content: { 'application/json': { schema: { type: 'object' } } } }, '400': { description: 'Invalid testId' }, '500': { description: 'Server error' } }
      }
    },
  }
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));

// Helpers for video post-process (same as previous version)
async function transcodeVideoToSpeed(srcPath, speed = 2.0, crf = 28) {
  return new Promise((resolve) => {
    const dir = path.dirname(srcPath);
    const base = path.basename(srcPath, path.extname(srcPath));
    const dstPath = path.join(dir, `${base}_tmp.mp4`);
    const setpts = (1 / speed).toFixed(6);
    const args = ['-y', '-i', srcPath, '-an', '-filter:v', `setpts=${setpts}*PTS`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), dstPath];
    const ff = spawn('ffmpeg', args, { windowsHide: true });
    ff.on('close', async (code) => {
      if (code === 0) {
        try { await fs.remove(srcPath).catch(() => {}); await fs.move(dstPath, path.join(dir, `${base}.mp4`), { overwrite: true }); resolve({ ok: true, path: path.join(dir, `${base}.mp4`) }); }
        catch (e) { resolve({ ok: false, error: e }); }
      } else { resolve({ ok: false, error: new Error(`ffmpeg exited ${code}`) }); }
    });
  });
}
function probeDurationSec(srcPath) { try { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', srcPath], { encoding: 'utf8', windowsHide: true }); if (r.status === 0 && r.stdout) { const v = parseFloat(String(r.stdout).trim()); return Number.isFinite(v) ? v : null; } return null; } catch (_) { return null; } }
async function transcodeAllInDir(dir, speed, crf) { if (!await fs.pathExists(dir)) return []; const files = await fs.readdir(dir); const targets = files.filter(f => /\.(webm|mp4)$/i.test(f)).map(f => path.join(dir, f)); const results = []; for (const src of targets) { if (src.includes('_tmp')) continue; const out = await transcodeVideoToSpeed(src, speed, crf); results.push({ src, ...out }); } return results; }
async function pruneExtraVideos(dir, keepExtras, res) { if (keepExtras) return; if (!await fs.pathExists(dir)) return; const files = (await fs.readdir(dir)).filter(f => /\.(mp4)$/i.test(f)); if (files.length <= 1) return; const stats = await Promise.all(files.map(async f => { const full = path.join(dir, f); const dur = probeDurationSec(full); const s = await fs.stat(full); return { file: f, full, duration: dur ?? 0, size: s.size }; })); stats.sort((a, b) => (b.duration - a.duration) || (b.size - a.size)); const keep = stats[0]; const remove = stats.slice(1); for (const r of remove) { try { await fs.remove(r.full); } catch (_) {} } if (remove.length > 0) { res.write(`\n[agent] pruned ${remove.length} extra video(s); kept ${keep.file} (${(keep.duration || 0).toFixed(1)}s)\n`); } }

// Helpers for assets listing
function isValidTestId(testId) { return /^[a-zA-Z0-9._-]+$/.test(testId); }
function buildBaseUrl(req) { const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http'); const host = req.get('host'); return `${proto}://${host}`; }
function naturalStepSort(a, b) { const ra = /step_(\d+)/i.exec(a); const rb = /step_(\d+)/i.exec(b); if (ra && rb) { const na = parseInt(ra[1], 10); const nb = parseInt(rb[1], 10); if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb; } return a.localeCompare(b); }

// Resolve a Python executable to run the agent
function resolvePythonExecutable() {
  // Allow override via env PYTHON_EXE
  const override = process.env.PYTHON_EXE;
  if (override && override.length > 0) return override;
  const venvPy = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
  try { if (fs.existsSync(venvPy)) return venvPy; } catch (_) {}
  // On Windows, prefer py launcher if present
  try { spawnSync('py', ['-V'], { windowsHide: true }); return 'py'; } catch (_) {}
  // Fallback to python from PATH
  return 'python';
}

// Parse step descriptions from logs (e.g., "Step 12: Navigating to ...")
function parseStepDescriptions(logText) {
  const map = new Map();
  if (!logText || typeof logText !== 'string') return map;
  const lines = logText.split(/\r?\n/);
  for (const line of lines) {
    const m = /Step\s*(\d+)\s*:\s*(.+)/i.exec(line);
    if (m) {
      const num = parseInt(m[1], 10);
      if (Number.isFinite(num) && !map.has(num)) {
        // Trim noisy tails like durations
        let desc = m[2].trim();
        desc = desc.replace(/\s*\(.*?\)\s*$/, '').trim();
        if (desc.length > 180) desc = desc.slice(0, 177) + '...';
        map.set(num, desc);
      }
    }
  }
  return map;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildXmpPacket(description) {
  const safe = escapeXml(description || '');
  const xmp = `<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
    `  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
    `    <rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/">\n` +
    `      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${safe}</rdf:li></rdf:Alt></dc:description>\n` +
    `    </rdf:Description>\n` +
    `  </rdf:RDF>\n` +
    `</x:xmpmeta>\n` +
    `<?xpacket end="w"?>`;
  return Buffer.from(xmp, 'utf8');
}

// Embed description into image metadata (XMP) if Sharp is available (PNG/JPEG)
async function annotateScreenshots(dir, stepDescMap) {
  try {
    if (!await fs.pathExists(dir)) return false;
    const files = (await fs.readdir(dir)).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    if (files.length === 0) return false;
    if (!Sharp) return false;
    for (const f of files) {
      const full = path.join(dir, f);
      let desc = null;
      const m = /step_(\d+)/i.exec(f);
      if (m) {
        const num = parseInt(m[1], 10);
        if (Number.isFinite(num) && stepDescMap.has(num)) desc = `Step ${num}: ${stepDescMap.get(num)}`;
      }
      if (!desc) desc = f;
      const tmp = `${full}.tmp`;
      const xmp = buildXmpPacket(desc);
      await Sharp(full).withMetadata({ xmp }).toFile(tmp);
      await fs.move(tmp, full, { overwrite: true });
    }
    return true;
  } catch (_) {
    return false;
  }
}

async function buildAssetsResponse(testId, req) {
  const baseUrl = buildBaseUrl(req);
  const testRoot = path.join(__dirname, 'tests', testId);
  const shotsDir = path.join(testRoot, 'screenshots');
  const videoDir = path.join(testRoot, 'video');

  const screenshots = [];
  if (await fs.pathExists(shotsDir)) {
    const files = (await fs.readdir(shotsDir)).filter(f => /\.(png|jpg|jpeg)$/i.test(f)).sort(naturalStepSort);
    for (const f of files) { screenshots.push({ name: f, url: `${baseUrl}/tests/${encodeURIComponent(testId)}/screenshots/${encodeURIComponent(f)}` }); }
  }

  let video = null;
  if (await fs.pathExists(videoDir)) {
    const vfiles = (await fs.readdir(videoDir)).filter(f => /\.(mp4|webm)$/i.test(f));
    if (vfiles.length > 0) {
      const stats = await Promise.all(vfiles.map(async f => { const full = path.join(videoDir, f); const dur = probeDurationSec(full) ?? 0; const s = await fs.stat(full); const isMp4 = /\.mp4$/i.test(f); return { name: f, full, duration: dur, size: s.size, isMp4 }; }));
      stats.sort((a, b) => (b.duration - a.duration) || ((b.isMp4 === a.isMp4) ? 0 : (b.isMp4 ? 1 : -1)) || (b.size - a.size));
      const top = stats[0];
      video = { name: top.name, url: `${baseUrl}/tests/${encodeURIComponent(testId)}/video/${encodeURIComponent(top.name)}` };
    }
  }
  return { testId, screenshots, video };
}

// Helpers to update plan status on disk
async function writePlanStatus(testId, status) {
  try {
    const planPath = path.join(__dirname, 'tests', testId, 'plan.json');
    let plan = {};
    if (await fs.pathExists(planPath)) {
      try { plan = JSON.parse(await fs.readFile(planPath, 'utf8')); } catch (_) { plan = {}; }
    }
    plan.status = status;
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2), 'utf8');
    // Also update plan.md status section if present
    try {
      const mdPath = path.join(__dirname, 'tests', testId, 'plan.md');
      if (await fs.pathExists(mdPath)) {
        const raw = await fs.readFile(mdPath, 'utf8');
        const lines = raw.split(/\r?\n/);
        let idx = lines.findIndex((l) => /^##\s*Estado\s*$/i.test(l.trim()));
        if (idx !== -1) {
          const nextIdx = idx + 1;
          if (nextIdx < lines.length) { lines[nextIdx] = status; } else { lines.push(status); }
          await fs.writeFile(mdPath, lines.join('\n'), 'utf8');
        } else {
          lines.push('', '## Estado', status);
          await fs.writeFile(mdPath, lines.join('\n'), 'utf8');
        }
      }
    } catch (_) {}
  } catch (_) {}
}

async function writeInitialPlanFiles(effTestId, runId, model, temperature, task, steps, expectedArr) {
  const testRoot = path.join(__dirname, 'tests', effTestId);
  await fs.ensureDir(testRoot);
  const plan = {
    runId,
    testId: effTestId,
    createdAt: new Date().toISOString(),
    model: model || null,
    temperature: (typeof temperature === 'number') ? temperature : null,
    task,
    steps: Array.isArray(steps) ? steps : [],
    expected: expectedArr,
    status: 'pending',
  };
  await fs.writeFile(path.join(testRoot, 'plan.json'), JSON.stringify(plan, null, 2), 'utf8');
  const md = [];
  md.push('# Plano');
  md.push('');
  md.push(`- **Run ID**: ${runId}`);
  md.push(`- **Test ID**: ${effTestId}`);
  if (model) md.push(`- **Modelo**: ${model}`);
  if (typeof temperature === 'number') md.push(`- **Temperatura**: ${temperature}`);
  md.push('');
  md.push('## Tarefa');
  md.push('```');
  md.push(task);
  md.push('```');
  if (Array.isArray(steps) && steps.length) {
    md.push('');
    md.push('## Passos');
    steps.forEach((s, i) => md.push(`${i + 1}. ${s}`));
  }
  if (expectedArr.length) {
    md.push('');
    md.push('## Resultados esperados');
    expectedArr.forEach((e) => md.push(`- ${e}`));
  }
  md.push('');
  md.push('## Estado');
  md.push('pending');
  await fs.writeFile(path.join(testRoot, 'plan.md'), md.join('\n'), 'utf8');
}


// Async run endpoint: returns runId and starts background process
app.post('/agent/run', async (req, res) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) { return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() }); }

  const runId = uuidv4();
  const { steps, task: taskRaw, model, temperature, timeoutSec, testId, recordVideo, windowTitle, videoCrop, desktopRecorder, videoSpeed, videoCrf, keepExtraVideos, expected } = parsed.data;
  const effTestId = testId || runId; // fallback to runId as testId if not provided
  const testRoot = path.join(__dirname, 'tests', effTestId);
  await fs.ensureDir(testRoot);
  const logPath = path.join(testRoot, 'run.log');
  await fs.ensureFile(logPath);
  try { await fs.appendFile(logPath, `[agent] initializing run ${runId} for testId=${effTestId}\n`, 'utf8'); } catch (_) {}
  const logStream = (await fs.createWriteStream(logPath, { flags: 'a' }));
  const writeLog = (s) => { try { logStream.write(s); } catch (_) {} };
  const stepsArr = Array.isArray(steps) ? steps : (typeof steps === 'string' ? steps.split(/\r?\n/).filter(Boolean) : []);
  const task = taskRaw || (stepsArr.length ? ['Execute the following steps sequentially. Confirm each step is completed before moving to the next. If there are no more steps, finish the task and stop.', ...stepsArr.map((s, i) => `${i + 1}. ${String(s).trim()}`)].join('\n') : null);

  const pythonExe = resolvePythonExecutable();
  const args = [path.join(__dirname, 'run_agent.py')];
  if (typeof task === 'string' && task.length > 0) { args.push('--task', task); } else { writeLog('[agent] no task provided; relying on Python default task\n'); }
  if (typeof model === 'string' && model.length > 0) args.push('--model', model);
  if (typeof temperature === 'number') args.push('--temperature', String(temperature));

  const shouldRecordVideo = Boolean(effTestId) && (recordVideo === undefined ? true : recordVideo === true);
  const shouldUseFfmpeg = Boolean(windowTitle) || desktopRecorder === true;
  const speedFactor = typeof videoSpeed === 'number' && videoSpeed > 0 ? videoSpeed : 2.0;
  const crfValue = typeof videoCrf === 'number' ? videoCrf : 28;

  writeLog(`[agent] run ${runId} started for testId=${effTestId}\n`);
  writeLog(`[agent] using python executable: ${pythonExe}\n`);
  const child = spawn(pythonExe, args, {
    cwd: __dirname,
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
      ...(shouldRecordVideo && !shouldUseFfmpeg ? {
        PLAYWRIGHT_RECORD_VIDEO_DIR: path.join(__dirname, 'tests', effTestId, 'video'),
        PLAYWRIGHT_RECORD_VIDEO_SIZE: (videoCrop && videoCrop.width && videoCrop.height) ? `${videoCrop.width}x${videoCrop.height}` : '1280x720',
        PLAYWRIGHT_FORCE_HEADLESS: '1',  // Back to headless mode - Playwright can record video in headless
      } : {}),
    },
    windowsHide: true,
  });

  // Capture immediate spawn failure (e.g., ENOENT)
  child.on('spawn', () => { writeLog('[agent] python process spawned successfully\n'); });
  try {
    child.stdin?.write('\n');
  } catch (_) {}

  newRunRecord({ runId, testId: effTestId, child, videoProc: null, logsPath: logPath });

  // Write structured plan files for this run
  try {
    const expectedArr = Array.isArray(expected) ? expected : (typeof expected === 'string' ? [expected] : []);
    await writeInitialPlanFiles(effTestId, runId, model, temperature, task, stepsArr, expectedArr);
  } catch (e) { try { logStream.write(`[agent] failed to write plan files: ${String(e)}\n`); } catch (_) {} }
  writePlanStatus(effTestId, 'running');

  // Background orchestration
  let logBuf = '';
  let triedStartVideo = false;
  let videoProc = null;
  let shotsSrcDir = null;
  let shotsWatcher = null;
  const idleMs = Math.max(10, (timeoutSec || 600)) * 1000;
  let idleTimer = setTimeout(() => { try { child.kill('SIGTERM'); } catch (_) {} }, idleMs);
  const bumpTimer = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => { try { child.kill('SIGTERM'); } catch (_) {} }, idleMs); };

  // Hard cap: terminate the run if total duration exceeds 3 minutes (180s)
  const hardCapMs = 180 * 1000;
  let hardTimedOut = false;
  let hardCapTimer = setTimeout(() => {
    hardTimedOut = true;
    try { writeLog(`[agent] hard timeout reached (${hardCapMs / 1000}s). Terminating run.\n`); } catch (_) {}
    try { child.kill('SIGTERM'); } catch (_) {}
  }, hardCapMs);

  

  function buildFfmpegArgs(destPath) {
    const targetW = (videoCrop && videoCrop.width) ? videoCrop.width : 1280;
    const targetH = (videoCrop && videoCrop.height) ? videoCrop.height : 720;
    const scalePad = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
    if (windowTitle) {
      return ['-y', '-f', 'gdigrab', '-framerate', '30', '-i', `title=${windowTitle}`, '-vf', scalePad, '-pix_fmt', 'yuv420p', '-vcodec', 'libx264', '-preset', 'ultrafast', destPath];
    }
    const args2 = ['-y', '-f', 'gdigrab', '-framerate', '30'];
    if (videoCrop && videoCrop.width && videoCrop.height) {
      const ox = videoCrop.offsetX || 0;
      const oy = videoCrop.offsetY || 0;
      args2.push('-offset_x', String(ox), '-offset_y', String(oy), '-video_size', `${videoCrop.width}x${videoCrop.height}`);
    }
    args2.push('-i', 'desktop', '-vf', scalePad, '-pix_fmt', 'yuv420p', '-vcodec', 'libx264', '-preset', 'ultrafast', destPath);
    return args2;
  }

  async function startVideoIfNeeded() {
    if (!shouldRecordVideo || !shouldUseFfmpeg || videoProc) return;
    try {
      const videoDir = path.join(__dirname, 'tests', effTestId, 'video');
      await fs.ensureDir(videoDir);
      const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const videoPath = path.join(videoDir, `test_${ts}.mp4`);
      const ffmpegArgs = buildFfmpegArgs(videoPath);
      const ff = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
      videoProc = ff;
      const r = runs.get(runId); if (r) r.videoProcPid = ff.pid;
      writeLog(`[agent] video recording started -> ${videoPath}\n`);
      ff.stderr.on('data', () => {});
      ff.stdout.on('data', () => {});
      ff.on('error', (e) => { writeLog(`[agent] ffmpeg error: ${String(e)}\n`); videoProc = null; });
    } catch (e) { writeLog(`[agent] unable to start video recording: ${String(e)}\n`); videoProc = null; }
  }

  function maybeStartVideoFromLogs(s) { if (triedStartVideo || !shouldUseFfmpeg) return; if (/Launching new local browser|Spawning Chrome subprocess|Connecting to newly spawned browser/i.test(s)) { triedStartVideo = true; startVideoIfNeeded(); } }

  async function tryStartScreenshotsMirrorFromLogs(s) {
    if (shotsSrcDir) return;
    
    // Procurar por ambos os padrões no log atual
    let detected = null;
    const m1 = /Screenshot service initialized in:\s*(.+)/.exec(s);
    if (m1 && m1[1]) {
      detected = m1[1].trim();
    } else {
      const m2 = /File system path:\s*(.+)/.exec(s);
      if (m2 && m2[1]) {
        // Browser Use sometimes logs only the base path; screenshots live under "screenshots"
        detected = path.join(m2[1].trim(), 'screenshots');
      }
    }
    
    // Se não encontrou nenhum padrão, retornar
    if (!detected) return;
    
    // Atualizar o diretório de screenshots
    shotsSrcDir = detected;
    const destDir = path.join(__dirname, 'tests', effTestId, 'screenshots');
    
    // Verificar se source e destination são o mesmo diretório
    if (path.resolve(shotsSrcDir) === path.resolve(destDir)) {
      writeLog(`[agent] screenshot source and destination are the same, skipping mirror setup\n`);
      return;
    }
    
    try {
      // Garantir que o diretório de destino exista
      await fs.ensureDir(destDir);
      
      // Verificar se o diretório de origem existe e criar se necessário
      try {
        await fs.ensureDir(shotsSrcDir);
      } catch (dirErr) {
        writeLog(`[agent] warning: could not ensure screenshot source directory: ${String(dirErr)}\n`);
      }
      
      // Cópia inicial de screenshots existentes
      if (await fs.pathExists(shotsSrcDir)) {
        const files = (await fs.readdir(shotsSrcDir)).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
        for (const f of files) {
          try {
            await fs.copy(path.join(shotsSrcDir, f), path.join(destDir, f), { overwrite: true });
            writeLog(`[agent] screenshot copied: ${f}\n`);
          } catch (copyErr) {
            writeLog(`[agent] error copying screenshot ${f}: ${String(copyErr)}\n`);
          }
        }
      }
      
      // Configurar watcher para novos screenshots
      try {
        // Verificar se o diretório existe antes de tentar assistir
        if (await fs.pathExists(shotsSrcDir)) {
          shotsWatcher = fs.watch(shotsSrcDir, async (evt, fname) => {
            if (!fname || !/\.(png|jpg|jpeg)$/i.test(fname)) return;
            try { 
              const srcPath = path.join(shotsSrcDir, fname);
              const destPath = path.join(destDir, fname);
              // Verificar se o arquivo existe antes de copiar
              if (await fs.pathExists(srcPath)) {
                await fs.copy(srcPath, destPath, { overwrite: true }); 
                writeLog(`[agent] screenshot mirrored: ${fname}\n`);
              }
            } catch (copyErr) {
              writeLog(`[agent] screenshot mirror error: ${String(copyErr)}\n`);
            }
          });
          writeLog(`[agent] screenshot mirror started from ${shotsSrcDir} -> ${destDir}\n`);
        } else {
          writeLog(`[agent] screenshot directory ${shotsSrcDir} does not exist yet, using polling instead\n`);
          throw new Error("Directory doesn't exist yet");
        }
      } catch (watchErr) {
        writeLog(`[agent] screenshot watcher failed: ${String(watchErr)}\n`);
        
        // Fallback para polling se o watcher falhar
        const pollInterval = setInterval(async () => {
          try {
            if (await fs.pathExists(shotsSrcDir)) {
              const files = (await fs.readdir(shotsSrcDir)).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
              for (const f of files) {
                const srcPath = path.join(shotsSrcDir, f);
                const destPath = path.join(destDir, f);
                if (!(await fs.pathExists(destPath))) {
                  await fs.copy(srcPath, destPath, { overwrite: true });
                  writeLog(`[agent] screenshot copied via polling: ${f}\n`);
                }
              }
            }
          } catch (pollErr) {
            writeLog(`[agent] polling error: ${String(pollErr)}\n`);
            clearInterval(pollInterval);
          }
        }, 1000); // Verificar a cada segundo
        
        // Limpar o intervalo quando o processo terminar
        child.on('close', () => clearInterval(pollInterval));
        writeLog(`[agent] screenshot polling started from ${shotsSrcDir} -> ${destDir}\n`);
      }
    } catch (e) {
      writeLog(`[agent] screenshot mirror failed to start: ${String(e)}\n`);
    }
  }

  child.stdout.on('data', (chunk) => { const s = chunk.toString('utf8'); writeLog(s); logBuf += s; maybeStartVideoFromLogs(s); tryStartScreenshotsMirrorFromLogs(s); bumpTimer(); });
  child.stderr.on('data', (chunk) => { const s = chunk.toString('utf8'); writeLog(s); logBuf += s; maybeStartVideoFromLogs(s); tryStartScreenshotsMirrorFromLogs(s); bumpTimer(); });

  async function stopVideoIfAny() {
    if (!videoProc) return;
    try { videoProc.stdin.write('q'); } catch (_) {}
    const killTimer = setTimeout(() => { try { videoProc.kill('SIGTERM'); } catch (_) {} }, 3000);
    await new Promise((resolve) => { videoProc.on('close', () => resolve()); videoProc.on('exit', () => resolve()); });
    clearTimeout(killTimer);
  }

  async function postProcessVideos() {
    try {
      if (!shouldRecordVideo || !effTestId) return;
      const videoDir = path.join(__dirname, 'tests', effTestId, 'video');
      const results = await transcodeAllInDir(videoDir, (typeof videoSpeed === 'number' && videoSpeed > 0) ? videoSpeed : 2.0, (typeof videoCrf === 'number') ? videoCrf : 28);
      const okCount = results.filter(r => r.ok).length;
      if (okCount > 0) writeLog(`\n[agent] video post-process: ${okCount} file(s) sped up\n`);
      await pruneExtraVideos(videoDir, keepExtraVideos === true, { write: writeLog });
    } catch (e) { writeLog(`\n[agent] video post-process failed: ${String(e)}\n`); }
  }

  child.on('close', async (code) => {
    clearTimeout(idleTimer);
    clearTimeout(hardCapTimer);
    const r = runs.get(runId);
    try {
      if (shotsWatcher) { try { shotsWatcher.close(); } catch (_) {} shotsWatcher = null; }
      if (effTestId) {
        let destDir = path.join(__dirname, 'tests', effTestId, 'screenshots');
        try { await fs.ensureDir(destDir); } catch (_) {}
        if (!shotsSrcDir) {
          // Fallback: try to detect screenshots dir from accumulated logs
          const m1 = /Screenshot service initialized in:\s*(.+)/.exec(logBuf);
          if (m1 && m1[1]) { shotsSrcDir = m1[1].trim(); }
          if (!shotsSrcDir) {
            const m2 = /File system path:\s*(.+)/.exec(logBuf);
            if (m2 && m2[1]) { shotsSrcDir = path.join(m2[1].trim(), 'screenshots'); }
          }
        }
        if (shotsSrcDir) {
          try { 
            // Verificar se source e destination são o mesmo diretório
            if (path.resolve(shotsSrcDir) === path.resolve(destDir)) {
              writeLog(`\n[agent] screenshot source and destination are the same, no copy needed\n`);
            } else if (await fs.pathExists(shotsSrcDir)) {
              // Copiar todos os arquivos encontrados
              const files = (await fs.readdir(shotsSrcDir)).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
              if (files.length > 0) {
                let copiedCount = 0;
                for (const f of files) {
                  const srcPath = path.join(shotsSrcDir, f);
                  const destPath = path.join(destDir, f);
                  try {
                    if (await fs.pathExists(srcPath)) {
                      await fs.copy(srcPath, destPath, { overwrite: true });
                      copiedCount++;
                    }
                  } catch (copyErr) {
                    writeLog(`\n[agent] error copying screenshot ${f}: ${String(copyErr)}\n`);
                  }
                }
                writeLog(`\n[agent] ${copiedCount} of ${files.length} screenshots copied to ${destDir}\n`); 
              } else {
                writeLog(`\n[agent] no screenshots found in ${shotsSrcDir}\n`);
              }
            } else {
              writeLog(`\n[agent] screenshot directory ${shotsSrcDir} does not exist\n`);
              
              // Procurar por outros diretórios de screenshots possíveis
              const tempDir = os.tmpdir();
              const possibleDirs = [];
              try {
                const tempFiles = await fs.readdir(tempDir);
                for (const f of tempFiles) {
                  if (f.includes('browser_use_agent_')) {
                    const fullPath = path.join(tempDir, f, 'screenshots');
                    if (await fs.pathExists(fullPath)) {
                      possibleDirs.push(fullPath);
                    }
                  }
                }
                
                if (possibleDirs.length > 0) {
                  writeLog(`\n[agent] found ${possibleDirs.length} possible screenshot directories\n`);
                  // Usar o diretório mais recente
                  const latestDir = possibleDirs.sort().pop();
                  writeLog(`\n[agent] trying to copy from ${latestDir}\n`);
                  
                  const files = (await fs.readdir(latestDir)).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
                  if (files.length > 0) {
                    for (const f of files) {
                      await fs.copy(path.join(latestDir, f), path.join(destDir, f), { overwrite: true });
                    }
                    writeLog(`\n[agent] ${files.length} screenshots copied from alternative directory\n`);
                  }
                }
              } catch (dirErr) {
                writeLog(`\n[agent] error searching for alternative screenshot directories: ${String(dirErr)}\n`);
              }
            }
          } catch (e) {
            writeLog(`\n[agent] error copying screenshots: ${String(e)}\n`);
          }
        } else { writeLog(`\n[agent] screenshot directory not found in logs.\n`); }
        // Try annotating screenshots with step descriptions (best-effort)
        const stepDescMap = parseStepDescriptions(logBuf);
        const annotated = await annotateScreenshots(destDir, stepDescMap);
        if (annotated) { writeLog(`[agent] screenshots annotated with descriptions\n`); }
      }
      await stopVideoIfAny();
      await postProcessVideos();
      writeLog(`\n[agent] exited with code ${code}\n`);
      if (r) {
        if (hardTimedOut) {
          failRunRecord(runId, 'Run exceeded hard timeout of 180 seconds');
          writePlanStatus(effTestId, 'failed');
        } else {
          completeRunRecord(runId);
          writePlanStatus(effTestId, 'finished');
        }
      }
    } catch (e) {
      if (r) failRunRecord(runId, String(e));
      writeLog(`\n[agent] orchestration error: ${String(e)}\n`);
    } finally {
      try { logStream.end(); } catch (_) {}
    }
  });

  child.on('error', async (err) => {
    clearTimeout(idleTimer);
    clearTimeout(hardCapTimer);
    const r = runs.get(runId);
    try {
      writeLog(`[agent] error: ${err.message}\n`);
      await stopVideoIfAny();
      await postProcessVideos();
      if (r) { failRunRecord(runId, err.message); writePlanStatus(effTestId, 'failed'); }
    } finally {
      try { logStream.end(); } catch (_) {}
    }
  });

  // Respond immediately with runId + info
  res.status(202).json({ runId, testId: effTestId, status: 'running' });
});

// Stream logs endpoint
app.get('/agent/logs/:runId', async (req, res) => {
  const { runId } = req.params;
  const r = runs.get(runId);
  if (!r || !r.logsPath) return res.status(404).json({ error: 'Run not found' });
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  try {
    const stream = fs.createReadStream(r.logsPath, { encoding: 'utf8' });
    stream.pipe(res);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Get status endpoint
app.get('/agent/status/:runId', (req, res) => {
  const { runId } = req.params;
  const r = runs.get(runId);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  res.json(r);
});

// List runs endpoint
app.get('/agent/runs', (req, res) => {
  const list = Array.from(runs.entries()).map(([id, info]) => ({ runId: id, ...info }));
  res.json(list);
});

// List screenshots and primary video for a given testId
app.get('/agent/assets/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!isValidTestId(testId)) { return res.status(400).json({ error: 'Invalid testId' }); }
    const payload = await buildAssetsResponse(testId, req);
    res.json(payload);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Alias under /api for the same endpoint
app.get('/api/agent/assets/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!isValidTestId(testId)) { return res.status(400).json({ error: 'Invalid testId' }); }
    const payload = await buildAssetsResponse(testId, req);
    res.json(payload);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Complete test information endpoint
app.get('/agent/test/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    if (!isValidTestId(testId)) { return res.status(400).json({ error: 'Invalid testId' }); }
    
    const testRoot = path.join(__dirname, 'tests', testId);
    const baseUrl = buildBaseUrl(req);
    
    // Build complete test information
    const testInfo = {
      testId,
      timestamp: new Date().toISOString(),
      baseUrl: `${baseUrl}/tests/${encodeURIComponent(testId)}`,
    };
    
    // 1. Plan information (plan.json)
    const planPath = path.join(testRoot, 'plan.json');
    if (await fs.pathExists(planPath)) {
      try {
        const planData = JSON.parse(await fs.readFile(planPath, 'utf8'));
        testInfo.plan = planData;
      } catch (e) {
        testInfo.plan = { error: 'Failed to parse plan.json' };
      }
    } else {
      testInfo.plan = null;
    }
    
    // 2. Plan markdown (plan.md)
    const planMdPath = path.join(testRoot, 'plan.md');
    if (await fs.pathExists(planMdPath)) {
      try {
        testInfo.planMarkdown = await fs.readFile(planMdPath, 'utf8');
      } catch (e) {
        testInfo.planMarkdown = null;
      }
    } else {
      testInfo.planMarkdown = null;
    }
    
    // 3. Assets (screenshots and video)
    testInfo.assets = await buildAssetsResponse(testId, req);
    
    // 4. Logs information
    const logsPath = path.join(testRoot, 'run.log');
    if (await fs.pathExists(logsPath)) {
      try {
        const logStats = await fs.stat(logsPath);
        testInfo.logs = {
          available: true,
          size: logStats.size,
          lastModified: logStats.mtime,
          url: `${baseUrl}/tests/${encodeURIComponent(testId)}/run.log`
        };
      } catch (e) {
        testInfo.logs = { available: false, error: String(e) };
      }
    } else {
      testInfo.logs = { available: false };
    }
    
    // 5. Directory metadata
    try {
      const dirStats = await fs.stat(testRoot);
      testInfo.metadata = {
        created: dirStats.birthtime,
        modified: dirStats.mtime,
        size: dirStats.size
      };
    } catch (e) {
      testInfo.metadata = { error: 'Failed to get directory stats' };
    }
    
    // 6. File summary
    try {
      const files = await fs.readdir(testRoot, { withFileTypes: true });
      testInfo.files = {
        total: files.length,
        directories: files.filter(f => f.isDirectory()).map(f => f.name),
        files: files.filter(f => f.isFile()).map(f => f.name)
      };
    } catch (e) {
      testInfo.files = { error: 'Failed to read directory' };
    }
    
    res.json(testInfo);
  } catch (e) { 
    res.status(500).json({ error: String(e) }); 
  }
});

// Stop specific run endpoint
app.post('/agent/stop/:runId', (req, res) => {
  const { runId } = req.params;
  const r = runs.get(runId);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  try {
    if (r.childPid) { try { process.kill(r.childPid, 'SIGTERM'); } catch (_) {} }
    if (r.videoProcPid) { try { process.kill(r.videoProcPid, 'SIGTERM'); } catch (_) {} }
    stopRunRecord(runId);
    res.json({ status: 'stopping' });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3002;
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => { 
  console.log(`Agent API listening on http://${host}:${port}`);
  console.log(`Swagger UI at http://${host}:${port}/docs`);
});