import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FamiliaDefecto, Rol } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import { CatalogoTable, type CatalogoRow } from '../_components/catalogo-table';

interface TipoDefecto {
  id: string;
  nombre: string;
  familia: FamiliaDefecto;
  orden: number;
  activo: boolean;
}

export default async function TiposDefectoListPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  const { familia } = await searchParams;
  const familiaFilter =
    familia === FamiliaDefecto.CALIDAD || familia === FamiliaDefecto.CONDICION
      ? familia
      : undefined;

  const items = await api<TipoDefecto[]>('/tipos-defecto', {
    query: {
      includeInactive: true,
      ...(familiaFilter ? { familia: familiaFilter } : {}),
    },
    accessToken: session.accessToken,
  }).catch(() => [] as TipoDefecto[]);

  const rows: CatalogoRow[] = items.map((v) => ({
    id: v.id,
    activo: v.activo,
    cells: [
      v.nombre,
      <FamiliaBadge key="f" familia={v.familia} />,
      v.orden,
    ],
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
            Tipos de defecto
          </h2>
        </div>
        <Link
          href="/admin/catalogos/tipos-defecto/nuevo"
          className="px-4 h-10 inline-flex items-center rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition"
        >
          + Nuevo
        </Link>
      </header>

      <FiltroFamilia activa={familiaFilter} />

      <CatalogoTable
        recurso="tipos-defecto"
        headers={['Nombre', 'Familia', 'Orden']}
        rows={rows}
        emptyMessage="Aún no hay tipos de defecto cargados."
      />
    </div>
  );
}

function FiltroFamilia({ activa }: { activa?: FamiliaDefecto }) {
  const opts: Array<{ value: FamiliaDefecto | undefined; label: string }> = [
    { value: undefined, label: 'Todas' },
    { value: FamiliaDefecto.CALIDAD, label: 'Calidad' },
    { value: FamiliaDefecto.CONDICION, label: 'Condición' },
  ];
  return (
    <div className="flex items-center gap-2 text-sm">
      {opts.map((o) => {
        const href = o.value
          ? `/admin/catalogos/tipos-defecto?familia=${o.value}`
          : '/admin/catalogos/tipos-defecto';
        const active = activa === o.value;
        return (
          <Link
            key={o.label}
            href={href}
            className={`px-3 py-1 rounded-full border transition ${
              active
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-zinc-700 border-zinc-300 hover:border-brand-500'
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function FamiliaBadge({ familia }: { familia: FamiliaDefecto }) {
  const style =
    familia === FamiliaDefecto.CALIDAD
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style}`}>
      {familia}
    </span>
  );
}
