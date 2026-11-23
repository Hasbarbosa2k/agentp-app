import fg from 'fast-glob';
import path from 'path';
import fs from 'fs/promises';
import { loadConfig } from '../config';
import { chunkTextIter, loadFileContent, sha256 } from '../utils/text';
import { createEmbeddingsClient } from '../providers/embeddings';
import { deleteSystem, deleteSystemPath, upsertChunks, KbRow } from './lancedb';
import { ManifestRow, upsertManifest, getManifestMap } from './manifest';

export type IngestOptions = {
  system?: string; // if provided, limit to this subfolder
  fullReindex?: boolean;
  patterns?: string[]; // override glob patterns
  batchSize?: number;
};

export type FilesListing = {
  kbRoot: string;
  systems: string[];
  filesBySystem: Record<string, string[]>;
};

export async function listFilesToIngest(opts: { system?: string; patterns?: string[] } = {}): Promise<FilesListing> {
  const config = loadConfig();
  const kbRoot = path.resolve(process.cwd(), config.KB_ROOT);
  // Verify KB root exists
  const stat = await fs.stat(kbRoot).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`KB_ROOT not found or not a directory: ${kbRoot}`);
  }

  const entries = await fs.readdir(kbRoot, { withFileTypes: true });
  const systems: string[] = [];
  for (const e of entries) if (e.isDirectory()) systems.push(e.name);
  const targetSystems = opts.system ? [opts.system] : systems;
  const filesBySystem: Record<string, string[]> = {};
  for (const system of targetSystems) {
    const sysRoot = path.join(kbRoot, system);
    const sysStat = await fs.stat(sysRoot).catch(() => null);
    if (!sysStat || !sysStat.isDirectory()) {
      filesBySystem[system] = [];
      continue;
    }
    const patterns = opts.patterns ?? ['**/*.txt', '**/*.md', '**/*.markdown', '**/*.pdf'];
    const files = await fg(patterns, { cwd: sysRoot, absolute: true });
    // Return relative paths from kb root for consistency
    filesBySystem[system] = files.map(f => path.relative(kbRoot, f).replace(/\\/g, '/'));
  }
  return { kbRoot, systems: targetSystems, filesBySystem };
}

export async function ingestKnowledgeBase(opts: IngestOptions = {}) {
  const config = loadConfig();
  const kbRoot = path.resolve(process.cwd(), config.KB_ROOT);
  const batchSize = opts.batchSize ?? 64;
  const embeddings = createEmbeddingsClient();

  const systems: string[] = [];
  const entries = await fs.readdir(kbRoot, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.isDirectory()) systems.push(e.name);
  }
  const targetSystems = opts.system ? [opts.system] : systems;

  for (const system of targetSystems) {
    const sysRoot = path.join(kbRoot, system);
    const patterns = opts.patterns ?? ['**/*.txt', '**/*.md', '**/*.markdown', '**/*.pdf'];
    const files = await fg(patterns, { cwd: sysRoot, absolute: true });

    if (opts.fullReindex) {
      await deleteSystem(system);
    }

    let rowsBuffered: KbRow[] = [];
    for (const file of files) {
      const relPath = path.relative(kbRoot, file).replace(/\\/g, '/');
      const content = await loadFileContent(file);
      if (!content?.trim()) continue;
      const docId = sha256(relPath);
      // Remove old chunks for this doc path to avoid duplicates
      await deleteSystemPath(system, relPath);

      let chunkIndex = 0;
      const chunkIterator = chunkTextIter(content, 800, 120);
      let currentBatch: string[] = [];
      for (const piece of chunkIterator) {
        currentBatch.push(piece);
        if (currentBatch.length >= batchSize) {
          const vecs = await embeddings.embedDocuments(currentBatch);
          for (let i = 0; i < currentBatch.length; i++) {
            rowsBuffered.push({
              system,
              path: relPath,
              doc_id: docId,
              chunk_id: chunkIndex + i,
              content: currentBatch[i],
              vector: vecs[i],
            });
          }
          chunkIndex += currentBatch.length;
          currentBatch = [];
          if (rowsBuffered.length >= 256) {
            await upsertChunks(rowsBuffered.splice(0, rowsBuffered.length));
          }
        }
      }
      if (currentBatch.length > 0) {
        const vecs = await embeddings.embedDocuments(currentBatch);
        for (let i = 0; i < currentBatch.length; i++) {
          rowsBuffered.push({
            system,
            path: relPath,
            doc_id: docId,
            chunk_id: chunkIndex + i,
            content: currentBatch[i],
            vector: vecs[i],
          });
        }
        chunkIndex += currentBatch.length;
        currentBatch = [];
      }

      // Update manifest entry for this file
      const st = await fs.stat(file);
      const manifestRow: ManifestRow = {
        system,
        path: relPath,
        doc_id: docId,
        file_mtime_ms: st.mtimeMs,
        file_size: st.size,
        last_ingested_ms: Date.now(),
        status: 'ok',
      };
      await upsertManifest([manifestRow]);
    }
      if (rowsBuffered.length > 0) {
        await upsertChunks(rowsBuffered);
        rowsBuffered = [];
      }
  }

  return { indexedSystems: targetSystems };
}

