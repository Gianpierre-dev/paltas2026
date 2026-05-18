import Link from 'next/link';
import { ResultadoFinal, TipoInspeccion } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerToken } from '@/lib/session';

interface InspeccionResumen {
  id: string;
  fecha: string;
  tipo: TipoInspeccion;
  numeroMuestra: number | null;
  resultadoFinal: ResultadoFinal | null;
  notaFinal: number | null;
  conteoMuestra: number | null;
  fundo: { nombre: string } | null;
  variedad: { nombre: string } | null;
  inspector: { nombre: string; apellido: string } | null;
}

interface InspeccionesResp {
  items: InspeccionResumen[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export default async function InspeccionesPage() {
  const token = await getServerToken();
  if (!token) return null;

  const data = await api<InspeccionesResp>('/inspecciones', {
    query: { pageSize: 50 },
    accessToken: token,
  }).catch(() => null);

  if (!data) {
    return (
      <div className="px-4 py-8 text-center text-sm text-red-600">
        No se pudo cargar el listado.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Inspecciones</h2>
        <span className="text-sm text-zinc-500">{data.pagination.total} totales</span>
      </header>

      {data.items.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center">
          <p className="text-zinc-500 mb-4">Aún no hay inspecciones cargadas</p>
          <Link
            href="/inspecciones/nueva"
            className="inline-block bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition"
          >
            Cargar la primera
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/inspecciones/${item.id}`}
                className="block bg-white border border-zinc-200 rounded-xl p-4 active:scale-[0.99] hover:border-brand-500 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {item.fundo?.nombre ?? '—'} · {item.variedad?.nombre ?? '—'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatDate(item.fecha)} · {item.tipo}
                      {item.numeroMuestra ? ` · M${item.numeroMuestra}` : ''}
                    </p>
                  </div>
                  <ResultadoBadge resultado={item.resultadoFinal} />
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {item.inspector
                      ? `${item.inspector.nombre} ${item.inspector.apellido}`
                      : ''}
                  </span>
                  <span>
                    {item.conteoMuestra ? `${item.conteoMuestra} frutos` : ''}
                    {item.notaFinal ? ` · Nota ${item.notaFinal}` : ''}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.substring(0, 10);
  }
}

function ResultadoBadge({ resultado }: { resultado: ResultadoFinal | null }) {
  if (!resultado) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-500">—</span>
    );
  }
  const styles: Record<ResultadoFinal, string> = {
    BUENO: 'bg-green-100 text-green-800',
    ACEPTABLE: 'bg-yellow-100 text-yellow-800',
    RECHAZO: 'bg-red-100 text-red-800',
  };
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${styles[resultado]}`}
    >
      {resultado}
    </span>
  );
}
