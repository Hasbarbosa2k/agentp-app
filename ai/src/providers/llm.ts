import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { LlmProvider, loadConfig } from '../config';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface ChatOptions {
  provider?: 'openai' | 'anthropic' | 'openai-compatible';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmClient {
  chat: (messages: ChatMessage[], options?: ChatOptions) => Promise<string>;
}

function buildOpenAI(config = loadConfig(), override?: ChatOptions): OpenAI {
  const baseURL = override?.provider === 'openai-compatible'
    ? (process.env.OAI_COMPAT_BASE_URL || config.OAI_COMPAT_BASE_URL)
    : (process.env.OPENAI_BASE_URL || config.OPENAI_BASE_URL);
  const apiKey = override?.provider === 'openai-compatible'
    ? (process.env.OAI_COMPAT_API_KEY || config.OAI_COMPAT_API_KEY || 'no-key')
    : (process.env.OPENAI_API_KEY || config.OPENAI_API_KEY || '');
  return new OpenAI({ apiKey, baseURL });
}

function buildAnthropic(config = loadConfig()): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY || config.ANTHROPIC_API_KEY || '';
  return new Anthropic({ apiKey });
}

export function createLlmClient(): LlmClient {
  const config = loadConfig();
  return {
    async chat(messages, options) {
      const provider = (options?.provider as LlmProvider | undefined) ?? (config.LLM_PROVIDER as LlmProvider);
      if (provider === LlmProvider.OpenAI || provider === LlmProvider.OpenAICompat) {
        const openai = buildOpenAI(config, options);
        const model = options?.model || (provider === LlmProvider.OpenAICompat ? config.OAI_COMPAT_MODEL : config.OPENAI_MODEL);
        const completion = await openai.chat.completions.create({
          model,
          temperature: options?.temperature ?? 0.2,
          max_tokens: options?.maxTokens,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        });
        const text = completion.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty completion');
        return text;
      }
      if (provider === LlmProvider.Anthropic) {
        const anthropic = buildAnthropic(config);
        const model = options?.model || config.ANTHROPIC_MODEL;
        const completion = await anthropic.messages.create({
          model,
          max_tokens: options?.maxTokens ?? 1024,
          temperature: options?.temperature ?? 0.2,
          messages: messages
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          system: messages.find(m => m.role === 'system')?.content,
        });
        const text = completion.content?.[0]?.type === 'text' ? completion.content[0].text : undefined;
        if (!text) throw new Error('Empty completion');
        return text;
      }
      throw new Error(`Unsupported provider: ${provider}`);
    },
  };
}