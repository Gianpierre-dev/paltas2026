import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ExportInspeccionesDiarioQuerySchema,
  ExportInspeccionesQuerySchema,
  Rol,
  type ExportInspeccionesDiarioQuery,
  type ExportInspeccionesQuery,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { InspeccionesExportService } from './inspecciones-export.service';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('inspecciones-export')
export class InspeccionesExportController {
  constructor(private readonly service: InspeccionesExportService) {}

  // Reporte de período: una hoja Detalle (1 fila por inspección) + agregados.
  @Roles(Rol.ADMIN)
  @Get()
  async export(
    @Query(new ZodValidationPipe(ExportInspeccionesQuerySchema))
    query: ExportInspeccionesQuery,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.service.generateWorkbook(query);
    this.sendXlsx(res, buffer, filename);
  }

  // Reporte diario ejecutivo: pivot por fundo (formato de la planilla cliente).
  @Roles(Rol.ADMIN)
  @Get('diario')
  async exportDiario(
    @Query(new ZodValidationPipe(ExportInspeccionesDiarioQuerySchema))
    query: ExportInspeccionesDiarioQuery,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.service.generateDailyReport(query);
    this.sendXlsx(res, buffer, filename);
  }

  private sendXlsx(res: Response, buffer: Buffer, filename: string): void {
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength.toString());
    res.end(buffer);
  }
}
