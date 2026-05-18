import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateClienteInput,
  ListClientesQuery,
  UpdateClienteInput,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListClientesQuery) {
    return this.prisma.cliente.findMany({
      where: query.includeInactive ? undefined : { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async getById(id: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return cliente;
  }

  async create(input: CreateClienteInput) {
    try {
      return await this.prisma.cliente.create({ data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un cliente con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  async update(id: string, input: UpdateClienteInput) {
    await this.getById(id);
    try {
      return await this.prisma.cliente.update({ where: { id }, data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un cliente con nombre "${input.nombre}"`);
      }
      throw e;
    }
  }

  async deactivate(id: string) {
    await this.getById(id);
    return this.prisma.cliente.update({ where: { id }, data: { activo: false } });
  }
}
