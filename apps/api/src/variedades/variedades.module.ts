import { Module } from '@nestjs/common';
import { VariedadesController } from './variedades.controller';
import { VariedadesService } from './variedades.service';

@Module({
  controllers: [VariedadesController],
  providers: [VariedadesService],
})
export class VariedadesModule {}
