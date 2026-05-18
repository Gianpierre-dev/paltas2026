import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type {
  JwtPayload,
  LoginInput,
  LoginResponse,
  RefreshResponse,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';

type IssueParams = { deviceInfo?: string };
type UsuarioBasico = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'ADMIN' | 'INSPECTOR';
};

@Injectable()
export class AuthService {
  private readonly refreshTtlDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.refreshTtlDays = Number(config.get<string>('JWT_REFRESH_TTL_DAYS', '7'));
  }

  async login(input: LoginInput, params: IssueParams = {}): Promise<LoginResponse> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: input.email },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(input.password, usuario.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Fire and forget — no bloqueamos el login si falla
    this.prisma.usuario
      .update({ where: { id: usuario.id }, data: { ultimoLogin: new Date() } })
      .catch(() => {});

    const accessToken = await this.issueAccessToken(usuario);
    const refreshToken = await this.issueRefreshToken(usuario.id, params.deviceInfo);

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
      },
    };
  }

  /**
   * Rota el refresh token: revoca el viejo y emite uno nuevo en una transacción.
   * Detección de robo: si llega un refresh ya revocado, asumimos que fue clonado
   * y revocamos TODA la familia activa del usuario — fuerza re-login en todos lados.
   */
  async refresh(rawRefreshToken: string, params: IssueParams = {}): Promise<RefreshResponse> {
    const tokenHash = sha256(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            nombre: true,
            apellido: true,
            rol: true,
            activo: true,
          },
        },
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (stored.revokedAt !== null) {
      // Reuso de un token ya revocado = bandera roja. Limpiamos la sesión del usuario.
      await this.prisma.refreshToken.updateMany({
        where: { usuarioId: stored.usuarioId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token revocado. Por seguridad, iniciá sesión de nuevo.',
      );
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    if (!stored.usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const accessToken = await this.issueAccessToken(stored.usuario);

    // Generamos el nuevo token plain ANTES de la transacción.
    // El hash y el row se crean adentro para mantener atomicidad con la revocación.
    const newPlain = generateRefreshTokenPlain();
    const newHash = sha256(newPlain);
    const expiresAt = this.computeRefreshExpiry();

    await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.refreshToken.create({
        data: {
          tokenHash: newHash,
          usuarioId: stored.usuarioId,
          expiresAt,
          deviceInfo: params.deviceInfo ?? stored.deviceInfo,
        },
      });
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), rotatedToId: inserted.id },
      });
    });

    return {
      accessToken,
      refreshToken: newPlain,
      usuario: pickUsuarioPublico(stored.usuario),
    };
  }

  /**
   * Revoca el refresh token presentado. Idempotente — si ya estaba revocado, no hace ruido.
   * No lanza UnauthorizedException si el token no existe: un logout no debería filtrar info.
   */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = sha256(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Datos públicos del usuario actual. Consulta DB para devolver estado fresco
   * (por ejemplo: si el rol cambió desde que se emitió el JWT, lo refleja).
   */
  async me(usuarioId: string): Promise<UsuarioBasico> {
    const u = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, email: true, nombre: true, apellido: true, rol: true, activo: true },
    });
    if (!u || !u.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }
    return pickUsuarioPublico(u);
  }

  private async issueAccessToken(usuario: { id: string; email: string; rol: UsuarioBasico['rol'] }): Promise<string> {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
    return this.jwt.signAsync(payload);
  }

  private async issueRefreshToken(usuarioId: string, deviceInfo?: string): Promise<string> {
    const plain = generateRefreshTokenPlain();
    const tokenHash = sha256(plain);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        usuarioId,
        expiresAt: this.computeRefreshExpiry(),
        deviceInfo,
      },
    });
    return plain;
  }

  private computeRefreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
  }
}

function generateRefreshTokenPlain(): string {
  return crypto.randomBytes(32).toString('hex');
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function pickUsuarioPublico(u: UsuarioBasico): UsuarioBasico {
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    apellido: u.apellido,
    rol: u.rol,
  };
}
