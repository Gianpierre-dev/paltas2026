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
  CreateVariedadInputSchema,
  ListVariedadesQuerySchema,
  Rol,
  UpdateVariedadInputSchema,
  type CreateVariedadInput,
  type ListVariedadesQuery,
  type UpdateVariedadInput,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { VariedadesService } from './variedades.service';

@Controller('variedades')
export class VariedadesController {
  constructor(private readonly service: VariedadesService) {}

  // Lectura: cualquier usuario autenticado (Admin o Inspector)
  @Get()
  list(
    @Query(new ZodValidationPipe(ListVariedadesQuerySchema)) query: ListVariedadesQuery,
  ) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  // Escritura: solo Admin
  @Roles(Rol.ADMIN)
  @Post()
  create(@Body(new ZodValidationPipe(CreateVariedadInputSchema)) dto: CreateVariedadInput) {
    return this.service.create(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateVariedadInputSchema)) dto: UpdateVariedadInput,
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
