import { Module } from '@nestjs/common';
import { TiposEmbalajeController } from './tipos-embalaje.controller';
import { TiposEmbalajeService } from './tipos-embalaje.service';

@Module({
  controllers: [TiposEmbalajeController],
  providers: [TiposEmbalajeService],
})
export class TiposEmbalajeModule {}
