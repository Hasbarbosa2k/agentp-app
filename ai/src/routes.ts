import { Router } from 'express';
import { createLlmClient } from './providers/llm';
import { retrieveContext } from './rag/retriever';
import { ingestKnowledgeBase, ensureFreshIngestionForAll, listFilesToIngest } from './rag/ingest';
import YAML from 'yaml';
import multer, { Multer } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { loadConfig } from './config';
import { getDb } from './rag/lancedb';
import { 
  ISSUE_SOLVER_SYSTEM_PROMPT, 
  PROMETHEUS_SYSTEM_PROMPT, 
  UI_TEST_SYSTEM_PROMPT,
  SYSTEM_TEST_SYSTEM_PROMPT,
  COMMAND_BASED_TEST_TYPES,
  buildIssueSolverUserPrompt, 
  buildPrometheusUserPrompt, 
  buildUiTestUserPrompt,
  buildSystemTestUserPrompt
} from './prompts';
import {
  DOCUMENTATION_REPORT_SYSTEM_PROMPT,
  buildDocumentationReportUserPrompt
} from './documentationPrompts';
import { summarizeSystem } from './system/analyze';

const router = Router();
const upload: Multer = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/chat', async (req, res) => {
  try {
    const cfg = loadConfig();
    if (cfg.AUTO_INGEST_ON_REQUEST) {
      await ensureFreshIngestionForAll();
    }
    const { messages, options } = req.body as { messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>; options?: any };
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages required' });
    const llm = createLlmClient();
    const text = await llm.chat(messages, options);
    res.json({ text });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'chat failed' });
  }
});

router.post('/issue-solver', async (req, res) => {
  try {
    const cfg = loadConfig();
    if (cfg.AUTO_INGEST_ON_REQUEST) {
      await ensureFreshIngestionForAll();
    }
    const { system, issue, topK, options } = req.body as { system: string; issue: string; topK?: number; options?: any };
    if (!system || !issue) return res.status(400).json({ error: 'system and issue are required' });
    // Detect follow-up justification intent
    const isJustify = /\b(porquê|porque|why|raz[aã]o)\b/i.test(issue);
    // Build retrieval query: include last structured summary if present to improve recall
    const retrievalQuery = (() => {
      const prev = options?.history?.findLast?.((m: any) => m?.ai?.structured || m?.structured)?.ai?.structured || options?.structured;
      const summary = prev?.summary || '';
      return isJustify && summary ? `${issue} — context: ${summary}` : issue;
    })();
    const ctx = await retrieveContext(system, retrievalQuery, topK ?? 8);
    const snippets = ctx.map(c => ({ text: c.content, source: c.path, score: c.score }));
    const llm = createLlmClient();
    const priorStructured = (() => {
      const prev = options?.history?.findLast?.((m: any) => m?.ai?.structured || m?.structured) || {};
      return prev?.ai?.structured || prev?.structured || undefined;
    })();
    const justifyTarget = (() => {
      if (!isJustify) return undefined;
      const lastInvestigate = priorStructured?.investigate?.[1] || priorStructured?.investigate?.[0] || '';
      const lastFix = priorStructured?.fixes?.[0]?.steps?.[0] || '';
      return lastInvestigate || lastFix || issue;
    })();
    const prompt = [
      { role: 'system' as const, content: ISSUE_SOLVER_SYSTEM_PROMPT },
      { role: 'user' as const, content: buildIssueSolverUserPrompt({ system, issue, snippets, historyText: options?.historyPrompt || '', mode: isJustify ? 'justify' : 'solve', priorStructured, justifyTarget }) },
    ];
    const text = await llm.chat(prompt, options);
    res.json({ text, references: ctx.map((c, i) => ({ idx: i + 1, path: c.path, score: c.score })) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'issue-solver failed' });
  }
});

