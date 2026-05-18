'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useState } from 'react';
import type { UsuarioPublico } from '@paltas2026/shared';

interface SessionContextValue {
  usuario: UsuarioPublico;
  logout: () => Promise<void>;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  initialUsuario,
  children,
}: {
  initialUsuario: UsuarioPublico;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [usuario] = useState<UsuarioPublico>(initialUsuario);

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
