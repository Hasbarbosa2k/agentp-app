import * as lancedb from '@lancedb/lancedb';
import path from 'path';
import fs from 'fs/promises';
import fg from 'fast-glob';
import { loadConfig } from '../config';
import { getDb } from './lancedb';

export type ManifestRow = {
  system: string;
  path: string; // relative to KB_ROOT
  doc_id: string; // hash of rel path
  file_mtime_ms: number;
  file_size: number;
  last_ingested_ms?: number;
  status?: 'ok' | 'error' | 'pending';
  error?: string;
};

const TABLE = 'kb_manifest';

async function tableExists(name: string): Promise<boolean> {
  const db = await getDb();
  const names = await db.tableNames();
  return names.includes(name);
}

export async function getManifestTable() {
  const db = await getDb();
  if (!(await tableExists(TABLE))) {
    await db.createTable(TABLE, [], { mode: 'create', existOk: true });
  }
  return await db.openTable(TABLE);
}

export async function upsertManifest(rows: ManifestRow[]) {
  if (rows.length === 0) return;
  const db = await getDb();
  if (!(await tableExists(TABLE))) {
    await db.createTable(TABLE, rows, { mode: 'create', existOk: true });
    return;
  }
  const table = await db.openTable(TABLE);
  for (const r of rows) {
    await table.delete(`system = '${r.system.replace(/'/g, "''")}' AND path = '${r.path.replace(/'/g, "''")}'`);
  }
  await table.add(rows);
}

export async function removeMissing(manifestRows: ManifestRow[]) {
  const db = await getDb();
  if (!(await tableExists(TABLE))) return;
  const table = await db.openTable(TABLE);
  for (const r of manifestRows) {
    await table.delete(`system = '${r.system.replace(/'/g, "''")}' AND path = '${r.path.replace(/'/g, "''")}'`);
  }
}

export async function listManifest(): Promise<ManifestRow[]> {
  const db = await getDb();
  if (!(await tableExists(TABLE))) return [];
  const table = await db.openTable(TABLE);
  const rows = await table.query().toArray();
  return rows as ManifestRow[];
}

export async function deleteManifest(system: string, relPath: string) {
  const db = await getDb();
  if (!(await tableExists(TABLE))) return;
  const table = await db.openTable(TABLE);
  await table.delete(`system = '${system.replace(/'/g, "''")}' AND path = '${relPath.replace(/'/g, "''")}'`);
}

export async function getManifestMap(): Promise<Map<string, ManifestRow>> {
  const items = await listManifest();
  const map = new Map<string, ManifestRow>();
  for (const it of items) {
    map.set(`${it.system}::${it.path}`, it);
  }
  return map;
}

export async function scanKb(): Promise<ManifestRow[]> {
  const config = loadConfig();
  const kbRoot = path.resolve(process.cwd(), config.KB_ROOT);
  const out: ManifestRow[] = [];
  const entries = await fs.readdir(kbRoot, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const system = e.name;
    const sysRoot = path.join(kbRoot, system);
    const patterns = ['**/*.txt', '**/*.md', '**/*.markdown', '**/*.pdf'];
    const files = await fg(patterns, { cwd: sysRoot, absolute: true });
    for (const abs of files) {
      const rel = path.relative(kbRoot, abs).replace(/\\/g, '/');
      const st = await fs.stat(abs);
      out.push({
        system,
        path: rel,
        doc_id: '',
        file_mtime_ms: st.mtimeMs,
        file_size: st.size,
        status: 'pending',
      });
    }
  }
  return out;
}