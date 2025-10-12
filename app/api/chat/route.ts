import { streamText, type UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages, model, modelId, webSearch }: { messages: UIMessage[]; model?: string; modelId?: string; webSearch?: boolean } = await req.json();

  // Honor the exact selected id from the client (same as Text node uses)
  const requested = (modelId || model || '').trim();
  // If webSearch is enabled, override to Sonar; otherwise use requested or a cheap default.
  const selectedModel = webSearch ? 'perplexity/sonar' : (requested || 'openai/gpt-4o-mini');

  const result = streamText({
    model: selectedModel,
    messages: convertToModelMessages(messages ?? []),
    system: 'You are a helpful assistant that can answer questions and help with tasks',
    tools: undefined,
  });

  // Lightweight diagnostics to verify file parts are reaching the server
  try {
    const first = (messages ?? [])[0] as any;
    const fileParts = (first?.parts ?? []).filter((p: any) => p.type === 'file');
    const mt = fileParts[0]?.mediaType || fileParts[0]?.mimeType || fileParts[0]?.contentType;
    console.log('[chat]', { model: selectedModel, fileParts: fileParts.length, firstType: mt ?? null });
  } catch {}

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
