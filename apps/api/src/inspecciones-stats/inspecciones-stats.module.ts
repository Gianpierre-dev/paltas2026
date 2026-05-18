import { Module } from '@nestjs/common';
import { InspeccionesStatsController } from './inspecciones-stats.controller';
import { InspeccionesStatsService } from './inspecciones-stats.service';

@Module({
  controllers: [InspeccionesStatsController],
  providers: [InspeccionesStatsService],
})
export class InspeccionesStatsModule {}
