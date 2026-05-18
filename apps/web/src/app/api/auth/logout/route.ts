import { NextResponse, type NextRequest } from 'next/server';
import { REFRESH_COOKIE } from '@/lib/config';
import { callBackend, clearAuthCookies } from '@/lib/server-auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  // Mejor esfuerzo: si hay refresh token, le pedimos al backend que lo revoque.
  // Independiente del resultado, siempre limpiamos cookies locales.
  if (refreshToken) {
    await callBackend('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    }).catch(() => undefined);
  }

  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  return response;
}
