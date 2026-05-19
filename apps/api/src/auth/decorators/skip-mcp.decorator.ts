import { SetMetadata } from '@nestjs/common';

export const SKIP_MCP_KEY = 'skipMustChangePassword';

/**
 * Marca un endpoint como permitido aunque el usuario tenga mustChangePassword=true.
 * Usado en /auth/me, /auth/logout y /auth/change-password — son los únicos
 * lugares a los que el inspector puede ir mientras está obligado a cambiar
 * la password.
 */
export const SkipMustChangePassword = () => SetMetadata(SKIP_MCP_KEY, true);
