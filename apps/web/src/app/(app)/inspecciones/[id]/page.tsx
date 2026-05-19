import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  FamiliaDefecto,
  Rol,
  ResultadoFinal,
  type Calibre,
  type Categoria,
  type EvaluacionFisica,
  type TipoInspeccion,
} from '@paltas2026/shared';
import { ApiError, api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import { AdminActions } from './_components/admin-actions';

interface InspeccionDetalle {
  id: string;
  tipo: TipoInspeccion;
  fecha: string;
  numeroMuestra: number | null;
  categoria: Categoria | null;
  calibre: Calibre | null;
  plu: boolean | null;
  conteoMuestra: number | null;
  calidadEmbalaje: EvaluacionFisica | null;
  rotulacion: EvaluacionFisica | null;
  paletizaje: EvaluacionFisica | null;
  sumatoriaCalidad: string | null;
  sumatoriaCondicion: string | null;
  notaCalidad: number | null;
  notaCondicion: number | null;
  notaFinal: number | null;
  resultadoFinal: ResultadoFinal | null;
  createdAt: string;
  fundo: { nombre: string } | null;
  variedad: { nombre: string } | null;
  cliente: { nombre: string } | null;
  destino: { nombre: string } | null;
  tipoEmbalaje: { codigo: string; descripcion: string } | null;
  inspector: { nombre: string; apellido: string; email: string } | null;
  defectos: Array<{
    id: string;
    cantidadFrutos: number;
    porcentajeCalculado: string;
    tipoDefecto: { nombre: string; familia: FamiliaDefecto };
  }>;
}

export default async function DetalleInspeccionPage({
  params,
}: {
  // Next 16: params es Promise
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) return null;
  const token = session.accessToken;
  const isAdmin = session.usuario.rol === Rol.ADMIN;

  let data: InspeccionDetalle | null = null;
  try {
    data = await api<InspeccionDetalle>(`/inspecciones/${id}`, { accessToken: token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <div className="px-4 py-8 text-center text-sm text-red-600">
        No se pudo cargar la inspección.
      </div>
    );
  }
  if (!data) notFound();

  const defectosCalidad = data.defectos.filter(
    (d) => d.tipoDefecto.familia === FamiliaDefecto.CALIDAD,
  );
  const defectosCondicion = data.defectos.filter(
    (d) => d.tipoDefecto.familia === FamiliaDefecto.CONDICION,
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">
            {data.fundo?.nombre ?? '—'} · {data.variedad?.nombre ?? '—'}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {formatDate(data.fecha)} · {data.tipo}
            {data.numeroMuestra ? ` · Muestra ${data.numeroMuestra}` : ''}
          </p>
        </div>
        <ResultadoBadge resultado={data.resultadoFinal} />
      </header>

      {/* Resumen de notas */}
      <section className="grid grid-cols-3 gap-2">
        <NotaCard label="Calidad" nota={data.notaCalidad} sum={data.sumatoriaCalidad} />
        <NotaCard label="Condición" nota={data.notaCondicion} sum={data.sumatoriaCondicion} />
        <NotaCard label="Final" nota={data.notaFinal} highlight />
      </section>

      {/* Encabezado */}
      <Card title="Encabezado">
        <KV label="Cliente" value={data.cliente?.nombre} />
        <KV label="Destino" value={data.destino?.nombre} />
        <KV
          label="Embalaje"
          value={
            data.tipoEmbalaje
              ? `${data.tipoEmbalaje.codigo} — ${data.tipoEmbalaje.descripcion}`
              : null
          }
        />
        <KV label="Categoría" value={data.categoria} />
        <KV label="PLU" value={data.plu === null ? null : data.plu ? 'SÍ' : 'NO'} />
        <KV
          label="Inspector"
          value={
            data.inspector
              ? `${data.inspector.nombre} ${data.inspector.apellido}`
              : null
          }
        />
      </Card>

      {/* Embalaje */}
      <Card title="Embalaje">
        <KV label="Conteo total" value={data.conteoMuestra?.toString()} />
        <KV label="Calibre" value={data.calibre?.replace('C', '')} />
        <KV label="Calidad embalaje" value={data.calidadEmbalaje} />
        <KV label="Rotulación" value={data.rotulacion} />
        <KV label="Paletizaje" value={data.paletizaje} />
      </Card>

      {/* Defectos */}
      {data.defectos.length === 0 ? (
        <Card title="Defectos">
          <p className="text-sm text-zinc-500">Sin defectos cargados.</p>
        </Card>
      ) : (
        <>
          {defectosCalidad.length > 0 && (
            <Card title={`Defectos de calidad (${data.sumatoriaCalidad ?? 0}%)`}>
              <DefectosList items={defectosCalidad} />
            </Card>
          )}
          {defectosCondicion.length > 0 && (
            <Card title={`Defectos de condición (${data.sumatoriaCondicion ?? 0}%)`}>
              <DefectosList items={defectosCondicion} />
            </Card>
          )}
        </>
      )}

      {isAdmin && <AdminActions inspeccionId={data.id} />}

      <div className="pt-2">
        <Link
          href="/inspecciones"
          className="block w-full text-center py-3 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
        >
          ← Volver al listado
        </Link>
      </div>
    </div>
  );
}

function NotaCard({
  label,
  nota,
  sum,
  highlight = false,
}: {
  label: string;
  nota: number | null;
  sum?: string | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        highlight
          ? 'bg-brand-50 border-brand-500/50'
          : 'bg-white border-zinc-200'
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900 mt-0.5">{nota ?? '—'}</p>
      {sum !== undefined && sum !== null && (
        <p className="text-[10px] text-zinc-400 mt-0.5">{sum}%</p>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-zinc-200 rounded-xl">
      <header className="px-4 py-2.5 text-sm font-medium text-zinc-700 border-b border-zinc-100">
        {title}
      </header>
      <div className="px-4 py-3 space-y-1.5">{children}</div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-900 text-right">{value || '—'}</span>
    </div>
  );
}

function DefectosList({
  items,
}: {
  items: InspeccionDetalle['defectos'];
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((d) => (
        <li key={d.id} className="flex justify-between text-sm">
          <span className="text-zinc-700">{d.tipoDefecto.nombre}</span>
          <span className="text-zinc-900 font-medium">
            {d.cantidadFrutos} · {d.porcentajeCalculado}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function ResultadoBadge({ resultado }: { resultado: ResultadoFinal | null }) {
  if (!resultado) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-500">—</span>
    );
  }
  const styles: Record<ResultadoFinal, string> = {
    BUENO: 'bg-green-100 text-green-800 border-green-300',
    ACEPTABLE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    RECHAZO: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <span
      className={`text-sm font-medium px-3 py-1 rounded-full border whitespace-nowrap ${styles[resultado]}`}
    >
      {resultado}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso.substring(0, 10);
  }
}
