import { z } from 'zod';

export const FundoSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1).max(50),
  activo: z.boolean(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type Fundo = z.infer<typeof FundoSchema>;

export const CreateFundoInputSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(50).trim(),
});
export type CreateFundoInput = z.infer<typeof CreateFundoInputSchema>;

export const UpdateFundoInputSchema = z.object({
  nombre: z.string().min(1).max(50).trim().optional(),
  activo: z.boolean().optional(),
});
export type UpdateFundoInput = z.infer<typeof UpdateFundoInputSchema>;

export const ListFundosQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});
export type ListFundosQuery = z.infer<typeof ListFundosQuerySchema>;
