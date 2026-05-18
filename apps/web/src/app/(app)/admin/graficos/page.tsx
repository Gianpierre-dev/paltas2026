import { redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerSession, getServerToken } from '@/lib/session';
import { ChartsClient } from './charts-client';
import { FiltrosGraficos } from './filtros';

// Tipos locales — coinciden con el StatsResponse del backend.
// NO se importan desde shared para mantener el paquete shared intacto.
interface StatsResponse {
  rangoFechas: { desde: string; hasta: string };
  totalInspecciones: number;
  porResultado: {
    BUENO: number;
    ACEPTABLE: number;
    RECHAZO: number;
    SIN_RESULTADO: number;
  };
  porFundo: Array<{ fundoId: string; fundoNombre: string; count: number }>;
  porVariedad: Array<{ variedadId: string; variedadNombre: string; count: number }>;
  defectosTop: Array<{
    tipoDefectoId: string;
    nombre: string;
    familia: 'CALIDAD' | 'CONDICION';
    totalInspecciones: number;
    porcentajePromedio: number;
  }>;
  porDia: Array<{ fecha: string; count: number }>;
}

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function defaultRange(): { desde: string; hasta: string } {
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - 30);
  return { desde: toISODate(desde), hasta: toISODate(hoy) };
}

function formatFechaLarga(iso: string): string {
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

export default async function GraficosAdminPage({
  searchParams,
}: {
  // Next 16: searchParams es Promise
  searchParams: Promise<{ fechaDesde?: string; fechaHasta?: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;
  if (session.usuario.rol !== Rol.ADMIN) {
    redirect('/dashboard');
  }

  const token = await getServerToken();
  if (!token) return null;

  const params = await searchParams;
  const defaults = defaultRange();
  const fechaDesde = params.fechaDesde ?? defaults.desde;
  const fechaHasta = params.fechaHasta ?? defaults.hasta;

  const data = await api<StatsResponse>('/inspecciones-stats', {
    query: { fechaDesde, fechaHasta },
    accessToken: token,
  }).catch(() => null);

  return (
    <div className="px-4 py-4 space-y-4">
      <header className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Gráficos</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Estadísticas por rango — {formatFechaLarga(fechaDesde)} a{' '}
            {formatFechaLarga(fechaHasta)}
          </p>
        </div>
        <FiltrosGraficos fechaDesde={fechaDesde} fechaHasta={fechaHasta} />
      </header>

      {!data ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 text-center text-sm text-red-600">
          No se pudo cargar la información de gráficos.
        </div>
      ) : data.totalInspecciones === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center">
          <p className="text-zinc-700 font-medium">Sin inspecciones</p>
          <p className="text-sm text-zinc-500 mt-1">
            No hay inspecciones cargadas en el rango seleccionado.
          </p>
        </div>
      ) : (
        <ChartsClient data={data} />
      )}
    </div>
  );
}
