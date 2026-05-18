// Lectura/escritura de sesión del lado CLIENT (Client Components).
// Usa document.cookie. NO httpOnly — los Client Components necesitan poder leerla.
// Trade-off: vulnerable a XSS, pero permite SSR + interactividad sin endpoint extra.
'use client';

import type { LoginResponse } from '@paltas2026/shared';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './config';

export type Session = LoginResponse;

function encode(value: string): string {
  return encodeURIComponent(value);
}

export function setClientSession(session: Session): void {
  if (typeof document === 'undefined') return;
  const value = encode(JSON.stringify(session));
  const isHttps = window.location.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
}

export function getClientSession(): Session | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split('=')[1])) as Session;
  } catch {
    return null;
  }
}

export function clearClientSession(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
