'use server';

import { streamText, type UIMessage, convertToModelMessages } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, model, webSearch }: { messages: UIMessage[]; model?: string; webSearch?: boolean } = await req.json();

  const selectedModel = webSearch ? 'perplexity/sonar' : (model ?? 'openai/gpt-4o-mini');

  const result = streamText({
    model: selectedModel,
    messages: convertToModelMessages(messages ?? []),
    system: 'You are a helpful assistant that can answer questions and help with tasks',
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
