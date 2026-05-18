import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateFundoInputSchema,
  ListFundosQuerySchema,
  Rol,
  UpdateFundoInputSchema,
  type CreateFundoInput,
  type ListFundosQuery,
  type UpdateFundoInput,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { FundosService } from './fundos.service';

@Controller('fundos')
export class FundosController {
  constructor(private readonly service: FundosService) {}

  @Get()
  list(@Query(new ZodValidationPipe(ListFundosQuerySchema)) query: ListFundosQuery) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  create(@Body(new ZodValidationPipe(CreateFundoInputSchema)) dto: CreateFundoInput) {
    return this.service.create(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateFundoInputSchema)) dto: UpdateFundoInput,
  ) {
    return this.service.update(id, dto);
  }

  @Roles(Rol.ADMIN)
  @Delete(':id')
  @HttpCode(200)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deactivate(id);
  }
}
