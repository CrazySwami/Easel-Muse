import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { database } from '@/lib/database';
import { feedback } from '@/schema';
import { env } from '@/lib/env';

const BodySchema = z.object({
  kind: z.enum(['feature', 'bug']),
  email: z.string().email().optional(),
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  projectId: z.string().optional(),
});

export const POST = async (req: Request) => {
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const body = BodySchema.parse(json);

    const meta = (user.user_metadata || {}) as any;
    await database.insert(feedback).values({
      userId: user.id,
      projectId: body.projectId,
      kind: body.kind,
      email: body.email,
      title: body.title,
      message: body.message,
      imageUrl: body.imageUrl,
      authorName: meta.name || meta.full_name || null,
      authorEmail: user.email || null,
      authorAvatar: meta.avatar || meta.avatar_url || meta.picture || null,
    });

    // Send email notification to support
    const supportEmail = process.env.SUPPORT_EMAIL || env.RESEND_EMAIL;
    const subject = `[${body.kind === 'feature' ? 'Feature' : 'Bug'}] New feedback from ${user.email ?? user.id}`;
    const payload = {
      to: supportEmail,
      subject,
      text: `User: ${user.email ?? user.id}\nProject: ${body.projectId ?? 'n/a'}\nMessage: ${body.message}\nImage: ${body.imageUrl ?? 'n/a'}`,
    };

    // Use Supabase function stub (send-email) to forward email; replace with production integration as needed
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ name: subject, ...payload }),
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
};



