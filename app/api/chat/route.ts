import { streamText, type UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  // Support both JSON (AI SDK default) and multipart (file uploads)
  let messages: UIMessage[] = [];
  let model: string | undefined;
  let modelId: string | undefined;
  let webSearch: boolean | undefined;

  if (contentType.includes('application/json')) {
    const body = await req.json();
    messages = body.messages;
    model = body.model;
    modelId = body.modelId;
    webSearch = body.webSearch;
  } else if (contentType.startsWith('multipart/form-data')) {
    const form = await req.formData();
    messages = JSON.parse((form.get('messages') as string) || '[]');
    model = (form.get('model') as string) || undefined;
    modelId = (form.get('modelId') as string) || undefined;
    webSearch = ((form.get('webSearch') as string) || 'false') === 'true';
    // Files are uploaded and referenced by the SDK as file parts; no extra handling needed here
  } else {
    const body = await req.json().catch(() => ({}));
    messages = body.messages ?? [];
    model = body.model;
    modelId = body.modelId;
    webSearch = body.webSearch;
  }

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

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
