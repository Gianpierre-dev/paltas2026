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
  // Doble check (proxy.ts ya redirige, pero defensivo).
  if (!session) {
    redirect('/login');
  }

  // Datos completos del usuario para popular el Context inicial (evita flash de UI vacía).
  let usuario: UsuarioPublico;
  try {
    usuario = await api<UsuarioPublico>('/auth/me', {
      accessToken: session.accessToken,
    });
  } catch {
    // Si /auth/me falla (token revocado, usuario inactivo), forzamos re-login.
    redirect('/login');
  }

  return (
    <SessionProvider initialUsuario={usuario}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
