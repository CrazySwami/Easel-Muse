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
    tools: undefined,
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
