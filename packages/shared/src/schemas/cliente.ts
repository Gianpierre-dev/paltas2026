import { z } from 'zod';

export const ClienteSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1).max(100),
  activo: z.boolean(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type Cliente = z.infer<typeof ClienteSchema>;

export const CreateClienteInputSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(100).trim(),
});
export type CreateClienteInput = z.infer<typeof CreateClienteInputSchema>;

export const UpdateClienteInputSchema = z.object({
  nombre: z.string().min(1).max(100).trim().optional(),
  activo: z.boolean().optional(),
});
export type UpdateClienteInput = z.infer<typeof UpdateClienteInputSchema>;

export const ListClientesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});
export type ListClientesQuery = z.infer<typeof ListClientesQuerySchema>;
