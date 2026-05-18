// Tipos locales del módulo InspeccionesStats.
// NO se exportan a packages/shared a propósito — son tipos de respuesta del endpoint.
import type { FamiliaDefecto } from '@prisma/client';

export interface StatsQuery {
  fechaDesde: Date;
  fechaHasta: Date;
}

export interface RangoFechas {
  desde: string; // YYYY-MM-DD
  hasta: string;
}

export interface PorResultado {
  BUENO: number;
  ACEPTABLE: number;
  RECHAZO: number;
  SIN_RESULTADO: number;
}

export interface PorFundoItem {
  fundoId: string;
  fundoNombre: string;
  count: number;
}

export interface PorVariedadItem {
  variedadId: string;
  variedadNombre: string;
  count: number;
}

export interface DefectoTopItem {
  tipoDefectoId: string;
  nombre: string;
  familia: FamiliaDefecto;
  totalInspecciones: number;
  porcentajePromedio: number;
}

export interface PorDiaItem {
  fecha: string; // YYYY-MM-DD
  count: number;
}

export interface StatsResponse {
  rangoFechas: RangoFechas;
  totalInspecciones: number;
  porResultado: PorResultado;
  porFundo: PorFundoItem[];
  porVariedad: PorVariedadItem[];
  defectosTop: DefectoTopItem[];
  porDia: PorDiaItem[];
}
