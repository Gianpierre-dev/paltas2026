import { NextResponse, type NextRequest } from 'next/server';
import type { LoginResponse, UsuarioPublico } from '@paltas2026/shared';
import { REFRESH_COOKIE } from '@/lib/config';
import { callBackend, clearAuthCookies, setAuthCookies } from '@/lib/server-auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Sin refresh token' }, { status: 401 });
  }

  const result = await callBackend<LoginResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  if (!result.ok) {
    // Refresh inválido/expirado/revocado — limpiamos cookies y forzamos re-login.
    const response = NextResponse.json(
      result.error.body ?? { message: 'Refresh falló' },
      { status: result.error.status },
    );
    clearAuthCookies(response);
    return response;
  }

  const usuarioResponse: UsuarioPublico = result.data.usuario;
  const response = NextResponse.json(usuarioResponse, { status: 200 });
  setAuthCookies(response, result.data);
  return response;
}
