import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@paltas2026/shared';

/**
 * Inyecta el payload del JWT autenticado en el handler.
 * Uso: someHandler(@CurrentUser() user: JwtPayload)
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayload;
  },
);
