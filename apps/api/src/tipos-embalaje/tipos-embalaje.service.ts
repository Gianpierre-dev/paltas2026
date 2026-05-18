import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateTipoEmbalajeInput,
  ListTiposEmbalajeQuery,
  UpdateTipoEmbalajeInput,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TiposEmbalajeService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListTiposEmbalajeQuery) {
    return this.prisma.tipoEmbalaje.findMany({
      where: query.includeInactive ? undefined : { activo: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async getById(id: string) {
    const tipo = await this.prisma.tipoEmbalaje.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException(`TipoEmbalaje ${id} no encontrado`);
    return tipo;
  }

  async create(input: CreateTipoEmbalajeInput) {
    try {
      return await this.prisma.tipoEmbalaje.create({
        data: {
          codigo: input.codigo,
          descripcion: input.descripcion,
          marca: input.marca,
          pesoKg: new Prisma.Decimal(input.pesoKg.toFixed(2)),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un embalaje con código "${input.codigo}"`);
      }
      throw e;
    }
  }

  async update(id: string, input: UpdateTipoEmbalajeInput) {
    await this.getById(id);
    try {
      return await this.prisma.tipoEmbalaje.update({
        where: { id },
        data: {
          ...input,
          ...(input.pesoKg !== undefined && {
            pesoKg: new Prisma.Decimal(input.pesoKg.toFixed(2)),
          }),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un embalaje con código "${input.codigo}"`);
      }
      throw e;
    }
  }

  async deactivate(id: string) {
    await this.getById(id);
    return this.prisma.tipoEmbalaje.update({ where: { id }, data: { activo: false } });
  }
}
