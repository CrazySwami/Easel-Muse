'use server';

import { generateText } from 'ai';
import { gateway } from '@/lib/gateway';

export async function POST(req: Request) {
  try {
    const { user, assistant, model }: { user: string; assistant: string; model?: string } = await req.json();
    const cheap = model ?? 'openai/gpt-4o-mini';

    const prompt = [
      'Title this chat in 4-6 words based on the conversation.',
      'Only return the title, no quotes or extra text.',
      `User: ${user?.slice(0, 400) || ''}`,
      `Assistant: ${assistant?.slice(0, 600) || ''}`,
    ].join('\n');

    const { text } = await generateText({ model: gateway(cheap), prompt });
    const title = String(text || '').trim().replace(/^"|"$/g, '');
    return new Response(JSON.stringify({ title }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ title: 'New chat' }), { status: 200 });
  }
}


