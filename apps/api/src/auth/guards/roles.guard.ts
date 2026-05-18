import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Rol, JwtPayload } from '@paltas2026/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard global. Lee @Roles(...) y compara contra el rol del usuario en req.user.
 * Si el endpoint no tiene @Roles(), pasa cualquier autenticado.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (!requiredRoles.includes(user.rol)) {
      throw new ForbiddenException(
        `Requiere rol: ${requiredRoles.join(' o ')}. Tu rol: ${user.rol}`,
      );
    }
    return true;
  }
}
