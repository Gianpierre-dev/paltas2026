import { z } from 'zod';
import {
  Calibre,
  Categoria,
  EvaluacionFisica,
  ResultadoFinal,
  TipoInspeccion,
} from '../constants';

// Tupla de literales para Zod enum (z.enum requiere [string, ...string[]])
const TIPO_INSPECCION_VALUES = [
  TipoInspeccion.EXPORTACION,
  TipoInspeccion.DESCARTE,
  TipoInspeccion.RECEPCION,
] as const;

const CATEGORIA_VALUES = [Categoria.CAT1, Categoria.CAT2] as const;

const CALIBRE_VALUES = [
  Calibre.C08,
  Calibre.C10,
  Calibre.C12,
  Calibre.C14,
  Calibre.C16,
  Calibre.C18,
  Calibre.C20,
  Calibre.C22,
  Calibre.C24,
  Calibre.C30,
] as const;

const EVALUACION_FISICA_VALUES = [
  EvaluacionFisica.BUENO,
  EvaluacionFisica.ACEPTABLE,
  EvaluacionFisica.MALO,
] as const;

const RESULTADO_FINAL_VALUES = [
  ResultadoFinal.BUENO,
  ResultadoFinal.ACEPTABLE,
  ResultadoFinal.RECHAZO,
] as const;

// Item de defecto en el body de la inspección — solo cantidad de frutos.
export const DefectoInputSchema = z.object({
  tipoDefectoId: z.string().uuid(),
  cantidadFrutos: z.number().int().positive('Debe ser mayor a 0'),
});
export type DefectoInput = z.infer<typeof DefectoInputSchema>;

export const CreateInspeccionInputSchema = z.object({
  tipo: z.enum(TIPO_INSPECCION_VALUES),
  fecha: z.coerce.date(),
  numeroMuestra: z.number().int().positive().optional(),

  fundoId: z.string().uuid(),
  variedadId: z.string().uuid(),

  // Campos específicos de EXPORTACION (opcionales)
  tipoEmbalajeId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  destinoId: z.string().uuid().optional(),
  categoria: z.enum(CATEGORIA_VALUES).optional(),
  plu: z.boolean().optional(),
  calibre: z.enum(CALIBRE_VALUES).optional(),

  conteoMuestra: z.number().int().positive('Conteo debe ser mayor a 0'),

  calidadEmbalaje: z.enum(EVALUACION_FISICA_VALUES).optional(),
  rotulacion: z.enum(EVALUACION_FISICA_VALUES).optional(),
  paletizaje: z.enum(EVALUACION_FISICA_VALUES).optional(),

  observaciones: z.string().max(2000).optional(),

  defectos: z.array(DefectoInputSchema).default([]),
});
export type CreateInspeccionInput = z.infer<typeof CreateInspeccionInputSchema>;

// Update: TODOS los campos opcionales, pero si llega `defectos` reemplaza la lista entera.
// Backend va a recalcular sumatorias y notas si llegan defectos o conteoMuestra.
export const UpdateInspeccionInputSchema = z.object({
  tipo: z.enum(TIPO_INSPECCION_VALUES).optional(),
  fecha: z.coerce.date().optional(),
  numeroMuestra: z.number().int().positive().optional().nullable(),

  fundoId: z.string().uuid().optional(),
  variedadId: z.string().uuid().optional(),

  tipoEmbalajeId: z.string().uuid().optional().nullable(),
  clienteId: z.string().uuid().optional().nullable(),
  destinoId: z.string().uuid().optional().nullable(),
  categoria: z.enum(CATEGORIA_VALUES).optional().nullable(),
  plu: z.boolean().optional().nullable(),
  calibre: z.enum(CALIBRE_VALUES).optional().nullable(),

  conteoMuestra: z.number().int().positive().optional(),

  calidadEmbalaje: z.enum(EVALUACION_FISICA_VALUES).optional().nullable(),
  rotulacion: z.enum(EVALUACION_FISICA_VALUES).optional().nullable(),
  paletizaje: z.enum(EVALUACION_FISICA_VALUES).optional().nullable(),

  observaciones: z.string().max(2000).optional().nullable(),

  // Si llega, reemplaza la lista completa de defectos.
  defectos: z.array(DefectoInputSchema).optional(),
});
export type UpdateInspeccionInput = z.infer<typeof UpdateInspeccionInputSchema>;

export const ListInspeccionesQuerySchema = z.object({
  tipo: z.enum(TIPO_INSPECCION_VALUES).optional(),
  fundoId: z.string().uuid().optional(),
  variedadId: z.string().uuid().optional(),
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),
  resultado: z.enum(RESULTADO_FINAL_VALUES).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(50),
});
export type ListInspeccionesQuery = z.infer<typeof ListInspeccionesQuerySchema>;
