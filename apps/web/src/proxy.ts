// Next 16: el archivo "middleware" se renombró a "proxy".
// El runtime es nodejs (no edge).
//
// Reglas:
//  - /login y /api/auth/* son públicos
//  - / redirige según haya cookie de refresh
//  - Todo lo demás requiere cookie de refresh (la de access dura 15min, no la usamos como señal)
import { NextResponse, type NextRequest } from 'next/server';
import { REFRESH_COOKIE } from './lib/config';

const PUBLIC_PATHS = ['/login'];

// Logging estructurado temporal para diagnóstico — ver Railway logs en vivo.
// Marca cada request con [PROXY] + decisión. Si un request loopea, se va a
// ver acá inmediatamente. Sacar este logging cuando se resuelva el bug.
function log(action: string, req: NextRequest, extras: Record<string, unknown> = {}): void {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '?';
  const ua = req.headers.get('user-agent')?.slice(0, 60) ?? '?';
  // eslint-disable-next-line no-console
  console.log(
    `[PROXY] ${action} ${req.method} ${req.nextUrl.pathname}${req.nextUrl.search} ip=${ip} ua="${ua}" ${JSON.stringify(extras)}`,
  );
}

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const refreshCookie = req.cookies.get(REFRESH_COOKIE)?.value;
  const hasRefreshSession = Boolean(refreshCookie);

  // Permitir assets, BFF de auth, y rutas con extensión.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Root: redirigir según haya sesión.
  if (pathname === '/') {
    const to = hasRefreshSession ? '/dashboard' : '/login';
    log('redirect', req, { from: '/', to, hasRefresh: hasRefreshSession });
    return NextResponse.redirect(new URL(to, req.url));
  }

  // Login: si ya hay sesión, redirigir al dashboard.
  if (PUBLIC_PATHS.includes(pathname)) {
    if (hasRefreshSession) {
      log('redirect', req, {
        from: pathname,
        to: '/dashboard',
        reason: 'login-already-authed',
      });
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    log('next', req, { reason: 'public-no-session' });
    return NextResponse.next();
  }

  // Cualquier otra ruta requiere sesión.
  if (!hasRefreshSession) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    log('redirect', req, { from: pathname, to: url.pathname + url.search, reason: 'no-session' });
    return NextResponse.redirect(url);
  }

  log('next', req, { authed: true });
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
