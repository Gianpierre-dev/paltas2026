import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateDestinoInput,
  ListDestinosQuery,
  UpdateDestinoInput,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DestinosService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListDestinosQuery) {
    return this.prisma.destino.findMany({
      where: query.includeInactive ? undefined : { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async getById(id: string) {
    const destino = await this.prisma.destino.findUnique({ where: { id } });
    if (!destino) throw new NotFoundException(`Destino ${id} no encontrado`);
    return destino;
  }

  async create(input: CreateDestinoInput) {
    try {
      return await this.prisma.destino.create({ data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un destino con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  async update(id: string, input: UpdateDestinoInput) {
    await this.getById(id);
    try {
      return await this.prisma.destino.update({ where: { id }, data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un destino con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  async deactivate(id: string) {
    await this.getById(id);
    return this.prisma.destino.update({ where: { id }, data: { activo: false } });
  }
}
