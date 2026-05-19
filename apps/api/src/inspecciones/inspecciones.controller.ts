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
  CreateInspeccionInputSchema,
  ListInspeccionesQuerySchema,
  UpdateInspeccionInputSchema,
  type CreateInspeccionInput,
  type JwtPayload,
  type ListInspeccionesQuery,
  type UpdateInspeccionInput,
} from '@paltas2026/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { InspeccionesService } from './inspecciones.service';

@Controller('inspecciones')
export class InspeccionesController {
  constructor(private readonly service: InspeccionesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateInspeccionInputSchema)) dto: CreateInspeccionInput,
  ) {
    return this.service.create(user.sub, dto);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(ListInspeccionesQuerySchema)) query: ListInspeccionesQuery,
  ) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  // PATCH / DELETE / RESTORE: el service valida ownership.
  // ADMIN puede tocar cualquier inspección; INSPECTOR solo las propias.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateInspeccionInputSchema)) dto: UpdateInspeccionInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.restore(id, user);
  }
}
