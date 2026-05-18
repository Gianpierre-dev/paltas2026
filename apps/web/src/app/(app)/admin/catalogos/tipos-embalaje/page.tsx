import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import { CatalogoTable, type CatalogoRow } from '../_components/catalogo-table';

interface TipoEmbalaje {
  id: string;
  codigo: string;
  descripcion: string;
  pesoKg: string | number;
  marca: string;
  activo: boolean;
}

function formatPeso(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return `${n} kg`;
}

export default async function TiposEmbalajeListPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  const items = await api<TipoEmbalaje[]>('/tipos-embalaje', {
    query: { includeInactive: true },
    accessToken: session.accessToken,
  }).catch(() => [] as TipoEmbalaje[]);

  const rows: CatalogoRow[] = items.map((v) => ({
    id: v.id,
    activo: v.activo,
    cells: [v.codigo, v.descripcion, formatPeso(v.pesoKg), v.marca],
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
            Tipos de embalaje
          </h2>
        </div>
        <Link
          href="/admin/catalogos/tipos-embalaje/nuevo"
          className="px-4 h-10 inline-flex items-center rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition"
        >
          + Nuevo
        </Link>
      </header>

      <CatalogoTable
        recurso="tipos-embalaje"
        headers={['Código', 'Descripción', 'Peso', 'Marca']}
        rows={rows}
        emptyMessage="Aún no hay tipos de embalaje cargados."
      />
    </div>
  );
}
