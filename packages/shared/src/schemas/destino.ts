import { z } from 'zod';

export const DestinoSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1).max(50),
  activo: z.boolean(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type Destino = z.infer<typeof DestinoSchema>;

export const CreateDestinoInputSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(50).trim(),
});
export type CreateDestinoInput = z.infer<typeof CreateDestinoInputSchema>;

export const UpdateDestinoInputSchema = z.object({
  nombre: z.string().min(1).max(50).trim().optional(),
  activo: z.boolean().optional(),
});
export type UpdateDestinoInput = z.infer<typeof UpdateDestinoInputSchema>;

export const ListDestinosQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});
export type ListDestinosQuery = z.infer<typeof ListDestinosQuerySchema>;
