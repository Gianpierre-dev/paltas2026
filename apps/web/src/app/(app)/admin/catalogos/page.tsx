import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerSession } from '@/lib/session';

interface MinimalItem {
  id: string;
}

async function safeCount(path: string, token: string): Promise<number> {
  try {
    const items = await api<MinimalItem[]>(path, { accessToken: token });
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
}

const CARDS = [
  { recurso: 'variedades', icon: '🥑', title: 'Variedades' },
  { recurso: 'fundos', icon: '🌳', title: 'Fundos' },
  { recurso: 'clientes', icon: '👥', title: 'Clientes' },
  { recurso: 'destinos', icon: '🌎', title: 'Destinos' },
  { recurso: 'tipos-embalaje', icon: '📦', title: 'Tipos de embalaje' },
  { recurso: 'tipos-defecto', icon: '⚠️', title: 'Tipos de defecto' },
] as const;

export default async function CatalogosIndexPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  const token = session.accessToken;
  // GET sin includeInactive trae solo activos -> conteo correcto.
  const [variedades, fundos, clientes, destinos, embalajes, defectos] =
    await Promise.all([
      safeCount('/variedades', token),
      safeCount('/fundos', token),
      safeCount('/clientes', token),
      safeCount('/destinos', token),
      safeCount('/tipos-embalaje', token),
      safeCount('/tipos-defecto', token),
    ]);

  const counts: Record<string, number> = {
    variedades,
    fundos,
    clientes,
    destinos,
    'tipos-embalaje': embalajes,
    'tipos-defecto': defectos,
  };

  return (
    <div className="px-4 py-6 space-y-5">
      <header>
        <h2 className="text-xl font-semibold text-zinc-900">Catálogos</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Gestioná los datos maestros del sistema.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CARDS.map((c) => (
          <Link
            key={c.recurso}
            href={`/admin/catalogos/${c.recurso}`}
            className="block bg-white rounded-xl border border-zinc-200 p-4 hover:border-brand-500 transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{c.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-zinc-900">{c.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {counts[c.recurso]} activos
                </p>
              </div>
              <span className="text-zinc-400">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
