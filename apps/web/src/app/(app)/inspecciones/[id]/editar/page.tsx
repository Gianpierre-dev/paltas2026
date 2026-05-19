import { notFound, redirect } from 'next/navigation';
import {
  Rol,
  type Calibre,
  type Categoria,
  type EvaluacionFisica,
  type TipoInspeccion,
} from '@paltas2026/shared';
import { ApiError, api } from '@/lib/api';
import { fetchCatalogosForForm } from '@/lib/catalogos';
import { getServerSession } from '@/lib/session';
import { EditarInspeccionForm, type InspeccionParaEditar } from './_components/editar-form';

interface InspeccionRaw {
  id: string;
  tipo: TipoInspeccion;
  fecha: string;
  numeroMuestra: number | null;
  fundoId: string;
  variedadId: string;
  tipoEmbalajeId: string | null;
  clienteId: string | null;
  destinoId: string | null;
  categoria: Categoria | null;
  plu: boolean | null;
  calibre: Calibre | null;
  conteoMuestra: number | null;
  calidadEmbalaje: EvaluacionFisica | null;
  rotulacion: EvaluacionFisica | null;
  paletizaje: EvaluacionFisica | null;
  inspector: { id: string } | null;
  defectos: Array<{
    tipoDefectoId: string;
    cantidadFrutos: number;
  }>;
}

export default async function EditarInspeccionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect('/login');

  let raw: InspeccionRaw | null = null;
  try {
    raw = await api<InspeccionRaw>(`/inspecciones/${id}`, {
      accessToken: session.accessToken,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <div className="px-4 py-8 text-center text-sm text-red-600">
        No se pudo cargar la inspección.
      </div>
    );
  }
  if (!raw) notFound();

  // Admin puede editar cualquiera; inspector solo las propias.
  const isAdmin = session.usuario.rol === Rol.ADMIN;
  const isOwner = raw.inspector?.id === session.usuario.id;
  if (!isAdmin && !isOwner) redirect(`/inspecciones/${id}`);

  const catalogos = await fetchCatalogosForForm();
  if (!catalogos) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-red-600">No se pudieron cargar los catálogos.</p>
      </div>
    );
  }

  // Mapeo a shape esperado por el form: defectos array -> objeto { tipoDefectoId: cantidad }
  const cantidadPorDefecto: Record<string, number> = {};
  for (const d of raw.defectos) {
    cantidadPorDefecto[d.tipoDefectoId] = d.cantidadFrutos;
  }

  const inspeccion: InspeccionParaEditar = {
    id: raw.id,
    tipo: raw.tipo,
    // El backend devuelve fecha ISO. El input date espera YYYY-MM-DD.
    fecha: raw.fecha.substring(0, 10),
    numeroMuestra: raw.numeroMuestra,
    fundoId: raw.fundoId,
    variedadId: raw.variedadId,
    tipoEmbalajeId: raw.tipoEmbalajeId,
    clienteId: raw.clienteId,
    destinoId: raw.destinoId,
    categoria: raw.categoria,
    plu: raw.plu,
    calibre: raw.calibre,
    conteoMuestra: raw.conteoMuestra,
    calidadEmbalaje: raw.calidadEmbalaje,
    rotulacion: raw.rotulacion,
    paletizaje: raw.paletizaje,
    cantidadPorDefecto,
  };

  return <EditarInspeccionForm catalogos={catalogos} inspeccion={inspeccion} />;
}
