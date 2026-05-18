'use client';

import type { Session } from '@/lib/session-client';
import { clearClientSession } from '@/lib/session-client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/inspecciones', label: 'Inspecciones', icon: '📋' },
  { href: '/inspecciones/nueva', label: 'Cargar', icon: '➕' },
] as const;

export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearClientSession();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="sticky top-0 z-30 bg-brand-500 text-white shadow-md">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥑</span>
            <div>
              <h1 className="font-semibold text-base leading-tight">Paltas 2026</h1>
              <p className="text-xs text-brand-50/80 leading-tight">
                {session.usuario.nombre} · {session.usuario.rol}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 active:bg-white/30 transition"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-zinc-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <ul className="flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs transition ${
                    active
                      ? 'text-brand-600 font-medium'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
