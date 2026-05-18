import { redirect } from 'next/navigation';
import {
  FamiliaDefecto,
  ResultadoFinal,
  Rol,
  type Calibre,
  type Categoria,
  type EvaluacionFisica,
} from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerSession, getServerToken } from '@/lib/session';
import { FiltrosResumen } from './filtros';

interface FundoLite {
  id: string;
  nombre: string;
  activo?: boolean;
}

interface TipoDefectoLite {
  id: string;
  nombre: string;
  familia: FamiliaDefecto;
  orden: number;
}

interface InspeccionResumenItem {
  id: string;
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
  observaciones: string | null;
  variedad: { id: string; nombre: string } | null;
  cliente: { id: string; nombre: string } | null;
  destino: { id: string; nombre: string } | null;
  tipoEmbalaje: { id: string; codigo: string; descripcion: string } | null;
  fundo: { id: string; nombre: string } | null;
  inspector: { id: string; nombre: string; apellido: string; email: string } | null;
  defectos: Array<{
    id: string;
    cantidadFrutos: number;
    porcentajeCalculado: string;
    tipoDefecto: { id: string; nombre: string; familia: FamiliaDefecto };
  }>;
}

interface ResumenResponse {
  fecha: string;
  fundo: { id: string; nombre: string } | null;
  inspecciones: InspeccionResumenItem[];
  tiposDefecto: TipoDefectoLite[];
}

function hoyISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default async function ResumenAdminPage({
  searchParams,
}: {
  // Next 16: searchParams es Promise
  searchParams: Promise<{ fecha?: string; fundoId?: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;
  if (session.usuario.rol !== Rol.ADMIN) {
    redirect('/dashboard');
  }

  const token = await getServerToken();
  if (!token) return null;

  const params = await searchParams;
  const fecha = params.fecha ?? hoyISO();
  const fundoId = params.fundoId ?? null;

  const [fundos, data] = await Promise.all([
    api<FundoLite[]>('/fundos', { accessToken: token }).catch(
      () => [] as FundoLite[],
    ),
    api<ResumenResponse>('/inspecciones-resumen', {
      query: { fecha, ...(fundoId && { fundoId }) },
      accessToken: token,
    }).catch(() => null),
  ]);

  return (
    <div className="px-4 py-4 space-y-4">
      <header className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Planilla resumen</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Vista pivot del día — exportación
          </p>
        </div>
        <FiltrosResumen fecha={fecha} fundoId={fundoId} fundos={fundos} />
      </header>

      {!data ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 text-center text-sm text-red-600">
          No se pudo cargar el resumen.
        </div>
      ) : data.inspecciones.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center">
          <p className="text-zinc-700 font-medium">Sin inspecciones</p>
          <p className="text-sm text-zinc-500 mt-1">
            No hay muestras cargadas para{' '}
            <span className="font-medium">{formatFecha(data.fecha)}</span>
            {data.fundo ? ` en ${data.fundo.nombre}` : ''}.
          </p>
        </div>
      ) : (
        <PivotTable data={data} />
      )}
    </div>
  );
}

