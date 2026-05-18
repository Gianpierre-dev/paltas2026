import { z } from 'zod';

export const VariedadSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1).max(50),
  activo: z.boolean(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type Variedad = z.infer<typeof VariedadSchema>;

export const CreateVariedadInputSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(50).trim(),
});
export type CreateVariedadInput = z.infer<typeof CreateVariedadInputSchema>;

export const UpdateVariedadInputSchema = z.object({
  nombre: z.string().min(1).max(50).trim().optional(),
  activo: z.boolean().optional(),
});
export type UpdateVariedadInput = z.infer<typeof UpdateVariedadInputSchema>;

export const ListVariedadesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});
export type ListVariedadesQuery = z.infer<typeof ListVariedadesQuerySchema>;
