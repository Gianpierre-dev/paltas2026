import { Controller, Get, Query } from '@nestjs/common';
import { Rol } from '@paltas2026/shared';
import { z } from 'zod';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { InspeccionesStatsService } from './inspecciones-stats.service';
import type { StatsQuery } from './stats.types';

// Schema local — no usar shared. Default: últimos 30 días.
const StatsQuerySchema = z
  .object({
    fechaDesde: z.coerce.date().optional(),
    fechaHasta: z.coerce.date().optional(),
  })
  .transform((value) => {
    const hoy = new Date();
    const hastaDefault = new Date(
      Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()),
    );
    const desdeDefault = new Date(hastaDefault);
    desdeDefault.setUTCDate(desdeDefault.getUTCDate() - 30);

    const fechaDesde = value.fechaDesde ?? desdeDefault;
    const fechaHasta = value.fechaHasta ?? hastaDefault;
    return { fechaDesde, fechaHasta };
  })
  .refine((value) => value.fechaDesde <= value.fechaHasta, {
    message: 'fechaDesde no puede ser mayor que fechaHasta',
  });

@Controller('inspecciones-stats')
export class InspeccionesStatsController {
  constructor(private readonly service: InspeccionesStatsService) {}

  @Roles(Rol.ADMIN)
  @Get()
  getStats(@Query(new ZodValidationPipe(StatsQuerySchema)) query: StatsQuery) {
    return this.service.getStats(query);
  }
}
