import { SetMetadata } from '@nestjs/common';
import { Rol } from '@paltas2026/shared';

export const ROLES_KEY = 'roles';

/**
 * Restringe acceso a roles específicos. Requiere RolesGuard activado globalmente.
 * Uso: @Roles(Rol.ADMIN) o @Roles(Rol.ADMIN, Rol.INSPECTOR)
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
