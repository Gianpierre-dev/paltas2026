import { NextResponse, type NextRequest } from 'next/server';
import { LoginInputSchema, type LoginResponse, type UsuarioPublico } from '@paltas2026/shared';
import { callBackend, setAuthCookies } from '@/lib/server-auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw = await req.json().catch(() => null);
  const parsed = LoginInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Datos de login inválidos', errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await callBackend<LoginResponse>('/auth/login', {
    method: 'POST',
    body: parsed.data,
    userAgent: req.headers.get('user-agent') ?? undefined,
  });

  if (!result.ok) {
    return NextResponse.json(result.error.body ?? { message: 'Login falló' }, {
      status: result.error.status,
    });
  }

  // El cliente NO necesita los tokens — viven en cookies httpOnly.
  // Solo devolvemos los datos públicos del usuario para popular el Context inicial.
  const usuarioResponse: UsuarioPublico = result.data.usuario;
  const response = NextResponse.json(usuarioResponse, { status: 200 });
  setAuthCookies(response, result.data);
  return response;
}
