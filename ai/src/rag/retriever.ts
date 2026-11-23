import { createEmbeddingsClient } from '../providers/embeddings';
import { search } from './lancedb';

export type Retrieval = {
  content: string;
  path: string;
  score: number;
};

export async function retrieveContext(system: string, query: string, k = 8): Promise<Retrieval[]> {
  if (!Number.isFinite(k) || k <= 0) return [];
  const embeddings = createEmbeddingsClient();
  const q = await embeddings.embedQuery(query);
  const hits = await search(system, q, k);
  return hits.map(h => ({ content: h.content, path: h.path, score: typeof (h as any)._distance === 'number' ? (h as any)._distance : 0 }));
}