import { NextResponse, type NextRequest } from 'next/server';
import type { UsuarioPublico } from '@paltas2026/shared';
import { ACCESS_COOKIE } from '@/lib/config';
import { callBackend } from '@/lib/server-auth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'Sin sesión' }, { status: 401 });
  }

  const result = await callBackend<UsuarioPublico>('/auth/me', {
    method: 'GET',
    bearerToken: accessToken,
  });

  if (!result.ok) {
    return NextResponse.json(result.error.body ?? { message: 'No autorizado' }, {
      status: result.error.status,
    });
  }

  return NextResponse.json(result.data, { status: 200 });
}
