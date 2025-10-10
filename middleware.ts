import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicPaths = [
    '/',
    '/pricing',
    '/home',
    '/privacy',
    '/terms',
    '/acceptable-use',
    '/changelog',
  ];

  // Bypass heavy session logic for public/marketing pages and non-page assets
  if (
    publicPaths.includes(path) ||
    path.startsWith('/auth') ||
    path.startsWith('/api/webhooks/') ||
    path.startsWith('/_next/') ||
    path.startsWith('/api/') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4|ico)$/.test(path)
  ) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks/ (webhook endpoints)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4)$).*)',
  ],
};
