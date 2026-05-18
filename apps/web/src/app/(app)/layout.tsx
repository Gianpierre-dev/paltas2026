import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { AppShell } from './_components/app-shell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  // Doble check (el proxy.ts ya redirige, pero defensivo)
  if (!session) {
    redirect('/login');
  }
  return <AppShell session={session}>{children}</AppShell>;
}
