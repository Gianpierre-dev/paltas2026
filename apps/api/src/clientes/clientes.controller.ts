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
  CreateClienteInputSchema,
  ListClientesQuerySchema,
  Rol,
  UpdateClienteInputSchema,
  type CreateClienteInput,
  type ListClientesQuery,
  type UpdateClienteInput,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ClientesService } from './clientes.service';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(ListClientesQuerySchema)) query: ListClientesQuery) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  create(@Body(new ZodValidationPipe(CreateClienteInputSchema)) dto: CreateClienteInput) {
    return this.service.create(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateClienteInputSchema)) dto: UpdateClienteInput,
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
