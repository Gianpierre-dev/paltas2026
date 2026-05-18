import { z } from 'zod';

export const ResumenDiarioQuerySchema = z.object({
  fecha: z.coerce.date(),
  fundoId: z.string().uuid().optional(),
});
export type ResumenDiarioQuery = z.infer<typeof ResumenDiarioQuerySchema>;
