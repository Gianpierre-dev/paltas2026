import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type {
  CreateUsuarioInput,
  CreateUsuarioResponse,
  ResetPasswordResponse,
  UpdateUsuarioInput,
  UsuarioAdmin,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';
import { generateTemporaryPassword } from './password-generator';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<UsuarioAdmin[]> {
    const filas = await this.prisma.usuario.findMany({
      orderBy: [{ activo: 'desc' }, { rol: 'asc' }, { apellido: 'asc' }],
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        mustChangePassword: true,
        ultimoLogin: true,
        createdAt: true,
      },
    });
    return filas.map((u) => ({
      ...u,
      ultimoLogin: u.ultimoLogin?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async getById(id: string): Promise<UsuarioAdmin> {
    const u = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        mustChangePassword: true,
        ultimoLogin: true,
        createdAt: true,
      },
    });
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return {
      ...u,
      ultimoLogin: u.ultimoLogin?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    };
  }

  /**
   * Crea usuario con password temporal autogenerada. Setea mustChangePassword=true.
   * Devuelve la password en PLAINTEXT — el controller la pasa al admin
   * UNA sola vez (show-once). No se vuelve a poder consultar.
   */
  async create(input: CreateUsuarioInput): Promise<CreateUsuarioResponse> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    try {
      const u = await this.prisma.usuario.create({
        data: {
          email: input.email,
          nombre: input.nombre,
          apellido: input.apellido,
          rol: input.rol,
          passwordHash,
          mustChangePassword: true,
        },
        select: { id: true, email: true, nombre: true, apellido: true, rol: true },
      });
      return { ...u, temporaryPassword };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(`Email ${input.email} ya está registrado`);
      }
      throw err;
    }
  }

  async update(id: string, input: UpdateUsuarioInput): Promise<UsuarioAdmin> {
    await this.assertExists(id);
    await this.prisma.usuario.update({
      where: { id },
      data: {
        ...(input.nombre !== undefined && { nombre: input.nombre }),
        ...(input.apellido !== undefined && { apellido: input.apellido }),
        ...(input.rol !== undefined && { rol: input.rol }),
        ...(input.activo !== undefined && { activo: input.activo }),
      },
    });
    return this.getById(id);
  }

  /**
   * Resetea la password del usuario. Genera una nueva temporal, la devuelve UNA
   * vez al admin (show-once), y deja al usuario con mustChangePassword=true para
   * que tenga que cambiarla al loguearse.
   */
  async resetPassword(id: string): Promise<ResetPasswordResponse> {
    await this.assertExists(id);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });
    return { id, temporaryPassword };
  }

  private async assertExists(id: string): Promise<void> {
    const u = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
  }
}
