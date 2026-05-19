import { NextResponse, type NextRequest } from 'next/server';
import { clearAuthCookies } from '@/lib/server-auth';

/**
 * Limpia las cookies de sesión y redirige a /login.
 * Se usa cuando el SSR detecta una sesión "fantasma" (cookie de refresh
 * presente pero access token inválido o backend rechaza /auth/me).
 *
 * Sin esto, el flow entra en loop:
 *   proxy.ts ve refresh → permite /dashboard
 *   layout falla /auth/me → redirect /login
 *   proxy.ts en /login ve refresh → redirect /dashboard
 *   ...
 */
export function GET(req: NextRequest): NextResponse {
  const url = new URL('/login', req.url);
  url.searchParams.set('reason', 'session-cleared');
  const response = NextResponse.redirect(url);
  clearAuthCookies(response);
  return response;
}
