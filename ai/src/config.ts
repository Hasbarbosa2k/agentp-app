import { z } from 'zod';

enum LlmProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  OpenAICompat = 'openai-compatible',
}

export const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  LLM_PROVIDER: z.nativeEnum(LlmProvider).default(LlmProvider.OpenAI),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBED_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_BASE_URL: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-latest'),

  OAI_COMPAT_API_KEY: z.string().optional(),
  OAI_COMPAT_BASE_URL: z.string().optional(),
  OAI_COMPAT_MODEL: z.string().default('llama3.1'),

  EMBEDDINGS_PROVIDER: z.enum(['openai']).default('openai'),
  LANCEDB_DIR: z.string().default('.lancedb'),
  KB_ROOT: z.string().default('./data/knowledge'),
  AUTO_INGEST_ON_REQUEST: z.coerce.boolean().default(true),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid configuration: ${message}`);
  }
  return parsed.data;
}

export { LlmProvider };