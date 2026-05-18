import { Module } from '@nestjs/common';
import { InspeccionesResumenController } from './inspecciones-resumen.controller';
import { InspeccionesResumenService } from './inspecciones-resumen.service';

@Module({
  controllers: [InspeccionesResumenController],
  providers: [InspeccionesResumenService],
})
export class InspeccionesResumenModule {}