router.post('/prometheus/generate', async (req, res) => {
  try {
    const cfg = loadConfig();
    if (cfg.AUTO_INGEST_ON_REQUEST) {
      await ensureFreshIngestionForAll();
    }
    const { system, description, severity = 'warning', options } = req.body as { system: string; description: string; severity?: string; options?: any };
    if (!system || !description) return res.status(400).json({ error: 'system and description are required' });
    const ctx = await retrieveContext(system, description, 6);
    const contextText = ctx.map((c, i) => `[[${i + 1}]] (${c.path})\n${c.content}`).join('\n\n');
    const llm = createLlmClient();
    const prompt = [
      { role: 'system' as const, content: PROMETHEUS_SYSTEM_PROMPT },
      { role: 'user' as const, content: buildPrometheusUserPrompt({ system, description, severity, contextText }) },
    ];
    const yamlText = await llm.chat(prompt, options);
    // Basic validation by parsing
    let parsed: any;
    try { parsed = YAML.parse(yamlText); } catch { /* leave undefined */ }
    res.json({ yaml: yamlText, parsed, references: ctx.map((c, i) => ({ idx: i + 1, path: c.path })) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'prometheus generation failed' });
  }
});

router.post('/rag/ingest', async (req, res) => {
  try {
    const { system, fullReindex, patterns, dryRun } = req.body || {};
    const listing = await listFilesToIngest({ system, patterns });
    // eslint-disable-next-line no-console
    console.log('[ingest] KB_ROOT:', listing.kbRoot);
    // eslint-disable-next-line no-console
    console.log('[ingest] systems:', listing.systems);
    for (const s of listing.systems) {
      // eslint-disable-next-line no-console
      console.log(`[ingest] ${s}:`, listing.filesBySystem[s]?.length ?? 0, 'files');
      const sample = (listing.filesBySystem[s] || []).slice(0, 10);
      if (sample.length) console.log(`[ingest] sample(${s}):`, sample);
    }
    if (dryRun) return res.json({ dryRun: true, ...listing });
    const out = await ingestKnowledgeBase({ system, fullReindex, patterns });
    res.json({ ...out, ...listing });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ingest failed' });
  }
});

router.post('/rag/upload', upload.array('files', 20), async (req, res) => {
  try {
    const config = loadConfig();
    const sys = (req.body.system || '').trim();
    if (!sys) return res.status(400).json({ error: 'system is required' });
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) return res.status(400).json({ error: 'files are required' });

    const destDir = path.resolve(process.cwd(), config.KB_ROOT, sys);
    await fs.mkdir(destDir, { recursive: true });

    const saved: string[] = [];
    for (const f of files) {
      // keep originalname; basic normalization
      const safeName = path.basename(f.originalname).replace(/[^\w\.-]+/g, '_');
      const outPath = path.join(destDir, safeName);
      await fs.writeFile(outPath, f.buffer);
      saved.push(path.relative(path.resolve(process.cwd(), config.KB_ROOT), outPath).replace(/\\/g, '/'));
    }

    // Trigger incremental ingest for the system
    await ingestKnowledgeBase({ system: sys, fullReindex: false });

    res.json({ saved, ingested: [sys] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'upload failed' });
  }
});

router.get('/rag/search', async (req, res) => {
  try {
    const system = String(req.query.system || '').trim();
    const q = String(req.query.q || '').trim();
    const k = Number(req.query.k || 8);
    if (!system || !q) return res.status(400).json({ error: 'system and q are required' });
    const hits = await retrieveContext(system, q, Number.isFinite(k) ? k : 8);
    res.json({ hits });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'search failed' });
  }
});

router.get('/rag/stats', async (_req, res) => {
  try {
    const config = loadConfig();
    const kbRoot = path.resolve(process.cwd(), config.KB_ROOT);
    const entries = await fs.readdir(kbRoot, { withFileTypes: true }).catch(() => []);
    const systems = entries.filter(e => e.isDirectory()).map(e => e.name);

    const db = await getDb();
    const names = await db.tableNames();
    const hasTable = names.includes('kb_embeddings');
    let total = 0;
    const perSystem: Record<string, number> = {};
    if (hasTable) {
      const table = await db.openTable('kb_embeddings');
      for (const sys of systems) {
        const count = await table.countRows(`system = '${sys.replace(/'/g, "''")}'`);
        perSystem[sys] = count;
        total += count;
      }
    }
    res.json({ total, perSystem, systems });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'stats failed' });
  }
});

router.get('/rag/manifest', async (_req, res) => {
  try {
    const db = await getDb();
    const names = await db.tableNames();
    if (!names.includes('kb_manifest')) return res.json({ items: [] });
    const table = await db.openTable('kb_manifest');
    const items = await table.query().limit(5000).toArray();
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'manifest failed' });
  }
});

