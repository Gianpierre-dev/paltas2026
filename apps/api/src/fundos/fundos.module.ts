import { Module } from '@nestjs/common';
import { FundosController } from './fundos.controller';
import { FundosService } from './fundos.service';

@Module({
  controllers: [FundosController],
  providers: [FundosService],
})
export class FundosModule {}
