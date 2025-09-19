export async function POST() {
  return new Response(JSON.stringify({ error: 'Liveblocks disabled in this branch' }), { status: 410 });
}

export function GET() {
  return new Response('Liveblocks disabled', { status: 410 });
}

