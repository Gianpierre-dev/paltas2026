// Decodificación del access token JWT en el frontend.
// NO verifica firma — la firma la valida el backend en cada request.
// Acá solo leemos claims y la expiración para decisiones de UI / proxy.
import { decodeJwt } from 'jose';
import type { JwtPayload } from '@paltas2026/shared';
import { JwtPayloadSchema } from '@paltas2026/shared';

const EXPIRY_LEEWAY_SECONDS = 10;

export function decodeAccessToken(token: string): (JwtPayload & { exp: number }) | null {
  try {
    const payload = decodeJwt(token);
    const parsed = JwtPayloadSchema.safeParse(payload);
    if (!parsed.success) return null;
    const exp = typeof payload.exp === 'number' ? payload.exp : 0;
    return { ...parsed.data, exp };
  } catch {
    return null;
  }
}

export function isAccessExpired(token: string): boolean {
  const decoded = decodeAccessToken(token);
  if (!decoded) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return decoded.exp <= nowSec + EXPIRY_LEEWAY_SECONDS;
}
