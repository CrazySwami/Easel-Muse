import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { database } from '@/lib/database';
import { feedback } from '@/schema';
import { and, eq } from 'drizzle-orm';

const PatchSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved']).optional(),
});

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = PatchSchema.parse(await req.json());

  if (!body.status) return NextResponse.json({ ok: true });

  await database
    .update(feedback)
    .set({ status: body.status })
    .where(eq(feedback.id, id));

  return NextResponse.json({ ok: true });
};

export const DELETE = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await database.delete(feedback).where(eq(feedback.id, id));
  return NextResponse.json({ ok: true });
};

// Support form submissions from server components using POST
export const POST = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Try formData first (from <form method="post">), fallback to JSON body
  let form: FormData | null = null;
  try {
    form = await req.formData();
  } catch {}

  if (form) {
    const action = form.get('_action');
    if (action === 'delete') {
      await database.delete(feedback).where(eq(feedback.id, id));
      return NextResponse.json({ ok: true });
    }
    const status = form.get('status');
    if (typeof status === 'string' && ['new','in_progress','resolved'].includes(status)) {
      await database.update(feedback).set({ status }).where(eq(feedback.id, id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  // JSON fallback
  try {
    const body = PatchSchema.parse(await req.json());
    if (body.status) {
      await database.update(feedback).set({ status: body.status }).where(eq(feedback.id, id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'No changes' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
};


