import { NextResponse, type NextRequest } from 'next/server';
import { REFRESH_COOKIE } from '@/lib/config';
import { callBackend, clearAuthCookies, setAuthCookies } from '@/lib/server-auth';
import type { LoginResponse } from '@paltas2026/shared';

/**
 * Refresh token transparente para SSR. Cuando el access cookie expiró pero el
 * refresh sigue vivo, este endpoint:
 *  1. Llama al backend /auth/refresh con el refresh token
 *  2. Setea las nuevas cookies httpOnly
 *  3. Redirige al `next` (default /dashboard)
 *
 * Si no hay refresh o el backend lo rechaza, redirige a /api/auth/clear-session
 * (que limpia cookies y manda a /login). Eso corta el redirect loop que se
 * producía cuando proxy.ts confiaba solo en la presencia de la refresh cookie.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const nextPath = req.nextUrl.searchParams.get('next') ?? '/dashboard';
  // Sanitizar — no permitimos redirigir a URLs externas (open redirect).
  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard';

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    const url = new URL('/api/auth/clear-session', req.url);
    return NextResponse.redirect(url);
  }

  const result = await callBackend<LoginResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  if (!result.ok) {
    // Refresh inválido/expirado/revocado → limpiar cookies y forzar re-login.
    const url = new URL('/api/auth/clear-session', req.url);
    const response = NextResponse.redirect(url);
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.redirect(new URL(safeNext, req.url));
  setAuthCookies(response, result.data);
  return response;
}
