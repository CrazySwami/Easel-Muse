import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const file = await req.blob();
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.type.split('/')[1] || 'png'}`;
    const { data, error } = await supabase.storage
      .from('node-assets')
      .upload(fileName, file);

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data: { publicUrl } } = supabase.storage.from('node-assets').getPublicUrl(data.path);
    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    console.error('Upload API error:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
