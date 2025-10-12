import { streamText, type UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages, model, webSearch }: { messages: UIMessage[]; model?: string; webSearch?: boolean } = await req.json();

  // Normalize model ids to allowed, cheap default if unknown. Prefer same allowlist as other nodes.
  const allow: string[] = [
    'openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/gpt-4.1-mini',
    'anthropic/claude-3-5-sonnet-latest', 'anthropic/claude-3-5-haiku-latest',
    'google/gemini-1.5-pro', 'google/gemini-1.5-flash',
    'meta/llama-3.1-70b-instruct',
    'perplexity/sonar'
  ];
  const requested = (model ?? '').toLowerCase();
  const normalized = allow.find((id) => id.toLowerCase() === requested) ?? 'openai/gpt-4o-mini';
  const selectedModel = webSearch ? 'perplexity/sonar' : normalized;

  const useTools = /openai|gpt|sonar|perplexity/i.test(selectedModel ?? '');

  const result = streamText({
    model: selectedModel,
    messages: convertToModelMessages(messages ?? []),
    system: 'You are a helpful assistant that can answer questions and help with tasks',
    tools: useTools
      ? {
          webSearch: {
            description: 'Search the web and return a list of sources for a query',
            parameters: z.object({ query: z.string() }),
            execute: async ({ query }: { query: string }) => {
              const resp = await fetch('http://localhost:3000/api/perplexity/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'search', query }),
              });
              try { return await resp.json(); } catch { return []; }
            },
          },
          getUrl: {
            description: 'Fetch and summarize the content of a URL',
            parameters: z.object({ url: z.string().url() }),
            execute: async ({ url }: { url: string }) => {
              try {
                const r = await fetch(url, { headers: { 'User-Agent': 'Easel/Chat' } });
                const text = await r.text();
                return { url, text: String(text).slice(0, 5000) };
              } catch (e) {
                return { url, error: 'Failed to fetch' };
              }
            },
          },
          now: {
            description: 'Return the current ISO timestamp',
            parameters: z.object({}),
            execute: async (_: Record<string, never>) => ({ now: new Date().toISOString() }),
          },
        }
      : undefined,
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
