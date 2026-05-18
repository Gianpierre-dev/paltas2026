// Configuración de cliente accesible desde Server + Client Components.
// API_URL es el backend NestJS. Usar variable de entorno NEXT_PUBLIC_* en prod.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const SESSION_COOKIE = 'paltas_session';
// 7 días — debe coincidir con JWT_EXPIRES_IN del backend
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