function PivotTable({ data }: { data: ResumenResponse }) {
  const inspecciones = data.inspecciones;
  const tiposCalidad = data.tiposDefecto.filter(
    (t) => t.familia === FamiliaDefecto.CALIDAD,
  );
  const tiposCondicion = data.tiposDefecto.filter(
    (t) => t.familia === FamiliaDefecto.CONDICION,
  );

  const headerMuestras = inspecciones.map(
    (i, idx) => `M${i.numeroMuestra ?? idx + 1}`,
  );

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead className="bg-zinc-50">
            <tr>
              <th className="sticky left-0 z-[1] bg-zinc-50 text-left font-medium text-zinc-700 px-3 py-2 border-b border-r border-zinc-200 min-w-[160px]">
                Atributo
              </th>
              {headerMuestras.map((label, idx) => (
                <th
                  key={inspecciones[idx].id}
                  className="text-center font-medium text-zinc-700 px-2 py-2 border-b border-zinc-200 min-w-[80px]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Variedad">
              {inspecciones.map((i) => i.variedad?.nombre ?? '—')}
            </Row>
            <Row label="Embalaje">
              {inspecciones.map((i) => i.tipoEmbalaje?.codigo ?? '—')}
            </Row>
            <Row label="Cliente">
              {inspecciones.map((i) => i.cliente?.nombre ?? '—')}
            </Row>
            <Row label="Categoría">
              {inspecciones.map((i) => i.categoria ?? '—')}
            </Row>
            <Row label="PLU">
              {inspecciones.map((i) =>
                i.plu === null ? '—' : i.plu ? 'SÍ' : 'NO',
              )}
            </Row>
            <Row label="Calibre">
              {inspecciones.map((i) => i.calibre?.replace('C', '') ?? '—')}
            </Row>
            <Row label="Calidad embalaje">
              {inspecciones.map((i) => i.calidadEmbalaje ?? '—')}
            </Row>
            <Row label="Rotulación">
              {inspecciones.map((i) => i.rotulacion ?? '—')}
            </Row>
            <Row label="Paletizaje">
              {inspecciones.map((i) => i.paletizaje ?? '—')}
            </Row>

            <SectionDivider label="Defectos de calidad" colSpan={inspecciones.length + 1} />
            {tiposCalidad.map((td) => (
              <Row key={td.id} label={td.nombre} subtle>
                {inspecciones.map((i) => formatDefecto(i, td.id))}
              </Row>
            ))}
            <Row label="Σ Calidad" emphasis>
              {inspecciones.map((i) => formatPct(i.sumatoriaCalidad))}
            </Row>
            <Row label="Nota Calidad" emphasis>
              {inspecciones.map((i) => i.notaCalidad?.toString() ?? '—')}
            </Row>

            <SectionDivider label="Defectos de condición" colSpan={inspecciones.length + 1} />
            {tiposCondicion.map((td) => (
              <Row key={td.id} label={td.nombre} subtle>
                {inspecciones.map((i) => formatDefecto(i, td.id))}
              </Row>
            ))}
            <Row label="Σ Condición" emphasis>
              {inspecciones.map((i) => formatPct(i.sumatoriaCondicion))}
            </Row>
            <Row label="Nota Condición" emphasis>
              {inspecciones.map((i) => i.notaCondicion?.toString() ?? '—')}
            </Row>

            <SectionDivider label="Resultado" colSpan={inspecciones.length + 1} />
            <Row label="Nota Final" emphasis>
              {inspecciones.map((i) => i.notaFinal?.toString() ?? '—')}
            </Row>
            <Row label="Resultado" emphasis>
              {inspecciones.map((i) => i.resultadoFinal ?? '—')}
            </Row>
            <Row label="Inspector" subtle>
              {inspecciones.map((i) =>
                i.inspector ? `${i.inspector.nombre} ${i.inspector.apellido}` : '—',
              )}
            </Row>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  subtle = false,
  emphasis = false,
}: {
  label: string;
  children: (string | number)[];
  subtle?: boolean;
  emphasis?: boolean;
}) {
  const labelClass = emphasis
    ? 'font-semibold text-zinc-900'
    : subtle
    ? 'text-zinc-600'
    : 'text-zinc-800';
  const rowBg = emphasis ? 'bg-brand-50/40' : 'bg-white';
  return (
    <tr className={`${rowBg} hover:bg-zinc-50`}>
      <td
        className={`sticky left-0 z-[1] px-3 py-1.5 border-b border-r border-zinc-100 whitespace-nowrap ${rowBg} ${labelClass}`}
      >
        {label}
      </td>
      {children.map((value, idx) => (
        <td
          key={idx}
          className={`text-center px-2 py-1.5 border-b border-zinc-100 whitespace-nowrap ${
            emphasis ? 'font-medium text-zinc-900' : 'text-zinc-700'
          }`}
        >
          {value === '' ? '—' : value}
        </td>
      ))}
    </tr>
  );
}

function SectionDivider({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="bg-zinc-100">
      <td
        colSpan={colSpan}
        className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 border-b border-zinc-200"
      >
        {label}
      </td>
    </tr>
  );
}

function formatDefecto(
  inspeccion: InspeccionResumenItem,
  tipoDefectoId: string,
): string {
  const d = inspeccion.defectos.find((x) => x.tipoDefecto.id === tipoDefectoId);
  if (!d) return '';
  return formatPct(d.porcentajeCalculado);
}

function formatPct(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '';
  // Trim trailing zeros para que no muestre 12.000 sino 12 o 12.5
  const fixed = num.toFixed(2).replace(/\.?0+$/, '');
  return `${fixed}%`;
}

function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