let lastEnsureRun = 0;
let ensureInFlight: Promise<{ indexed: number }> | null = null;
const ENSURE_MIN_INTERVAL_MS = 15_000; // debounce to avoid repeated heavy work

export async function ensureFreshIngestionForAll(): Promise<{ indexed: number }> {
  const now = Date.now();
  if (ensureInFlight) return ensureInFlight;
  if (now - lastEnsureRun < ENSURE_MIN_INTERVAL_MS) return { indexed: 0 };
  ensureInFlight = (async () => {
  const config = loadConfig();
  const kbRoot = path.resolve(process.cwd(), config.KB_ROOT);
  const entries = await fs.readdir(kbRoot, { withFileTypes: true }).catch(() => []);
  let indexed = 0;
  const manifestMap = await getManifestMap();
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const system = e.name;
    const sysRoot = path.join(kbRoot, system);
    const patterns = ['**/*.txt', '**/*.md', '**/*.markdown', '**/*.pdf'];
    const files = await fg(patterns, { cwd: sysRoot, absolute: true });
    for (const file of files) {
      const relPath = path.relative(kbRoot, file).replace(/\\/g, '/');
      const st = await fs.stat(file);
      const key = `${system}::${relPath}`;
      const prev = manifestMap.get(key);
      if (prev && prev.file_mtime_ms === st.mtimeMs && prev.status === 'ok') continue;
      const content = await loadFileContent(file);
      if (!content?.trim()) continue;
      const docId = sha256(relPath);
      await deleteSystemPath(system, relPath);
      const embeddings = createEmbeddingsClient();
      const batch = 16;
      let chunkId = 0;
      let buf: string[] = [];
      for (const piece of chunkTextIter(content)) {
        buf.push(piece);
        if (buf.length >= batch) {
          const vecs = await embeddings.embedDocuments(buf);
          const toAdd: KbRow[] = buf.map((c, i) => ({ system, path: relPath, doc_id: docId, chunk_id: chunkId + i, content: c, vector: vecs[i] }));
          await upsertChunks(toAdd);
          indexed += toAdd.length;
          chunkId += buf.length;
          buf = [];
        }
      }
      if (buf.length > 0) {
        const vecs = await embeddings.embedDocuments(buf);
        const toAdd: KbRow[] = buf.map((c, i) => ({ system, path: relPath, doc_id: docId, chunk_id: chunkId + i, content: c, vector: vecs[i] }));
        await upsertChunks(toAdd);
        indexed += toAdd.length;
      }
      await upsertManifest([{ system, path: relPath, doc_id: docId, file_mtime_ms: st.mtimeMs, file_size: st.size, last_ingested_ms: Date.now(), status: 'ok' }]);
    }
  }
  lastEnsureRun = Date.now();
  ensureInFlight = null;
  return { indexed };
  })();
  try {
    return await ensureInFlight;
  } finally {
    ensureInFlight = null;
  }
}