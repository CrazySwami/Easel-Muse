import { NextRequest, NextResponse } from 'next/server';

import {
  PerplexitySearchRequestSchema,
  perplexitySearch,
} from '@/lib/clients/perplexity';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const body = PerplexitySearchRequestSchema.parse(json);
    const data = await perplexitySearch(body);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}
