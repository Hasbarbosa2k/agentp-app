import * as lancedb from '@lancedb/lancedb';
import { loadConfig } from '../config';

export type KbRow = {
  system: string;
  path: string;
  doc_id: string; // path-based id or hash
  chunk_id: number;
  content: string;
  vector: number[];
};

export async function getDb() {
  const config = loadConfig();
  return await lancedb.connect(config.LANCEDB_DIR);
}

async function tableExists(name: string): Promise<boolean> {
  const db = await getDb();
  const names = await db.tableNames();
  return names.includes(name);
}

export async function getKbTable() {
  const db = await getDb();
  const name = 'kb_embeddings';
  if (!(await tableExists(name))) {
    // Defer creation until first upsert so schema can be inferred
    throw new Error('KB table does not exist');
  }
  return await db.openTable(name);
}

export async function upsertChunks(rows: KbRow[]) {
  if (rows.length === 0) return;
  const db = await getDb();
  const name = 'kb_embeddings';
  if (!(await tableExists(name))) {
    // Create table with initial batch to infer schema
    await db.createTable(name, rows, { mode: 'create', existOk: true });
    return;
  }
  const table = await db.openTable(name);
  await table.add(rows);
}

export async function deleteSystemPath(system: string, path: string) {
  const name = 'kb_embeddings';
  if (!(await tableExists(name))) return;
  const db = await getDb();
  const table = await db.openTable(name);
  await table.delete(`system = '${system.replace(/'/g, "''")}' AND path = '${path.replace(/'/g, "''")}'`);
}

export async function deleteSystem(system: string) {
  const name = 'kb_embeddings';
  if (!(await tableExists(name))) return;
  const db = await getDb();
  const table = await db.openTable(name);
  await table.delete(`system = '${system.replace(/'/g, "''")}'`);
}

export async function search(system: string, queryEmbedding: number[], k = 8) {
  const db = await getDb();
  const name = 'kb_embeddings';
  if (!(await tableExists(name))) return [];
  const table = await db.openTable(name);
  // Validate vector dimension to avoid opaque LanceDB errors
  try {
    const sample = await table.query().select(['vector']).limit(1).toArray();
    const emb: any = sample?.[0]?.vector;
    let storedDim = 0;
    if (Array.isArray(emb)) storedDim = emb.length;
    else if (emb && typeof emb === 'object' && typeof emb.length === 'number') storedDim = emb.length; // TypedArray
    const queryDim = Array.isArray(queryEmbedding) ? queryEmbedding.length : 0;
    if (storedDim > 0 && queryDim > 0 && storedDim !== queryDim) {
      // eslint-disable-next-line no-console
      console.error(`[lancedb] embedding dimension mismatch: stored=${storedDim}, query=${queryDim}`);
      throw new Error(`Embedding dimension mismatch: stored=${storedDim}, query=${queryDim}. Re-ingest with a consistent model (set OPENAI_EMBED_MODEL and remove OAI_COMPAT_BASE_URL), then delete .lancedb and run ingest again.`);
    }
  } catch (_e) {
    // If schema inspection fails, proceed; vectorSearch may still give a clear error
  }
  const rows = await table
    .vectorSearch(queryEmbedding)
    .where(`system = '${system.replace(/'/g, "''")}'`)
    .select(['system', 'path', 'doc_id', 'chunk_id', 'content', '_distance'])
    .limit(k)
    .toArray();
  return rows as Array<KbRow & { _distance?: number }>;
}