export default router;
// System summary endpoint
router.post('/system/summary', async (req, res) => {
  try {
    const { sudo, top, systemctl, netstat, osRelease } = req.body || {};
    // 'sudo' is ignored; we assume the caller already executed with necessary permissions
    if (typeof top !== 'string' || typeof netstat !== 'string' || typeof osRelease !== 'string') {
      return res.status(400).json({ error: 'top, netstat and osRelease are required as raw strings' });
    }
    const summary = summarizeSystem({ top, systemctl: typeof systemctl === 'string' ? systemctl : '', netstat, osRelease });
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'system summary failed' });
  }
});

// UI Test planning endpoint - supports both UI tests and system/OS/performance tests
router.post('/ui/test-plan', async (req, res) => {
  try {
    const { instruction, system, options, testType } = req.body || {};
    if (!instruction || !system) return res.status(400).json({ error: 'instruction and system are required' });
    
    const topK = Number(options?.topK ?? 10);
    const ctx = await retrieveContext(system, instruction, Number.isFinite(topK) ? topK : 10);
    const snippets = ctx.map(c => ({ text: c.content, source: c.path, score: c.score }));
    const llm = createLlmClient();
    
    // Choose prompt based on test type
    const normalizedType = (testType || 'ui').toLowerCase();
    const isCommandBased = COMMAND_BASED_TEST_TYPES.includes(normalizedType);
    
    const systemPrompt = isCommandBased ? SYSTEM_TEST_SYSTEM_PROMPT : UI_TEST_SYSTEM_PROMPT;
    const userPrompt = isCommandBased 
      ? buildSystemTestUserPrompt({ instruction, testType: normalizedType, system, snippets })
      : buildUiTestUserPrompt({ instruction, system, snippets, historyText: options?.historyPrompt || '' });
    
    const prompt = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];
    
    const text = await llm.chat(prompt, options);
    
    // Tenta validar JSON simples
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    
    // Logar a resposta do test-plan (truncada)
    try {
      const ts = new Date().toISOString();
      const truncate = (s: string, max = 8000) => (s.length > max ? `${s.slice(0, max)}...[truncated ${s.length - max} bytes]` : s);
      // eslint-disable-next-line no-console
      console.log(`[${ts}] TEST-PLAN (${normalizedType}) for system='${system}' instruction='${instruction.slice(0, 120)}'\n${truncate(text)}`);
    } catch {}
    
    res.json({ text, parsed, testType: normalizedType, isCommandBased });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'test plan failed' });
  }
});

// Documentation Report Generation endpoint
router.post('/documentation/generate-report', async (req, res) => {
  try {
    const { systemName, testDescription, testResults, systemInfo, additionalContext, options } = req.body || {};
    if (!systemName || !testDescription) {
      return res.status(400).json({ error: 'systemName and testDescription are required' });
    }
    
    const llm = createLlmClient();
    const prompt = [
      { role: 'system' as const, content: DOCUMENTATION_REPORT_SYSTEM_PROMPT },
      { role: 'user' as const, content: buildDocumentationReportUserPrompt({ 
        systemName, 
        testDescription, 
        testResults, 
        systemInfo, 
        additionalContext 
      }) },
    ];
    
    const text = await llm.chat(prompt, options);
    
    // Parse JSON response
    let parsed: any;
    try { 
      parsed = JSON.parse(text); 
    } catch (parseErr: any) {
      console.error('Failed to parse AI response as JSON:', parseErr.message);
      return res.status(500).json({ error: 'AI response was not valid JSON', rawResponse: text });
    }
    
    // Log response (truncated)
    try {
      const ts = new Date().toISOString();
      const truncate = (s: string, max = 8000) => (s.length > max ? `${s.slice(0, max)}...[truncated ${s.length - max} bytes]` : s);
      console.log(`[${ts}] DOCUMENTATION-REPORT for system='${systemName}'\nTitle: ${parsed.title || 'N/A'}\nHTML length: ${parsed.html?.length || 0} bytes`);
    } catch {}
    
    res.json({ 
      success: true,
      title: parsed.title,
      metadata: parsed.metadata,
      html: parsed.html
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'documentation report generation failed' });
  }
});