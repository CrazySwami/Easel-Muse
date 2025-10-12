import { streamText, type UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  let messages: UIMessage[] = [];
  let model: string | undefined;
  let modelId: string | undefined;
  let webSearch: boolean | undefined;

  if (contentType.startsWith('multipart/form-data')) {
    const form = await req.formData();
    messages = JSON.parse(String(form.get('messages') || '[]')) as UIMessage[];
    model = (form.get('model') as string) || undefined;
    modelId = (form.get('modelId') as string) || undefined;
    webSearch = ((form.get('webSearch') as string) || 'false') === 'true';
    // Fill file parts with uploaded blobs in order
    const uploadedFiles: File[] = Array.from(form.entries())
      .map(([_, v]) => v)
      .filter((v): v is File => typeof v !== 'string') as File[];
    let idx = 0;
    for (const m of messages as any[]) {
      for (const p of (m.parts ?? []) as any[]) {
        if (p.type === 'file' && !p.url && !p.data && uploadedFiles[idx]) {
          const f = uploadedFiles[idx++];
          p.mediaType = f.type || p.mediaType;
          p.data = await f.arrayBuffer();
        }
      }
    }
  } else {
    const body = await req.json();
    messages = body.messages as UIMessage[];
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

  // Lightweight diagnostics to verify file parts are reaching the server
  try {
    const flatParts = (messages ?? []).flatMap((m: any) => m.parts ?? []);
    const files = flatParts.filter((p: any) => p.type === 'file');
    const mt = files[0]?.mediaType || files[0]?.mimeType || files[0]?.contentType;
    console.log('[chat]', { model: selectedModel, fileParts: files.length, firstType: mt ?? null });
  } catch {}

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
