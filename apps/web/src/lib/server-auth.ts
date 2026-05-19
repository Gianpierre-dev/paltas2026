// Helpers del lado servidor para el BFF de auth.
// - Las Route Handlers usan estos para llamar al backend y setear cookies httpOnly.
// - Las cookies son secure, httpOnly, SameSite=Lax — fuera del alcance de XSS.
import 'server-only';

import type { NextResponse } from 'next/server';
import type { LoginResponse } from '@paltas2026/shared';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE_SECONDS,
  API_URL_INTERNAL,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
} from './config';

const IS_PROD = process.env.NODE_ENV === 'production';

export type BackendError = { status: number; body: unknown };

export async function callBackend<T>(
  path: string,
  init: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    bearerToken?: string;
    userAgent?: string;
  } = {},
): Promise<{ ok: true; data: T } | { ok: false; error: BackendError }> {
  const { method = 'GET', body, bearerToken, userAgent } = init;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;
  if (userAgent) headers['User-Agent'] = userAgent;

  const res = await fetch(`${API_URL_INTERNAL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    let errorBody: unknown = null;
    try {
      errorBody = await res.json();
    } catch {
      try {
        errorBody = await res.text();
      } catch {
        errorBody = null;
      }
    }
    return { ok: false, error: { status: res.status, body: errorBody } };
  }

  if (res.status === 204) {
    return { ok: true, data: undefined as T };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}

export function setAuthCookies(response: NextResponse, tokens: Pick<LoginResponse, 'accessToken' | 'refreshToken'>): void {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    // path '/' (no acotado) porque proxy.ts la chequea en cada navegación
    // para saber si hay sesión activa. La defensa real está en httpOnly +
    // rotación stateful con detección de reuso (auth.service.ts).
    path: '/',
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
