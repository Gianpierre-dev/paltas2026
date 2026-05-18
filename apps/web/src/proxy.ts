// Next 16: el archivo "middleware" se renombró a "proxy".
// El runtime es nodejs (no edge).
//
// Reglas:
//  - /login es público
//  - / redirige según haya sesión o no
//  - Todo lo demás requiere cookie de sesión
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from './lib/config';

const PUBLIC_PATHS = ['/login'];

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // Permitir assets de Next, public files, etc. (ya excluidos por el matcher, pero por defensa)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Root: redirigir según sesión
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(hasSession ? '/dashboard' : '/login', req.url),
    );
  }

  // Login: si ya hay sesión, redirigir al dashboard
  if (PUBLIC_PATHS.includes(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Cualquier otra ruta requiere sesión
  if (!hasSession) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Aplicar a todo excepto static assets y la API del propio Next
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
