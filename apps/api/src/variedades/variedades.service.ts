import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateVariedadInput,
  ListVariedadesQuery,
  UpdateVariedadInput,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VariedadesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListVariedadesQuery) {
    return this.prisma.variedad.findMany({
      where: query.includeInactive ? undefined : { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async getById(id: string) {
    const variedad = await this.prisma.variedad.findUnique({ where: { id } });
    if (!variedad) {
      throw new NotFoundException(`Variedad ${id} no encontrada`);
    }
    return variedad;
  }

  async create(input: CreateVariedadInput) {
    try {
      return await this.prisma.variedad.create({ data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe una variedad con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  async update(id: string, input: UpdateVariedadInput) {
    await this.getById(id); // valida que existe — lanza 404 si no

    try {
      return await this.prisma.variedad.update({
        where: { id },
        data: input,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe una variedad con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  /**
   * Soft delete: marca activo = false. NO borra físicamente para preservar
   * referencias desde inspecciones históricas.
   */
  async deactivate(id: string) {
    await this.getById(id);
    return this.prisma.variedad.update({
      where: { id },
      data: { activo: false },
    });
  }
}
