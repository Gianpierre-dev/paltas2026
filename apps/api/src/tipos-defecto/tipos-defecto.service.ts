import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateTipoDefectoInput,
  ListTiposDefectoQuery,
  UpdateTipoDefectoInput,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TiposDefectoService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListTiposDefectoQuery) {
    return this.prisma.tipoDefecto.findMany({
      where: {
        ...(query.familia && { familia: query.familia }),
        ...(query.includeInactive ? {} : { activo: true }),
      },
      orderBy: [{ familia: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
    });
  }

  async getById(id: string) {
    const tipo = await this.prisma.tipoDefecto.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException(`TipoDefecto ${id} no encontrado`);
    return tipo;
  }

  async create(input: CreateTipoDefectoInput) {
    try {
      return await this.prisma.tipoDefecto.create({ data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un tipo de defecto con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  async update(id: string, input: UpdateTipoDefectoInput) {
    await this.getById(id);
    try {
      return await this.prisma.tipoDefecto.update({ where: { id }, data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un tipo de defecto con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  async deactivate(id: string) {
    await this.getById(id);
    return this.prisma.tipoDefecto.update({ where: { id }, data: { activo: false } });
  }
}
