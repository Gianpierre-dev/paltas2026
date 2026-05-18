import { Module } from '@nestjs/common';
import { TiposDefectoController } from './tipos-defecto.controller';
import { TiposDefectoService } from './tipos-defecto.service';

@Module({
  controllers: [TiposDefectoController],
  providers: [TiposDefectoService],
})
export class TiposDefectoModule {}
