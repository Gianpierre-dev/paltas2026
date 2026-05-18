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

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasRefreshSession = Boolean(req.cookies.get(REFRESH_COOKIE)?.value);

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
    return NextResponse.redirect(
      new URL(hasRefreshSession ? '/dashboard' : '/login', req.url),
    );
  }

  // Login: si ya hay sesión, redirigir al dashboard.
  if (PUBLIC_PATHS.includes(pathname)) {
    if (hasRefreshSession) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Cualquier otra ruta requiere sesión.
  if (!hasRefreshSession) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
