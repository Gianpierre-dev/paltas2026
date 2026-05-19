import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InspeccionesExportController } from './inspecciones-export.controller';
import { InspeccionesExportService } from './inspecciones-export.service';

@Module({
  imports: [PrismaModule],
  controllers: [InspeccionesExportController],
  providers: [InspeccionesExportService],
})
export class InspeccionesExportModule {}
