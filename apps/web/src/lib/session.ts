// Lectura de sesión del lado SERVER.
// La cookie guarda un JSON con accessToken + datos del usuario.
// En Next 16 cookies() es async — siempre await.
import { cookies } from 'next/headers';
import type { LoginResponse } from '@paltas2026/shared';
import { SESSION_COOKIE } from './config';

export type Session = LoginResponse;

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function getServerToken(): Promise<string | null> {
  const session = await getServerSession();
  return session?.accessToken ?? null;
}
