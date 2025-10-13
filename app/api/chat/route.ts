import { streamText, type UIMessage, convertToModelMessages } from 'ai';

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
		const uploadedFiles: File[] = Array.from(form.values()).filter((v): v is File => typeof v !== 'string');
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
		if (body.aiEnabled === false) {
			return new Response(
				JSON.stringify({ message: 'AI disabled' }),
				{ headers: { 'Content-Type': 'application/json' } }
			);
		}
	}

	// Honor the exact selected id from the client (same as Text node uses)
	const requested = (modelId || model || '').trim();
	// If webSearch is enabled, override to Sonar; otherwise use requested or a cheap default.
	const selectedModel = webSearch ? 'perplexity/sonar' : (requested || 'openai/gpt-4o-mini');

	// Normalize: convert image-like file parts to proper 'image' parts for providers (Google, etc.)
	const normalizedMessages: UIMessage[] = (messages ?? []).map((m: any) => ({
		...m,
		parts: (m.parts ?? []).map((p: any) => {
			if (p?.type === 'file' && typeof p?.mediaType === 'string' && p.mediaType.startsWith('image/')) {
				const image = p.data ?? p.url; // ArrayBuffer/Uint8Array or data URL
				if (image) return { type: 'image', image } as any;
			}
			return p;
		}),
	})) as any;

	// Build a compact rolling summary and send only the recent window
	const MAX_RECENT = 12;
	const textFromParts = (parts: any[]) => (parts ?? [])
		.filter((p) => p?.type === 'text' && typeof p.text === 'string')
		.map((p) => p.text)
		.join('\n');
	const label = (r: string) => (r === 'user' ? 'User' : r === 'assistant' ? 'Assistant' : r);
	const plainHistory = normalizedMessages
		.map((m: any) => `${label(m.role)}: ${textFromParts(m.parts)}`)
		.join('\n')
		.trim();
	// Naive compression: keep only first 1000 chars for the summary to avoid token bloat
	const summary = plainHistory.length > 1000 ? `${plainHistory.slice(0, 1000)}…` : plainHistory;
	const recentNormalizedMessages = normalizedMessages.slice(-MAX_RECENT);
	const systemPrompt = [
		'You are a helpful assistant that can answer questions and help with tasks.',
		'If a message references images, you may describe or reason about them when supported by the model.',
		'Conversation summary (compact):',
		summary || '(empty)'
	].join('\n\n');

	const result = streamText({
		model: selectedModel,
		messages: convertToModelMessages(recentNormalizedMessages.map((m: any) => ({ ...m, userId: undefined, userInfo: undefined }))),
		system: systemPrompt,
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
