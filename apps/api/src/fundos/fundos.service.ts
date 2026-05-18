import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateFundoInput,
  ListFundosQuery,
  UpdateFundoInput,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FundosService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListFundosQuery) {
    return this.prisma.fundo.findMany({
      where: query.includeInactive ? undefined : { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async getById(id: string) {
    const fundo = await this.prisma.fundo.findUnique({ where: { id } });
    if (!fundo) throw new NotFoundException(`Fundo ${id} no encontrado`);
    return fundo;
  }

  async create(input: CreateFundoInput) {
    try {
      return await this.prisma.fundo.create({ data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un fundo con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  async update(id: string, input: UpdateFundoInput) {
    await this.getById(id);
    try {
      return await this.prisma.fundo.update({ where: { id }, data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un fundo con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  async deactivate(id: string) {
    await this.getById(id);
    return this.prisma.fundo.update({ where: { id }, data: { activo: false } });
  }
}
