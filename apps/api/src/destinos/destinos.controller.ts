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
  CreateDestinoInputSchema,
  ListDestinosQuerySchema,
  Rol,
  UpdateDestinoInputSchema,
  type CreateDestinoInput,
  type ListDestinosQuery,
  type UpdateDestinoInput,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DestinosService } from './destinos.service';

@Controller('destinos')
export class DestinosController {
  constructor(private readonly service: DestinosService) {}

  @Get()
  list(@Query(new ZodValidationPipe(ListDestinosQuerySchema)) query: ListDestinosQuery) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  create(@Body(new ZodValidationPipe(CreateDestinoInputSchema)) dto: CreateDestinoInput) {
    return this.service.create(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateDestinoInputSchema)) dto: UpdateDestinoInput,
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
