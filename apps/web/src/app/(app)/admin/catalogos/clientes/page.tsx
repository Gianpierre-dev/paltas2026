import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import { CatalogoTable, type CatalogoRow } from '../_components/catalogo-table';

interface Cliente {
  id: string;
  nombre: string;
  activo: boolean;
}

export default async function ClientesListPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  const items = await api<Cliente[]>('/clientes', {
    query: { includeInactive: true },
    accessToken: session.accessToken,
  }).catch(() => [] as Cliente[]);

  const rows: CatalogoRow[] = items.map((v) => ({
    id: v.id,
    activo: v.activo,
    cells: [v.nombre],
  }));

  return (
    <div className="px-4 py-4 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/catalogos"
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            ← Catálogos
          </Link>
          <h2 className="text-xl font-semibold text-zinc-900 mt-0.5">
            Clientes
          </h2>
        </div>
        <Link
          href="/admin/catalogos/clientes/nuevo"
          className="px-4 h-10 inline-flex items-center rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition"
        >
          + Nuevo
        </Link>
      </header>

      <CatalogoTable
        recurso="clientes"
        headers={['Nombre']}
        rows={rows}
        emptyMessage="Aún no hay clientes cargados."
      />
    </div>
  );
}
