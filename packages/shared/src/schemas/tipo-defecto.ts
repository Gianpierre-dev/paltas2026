import { z } from 'zod';
import { FamiliaDefecto } from '../constants';

const FAMILIA_VALUES = [FamiliaDefecto.CALIDAD, FamiliaDefecto.CONDICION] as const;

export const TipoDefectoSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1).max(80),
  familia: z.enum(FAMILIA_VALUES),
  orden: z.number().int(),
  activo: z.boolean(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type TipoDefecto = z.infer<typeof TipoDefectoSchema>;

export const CreateTipoDefectoInputSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(80).trim(),
  familia: z.enum(FAMILIA_VALUES),
  orden: z.number().int().nonnegative().optional().default(0),
});
export type CreateTipoDefectoInput = z.infer<typeof CreateTipoDefectoInputSchema>;

export const UpdateTipoDefectoInputSchema = z.object({
  nombre: z.string().min(1).max(80).trim().optional(),
  familia: z.enum(FAMILIA_VALUES).optional(),
  orden: z.number().int().nonnegative().optional(),
  activo: z.boolean().optional(),
});
export type UpdateTipoDefectoInput = z.infer<typeof UpdateTipoDefectoInputSchema>;

export const ListTiposDefectoQuerySchema = z.object({
  familia: z.enum(FAMILIA_VALUES).optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});
export type ListTiposDefectoQuery = z.infer<typeof ListTiposDefectoQuerySchema>;
