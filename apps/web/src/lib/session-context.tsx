'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UsuarioPublico } from '@paltas2026/shared';

interface SessionContextValue {
  usuario: UsuarioPublico;
  logout: () => Promise<void>;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

const CAMBIAR_PASSWORD_PATH = '/cambiar-password';

export function SessionProvider({
  initialUsuario,
  children,
}: {
  initialUsuario: UsuarioPublico;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario] = useState<UsuarioPublico>(initialUsuario);

  // Si el backend marca mustChangePassword=true, forzamos al usuario a pasar
  // por /cambiar-password antes de poder usar el resto del sistema. El guard
  // del backend ya bloquea las APIs; este redirect es UX.
  useEffect(() => {
    if (usuario.mustChangePassword && pathname !== CAMBIAR_PASSWORD_PATH) {
      router.push(CAMBIAR_PASSWORD_PATH);
    }
  }, [usuario.mustChangePassword, pathname, router]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }).catch(() => undefined);
    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <SessionCtx.Provider value={{ usuario, logout }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionContextValue {
  const v = useContext(SessionCtx);
  if (!v) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>');
  }
  return v;
}
