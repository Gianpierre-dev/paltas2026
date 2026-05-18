import { z } from 'zod';

export const TipoEmbalajeSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string().min(1).max(20),
  descripcion: z.string().min(1).max(100),
  pesoKg: z.number().or(z.string()),
  marca: z.string().min(1).max(50),
  activo: z.boolean(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type TipoEmbalaje = z.infer<typeof TipoEmbalajeSchema>;

export const CreateTipoEmbalajeInputSchema = z.object({
  codigo: z.string().min(1, 'Código requerido').max(20).trim().toUpperCase(),
  descripcion: z.string().min(1, 'Descripción requerida').max(100).trim(),
  pesoKg: z.number().positive('Peso debe ser > 0').max(9999.99),
  marca: z.string().min(1, 'Marca requerida').max(50).trim(),
});
export type CreateTipoEmbalajeInput = z.infer<typeof CreateTipoEmbalajeInputSchema>;

export const UpdateTipoEmbalajeInputSchema = z.object({
  codigo: z.string().min(1).max(20).trim().toUpperCase().optional(),
  descripcion: z.string().min(1).max(100).trim().optional(),
  pesoKg: z.number().positive().max(9999.99).optional(),
  marca: z.string().min(1).max(50).trim().optional(),
  activo: z.boolean().optional(),
});
export type UpdateTipoEmbalajeInput = z.infer<typeof UpdateTipoEmbalajeInputSchema>;

export const ListTiposEmbalajeQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});
export type ListTiposEmbalajeQuery = z.infer<typeof ListTiposEmbalajeQuerySchema>;
