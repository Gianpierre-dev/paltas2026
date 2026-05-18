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
  CreateTipoDefectoInputSchema,
  ListTiposDefectoQuerySchema,
  Rol,
  UpdateTipoDefectoInputSchema,
  type CreateTipoDefectoInput,
  type ListTiposDefectoQuery,
  type UpdateTipoDefectoInput,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TiposDefectoService } from './tipos-defecto.service';

@Controller('tipos-defecto')
export class TiposDefectoController {
  constructor(private readonly service: TiposDefectoService) {}

  @Get()
  list(@Query(new ZodValidationPipe(ListTiposDefectoQuerySchema)) query: ListTiposDefectoQuery) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  create(@Body(new ZodValidationPipe(CreateTipoDefectoInputSchema)) dto: CreateTipoDefectoInput) {
    return this.service.create(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateTipoDefectoInputSchema)) dto: UpdateTipoDefectoInput,
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
