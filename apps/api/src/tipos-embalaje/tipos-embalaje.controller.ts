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
  CreateTipoEmbalajeInputSchema,
  ListTiposEmbalajeQuerySchema,
  Rol,
  UpdateTipoEmbalajeInputSchema,
  type CreateTipoEmbalajeInput,
  type ListTiposEmbalajeQuery,
  type UpdateTipoEmbalajeInput,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TiposEmbalajeService } from './tipos-embalaje.service';

@Controller('tipos-embalaje')
export class TiposEmbalajeController {
  constructor(private readonly service: TiposEmbalajeService) {}

  @Get()
  list(@Query(new ZodValidationPipe(ListTiposEmbalajeQuerySchema)) query: ListTiposEmbalajeQuery) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  create(
    @Body(new ZodValidationPipe(CreateTipoEmbalajeInputSchema)) dto: CreateTipoEmbalajeInput,
  ) {
    return this.service.create(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateTipoEmbalajeInputSchema)) dto: UpdateTipoEmbalajeInput,
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
