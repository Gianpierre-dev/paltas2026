// Configuración compartida entre Server y Client Components.
// API_URL debe ser accesible desde el browser → necesita prefijo NEXT_PUBLIC_.
// API_URL_INTERNAL es opcional para SSR (si el backend está en una red interna).

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// Permite que en Railway/Docker el SSR use una URL interna distinta a la pública.
// Si no está seteada, cae a la pública.
export const API_URL_INTERNAL = process.env.API_URL_INTERNAL ?? API_URL;

// Cookies httpOnly. Path acotado en la de refresh.
export const ACCESS_COOKIE = 'paltas_access';
export const REFRESH_COOKIE = 'paltas_refresh';

// TTLs en segundos. Coordinados con el backend (JWT_EXPIRES_IN, JWT_REFRESH_TTL_DAYS).
export const ACCESS_MAX_AGE_SECONDS = 60 * 15; // 15 min
export const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días
