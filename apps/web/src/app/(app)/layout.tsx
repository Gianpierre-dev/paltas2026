import { redirect } from 'next/navigation';
import type { UsuarioPublico } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { SessionProvider } from '@/lib/session-context';
import { getServerSession } from '@/lib/session';
import { AppShell } from './_components/app-shell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  // eslint-disable-next-line no-console
  console.log('[APP-LAYOUT] session=', session ? `present sub=${session.claims.sub}` : 'NULL');

  // Doble check (proxy.ts ya redirige, pero defensivo).
  if (!session) {
    // eslint-disable-next-line no-console
    console.log('[APP-LAYOUT] redirect → /login (no session)');
    redirect('/login');
  }

  // Datos completos del usuario para popular el Context inicial (evita flash de UI vacía).
  let usuario: UsuarioPublico;
  try {
    usuario = await api<UsuarioPublico>('/auth/me', {
      accessToken: session.accessToken,
    });
    // eslint-disable-next-line no-console
    console.log('[APP-LAYOUT] /auth/me OK', { id: usuario.id, mcp: usuario.mustChangePassword });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.log('[APP-LAYOUT] /auth/me FAILED →', msg, '→ redirect /api/auth/clear-session');
    // Si /auth/me falla (token revocado, firma inválida, usuario inactivo),
    // hay que LIMPIAR cookies antes de redirigir — sino proxy.ts ve la
    // cookie de refresh y vuelve a /dashboard generando un loop.
    redirect('/api/auth/clear-session');
  }

  return (
    <SessionProvider initialUsuario={usuario}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
