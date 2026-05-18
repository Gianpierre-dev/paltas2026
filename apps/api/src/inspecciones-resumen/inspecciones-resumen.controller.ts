import { Controller, Get, Query } from '@nestjs/common';
import {
  ResumenDiarioQuerySchema,
  Rol,
  type ResumenDiarioQuery,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { InspeccionesResumenService } from './inspecciones-resumen.service';

@Controller('inspecciones-resumen')
export class InspeccionesResumenController {
  constructor(private readonly service: InspeccionesResumenService) {}

  @Roles(Rol.ADMIN)
  @Get()
  getResumen(
    @Query(new ZodValidationPipe(ResumenDiarioQuerySchema)) query: ResumenDiarioQuery,
  ) {
    return this.service.getResumenDiario(query);
  }
}
