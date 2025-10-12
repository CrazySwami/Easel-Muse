import { streamText, type UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages, model, webSearch }: { messages: UIMessage[]; model?: string; webSearch?: boolean } = await req.json();

  const selectedModel = webSearch ? 'perplexity/sonar' : (model ?? 'openai/gpt-4o-mini');

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
