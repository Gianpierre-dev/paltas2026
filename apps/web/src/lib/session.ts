// Lectura de sesión del lado SERVER.
// Lee la cookie httpOnly de access token y decodifica el JWT (sin verificar firma:
// la verificación la hace el backend en cada request protegida).
// Para nombre/apellido del usuario, los Client Components consumen /api/auth/me via Context.
import 'server-only';

import { cookies } from 'next/headers';
import type { JwtPayload } from '@paltas2026/shared';
import { ACCESS_COOKIE } from './config';
import { decodeAccessToken, isAccessExpired } from './jwt';

export type ServerSession = {
  claims: JwtPayload;
  accessToken: string;
  // Conveniencia: campos del JWT expuestos como objeto plano.
  // Para nombre/apellido completos, llamar a /auth/me con el token.
  usuario: {
    id: JwtPayload['sub'];
    email: JwtPayload['email'];
    rol: JwtPayload['rol'];
  };
};

export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;
  if (isAccessExpired(accessToken)) return null;
  const claims = decodeAccessToken(accessToken);
  if (!claims) return null;
  return {
    claims,
    accessToken,
    usuario: { id: claims.sub, email: claims.email, rol: claims.rol },
  };
}

export async function getServerToken(): Promise<string | null> {
  const session = await getServerSession();
  return session?.accessToken ?? null;
}
