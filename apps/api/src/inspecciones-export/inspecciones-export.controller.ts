import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ExportInspeccionesQuerySchema,
  Rol,
  type ExportInspeccionesQuery,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { InspeccionesExportService } from './inspecciones-export.service';

@Controller('inspecciones-export')
export class InspeccionesExportController {
  constructor(private readonly service: InspeccionesExportService) {}

  // Solo ADMIN. Devuelve el .xlsx como binario con Content-Disposition.
  @Roles(Rol.ADMIN)
  @Get()
  async export(
    @Query(new ZodValidationPipe(ExportInspeccionesQuerySchema))
    query: ExportInspeccionesQuery,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.service.generateWorkbook(query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength.toString());
    res.end(buffer);
  }
}
