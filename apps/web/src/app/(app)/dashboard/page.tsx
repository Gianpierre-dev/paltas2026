import Link from 'next/link';
import { Rol } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerSession, getServerToken } from '@/lib/session';

interface InspeccionListResp {
  pagination: { total: number };
}

async function getStats(token: string) {
  // Pedimos solo 1 elemento — nos interesa el total
  return api<InspeccionListResp>('/inspecciones', {
    query: { pageSize: 1 },
    accessToken: token,
  }).catch(() => ({ pagination: { total: 0 } }));
}

export default async function DashboardPage() {
  const session = await getServerSession();
  const token = await getServerToken();
  if (!session || !token) return null;

  const stats = await getStats(token);
  const esAdmin = session.usuario.rol === Rol.ADMIN;

  return (
    <div className="px-4 py-6 space-y-6">
      <section>
        <h2 className="text-xl font-semibold text-zinc-900">
          Hola, {session.usuario.nombre} 👋
        </h2>
        <p className="text-sm text-zinc-600 mt-0.5">
          {esAdmin
            ? 'Tenés acceso completo al sistema.'
            : 'Listo para cargar inspecciones de hoy.'}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Card label="Inspecciones totales" value={stats.pagination.total.toString()} />
        <Card label="Rol" value={session.usuario.rol} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          Acciones rápidas
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <ActionCard
            href="/inspecciones/nueva"
            icon="➕"
            title="Nueva inspección"
            description="Cargar una muestra"
            primary
          />
          <ActionCard
            href="/inspecciones"
            icon="📋"
            title="Ver inspecciones"
            description="Listado y filtros"
          />
          {esAdmin && (
            <ActionCard
              href="/admin/resumen"
              icon="📊"
              title="Planilla resumen (Admin)"
              description="Vista del día por fundo"
            />
          )}
          {esAdmin && (
            <ActionCard
              href="/admin/catalogos"
              icon="⚙️"
              title="Catálogos (Admin)"
              description="Gestionar variedades, fundos, defectos, etc."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900 mt-1">{value}</p>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  primary = false,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 transition active:scale-[0.98] ${
        primary
          ? 'bg-brand-500 text-white border-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20'
          : 'bg-white text-zinc-900 border-zinc-200 hover:border-brand-500'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="font-medium">{title}</p>
          <p className={`text-sm ${primary ? 'text-brand-50/90' : 'text-zinc-600'}`}>
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
