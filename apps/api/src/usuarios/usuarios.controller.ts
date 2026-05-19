import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateUsuarioInputSchema,
  Rol,
  UpdateUsuarioInputSchema,
  type CreateUsuarioInput,
  type UpdateUsuarioInput,
} from '@paltas2026/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@Roles(Rol.ADMIN)
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(CreateUsuarioInputSchema)) dto: CreateUsuarioInput,
  ) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateUsuarioInputSchema)) dto: UpdateUsuarioInput,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.resetPassword(id);
  }
}
