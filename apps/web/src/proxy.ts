// Next 16: el archivo "middleware" se renombró a "proxy".
// El runtime es nodejs (no edge).
//
// Reglas:
//  - /login y /api/auth/* son públicos
//  - / redirige según haya cookie de refresh
//  - Si hay refresh pero el access cookie expiró/falta → /api/auth/refresh-and-redirect
//    para que la sesión se refresque transparente en SSR. Sin esto, el access
//    expira a los 15 min y deja al usuario en un redirect loop entre /login
//    y /dashboard.
//  - Todo lo demás requiere sesión válida (access no expirado).
import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './lib/config';
import { isAccessExpired } from './lib/jwt';

const PUBLIC_PATHS = ['/login'];

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

function refreshAndRedirectUrl(req: NextRequest, nextPath: string): URL {
  const url = new URL('/api/auth/refresh-and-redirect', req.url);
  url.searchParams.set('next', nextPath);
  return url;
}

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const refreshCookie = req.cookies.get(REFRESH_COOKIE)?.value;
  const accessCookie = req.cookies.get(ACCESS_COOKIE)?.value;
  const hasRefreshSession = Boolean(refreshCookie);
  // accessAlive = access cookie present AND not expired. JWT signature NOT
  // verified here — backend verifies on every protected request.
  const accessAlive = Boolean(accessCookie) && !isAccessExpired(accessCookie!);

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

  // Login: si ya hay sesión válida, redirigir al dashboard.
  if (PUBLIC_PATHS.includes(pathname)) {
    if (accessAlive) {
      log('redirect', req, { from: pathname, to: '/dashboard', reason: 'login-already-authed' });
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (hasRefreshSession) {
      // Refresh cookie pero access expirado: intentar refresh transparente
      // y volver a /dashboard. Si refresh falla, clear-session manda acá sin
      // refresh cookie y entonces sí renderizamos el form.
      log('redirect', req, { from: pathname, to: 'refresh-and-redirect', reason: 'login-access-stale' });
      return NextResponse.redirect(refreshAndRedirectUrl(req, '/dashboard'));
    }
    log('next', req, { reason: 'public-no-session' });
    return NextResponse.next();
  }

  // Rutas protegidas.
  if (accessAlive) {
    log('next', req, { authed: true });
    return NextResponse.next();
  }

  if (hasRefreshSession) {
    // Access vencido pero refresh OK → refresh transparente.
    log('redirect', req, {
      from: pathname,
      to: 'refresh-and-redirect',
      reason: 'access-stale',
    });
    return NextResponse.redirect(refreshAndRedirectUrl(req, pathname + req.nextUrl.search));
  }

  // Sin nada → al login.
  const url = new URL('/login', req.url);
  url.searchParams.set('next', pathname);
  log('redirect', req, { from: pathname, to: url.pathname + url.search, reason: 'no-session' });
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
