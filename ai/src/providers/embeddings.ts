import OpenAI from 'openai';
import { loadConfig } from '../config';

export interface EmbeddingsClient {
  embedDocuments: (texts: string[], modelOverride?: string) => Promise<number[][]>;
  embedQuery: (text: string, modelOverride?: string) => Promise<number[]>;
}

export function createEmbeddingsClient(): EmbeddingsClient {
  const config = loadConfig();
  const baseURL = (process.env.OPENAI_BASE_URL || config.OPENAI_BASE_URL || process.env.OAI_COMPAT_BASE_URL || config.OAI_COMPAT_BASE_URL) || undefined;
  const apiKey = (process.env.OPENAI_API_KEY || config.OPENAI_API_KEY || process.env.OAI_COMPAT_API_KEY || config.OAI_COMPAT_API_KEY) || 'no-key';
  const openai = new OpenAI({ apiKey, baseURL });
  const defaultModel = process.env.OPENAI_EMBED_MODEL || config.OPENAI_EMBED_MODEL;

  return {
    async embedDocuments(texts, modelOverride) {
      if (texts.length === 0) return [];
      const { data } = await openai.embeddings.create({ model: modelOverride || defaultModel, input: texts });
      return data.map(e => e.embedding as unknown as number[]);
    },
    async embedQuery(text, modelOverride) {
      const { data } = await openai.embeddings.create({ model: modelOverride || defaultModel, input: [text] });
      return (data[0]?.embedding || []) as unknown as number[];
    },
  };
}