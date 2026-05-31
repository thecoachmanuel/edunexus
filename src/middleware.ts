import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Helper to extract user slug from JWT
async function getUserSlug(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return (payload as any).slug ?? null;
  } catch (e) {
    console.error('JWT verification failed', e);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect API routes and protected pages
  if (pathname.startsWith('/api') || pathname.match(/^\/[^/]+\/(protected|dashboard)/)) {
    const urlSlug = request.nextUrl.pathname.split('/')[1]; // first segment after root
    const userSlug = await getUserSlug(request);
    if (!userSlug || userSlug !== urlSlug) {
      // clear auth cookie
      const response = NextResponse.redirect(new URL(`/${urlSlug}/login`, request.url));
      response.cookies.delete('auth');
      return response;
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/:slug/(protected)/:path*']
};
