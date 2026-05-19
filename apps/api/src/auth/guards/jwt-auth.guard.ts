import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { JwtPayload } from '@paltas2026/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_MCP_KEY } from '../decorators/skip-mcp.decorator';

/**
 * Guard global. Bypassa endpoints marcados con @Public().
 * El resto requiere Bearer token JWT válido.
 *
 * Adicional: si el JWT tiene mcp=true (mustChangePassword), rechaza
 * cualquier endpoint que no esté marcado con @SkipMustChangePassword().
 * Esto fuerza al usuario a pasar por /auth/change-password antes de
 * poder usar el resto del sistema.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;

    const skipMcp = this.reflector.getAllAndOverride<boolean>(SKIP_MCP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipMcp) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (request.user?.mcp) {
      throw new ForbiddenException(
        'Cambiá tu password antes de continuar (use /auth/change-password)',
      );
    }
    return true;
  }
}
