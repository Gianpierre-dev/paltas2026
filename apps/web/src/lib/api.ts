// Fetch wrapper hacia el backend NestJS.
//
// Modos:
//  - Server Components / Server Actions: pasá accessToken (de getServerToken). Llama directo
//    al backend con Bearer.
//  - Client Components: NO pasés token. La llamada va al proxy de Next /api/proxy/* en mismo
//    origin — las cookies httpOnly viajan automáticamente. Si recibe 401 y refresh funciona,
//    reintenta una vez de forma transparente.
import { API_URL } from './config';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /**
   * Solo Server Components/Actions. Si está presente, llama directo al backend con Bearer.
   * Si está ausente, asumimos Client Component y vamos por el proxy de Next.
   */
  accessToken?: string;
  cache?: RequestCache;
  query?: Record<string, string | number | boolean | undefined>;
}

const CLIENT_PROXY_PREFIX = '/api/proxy';

function buildUrl(basePath: string, path: string, query?: ApiOptions['query']): string {
  const url = new URL(`${basePath}${path.startsWith('/') ? path : `/${path}`}`, getOrigin());
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function getOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  // En server, las URLs absolutas se construyen contra el backend (no necesita origin para el cliente).
  // Para el proxy de Next sí, pero el proxy solo se invoca desde cliente.
  return 'http://localhost';
}

async function doFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken, cache = 'no-store', query } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const init: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
  };

  const isServerCall = Boolean(accessToken) || typeof window === 'undefined';
  const url = isServerCall
    ? buildUrl(API_URL, path, query)
    : buildUrl(CLIENT_PROXY_PREFIX, path, query);

  let res = await doFetch(url, init);

  // Interceptor de refresh transparente (solo en cliente).
  if (!isServerCall && res.status === 401 && !path.startsWith('/auth/')) {
    const refreshOk = await tryRefresh();
    if (refreshOk) {
      res = await doFetch(url, init);
    }
  }

  if (!res.ok) {
    const errorBody = await safeReadError(res);
    const message =
      (errorBody && typeof errorBody === 'object' && 'message' in errorBody
        ? String((errorBody as { message: unknown }).message)
        : null) ?? `Error ${res.status}`;
    throw new ApiError(res.status, errorBody, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function safeReadError(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    try {
      return await res.text();
    } catch {
      return null;
    }
  }
}

// Lock para evitar múltiples refresh en paralelo (varios 401 al mismo tiempo).
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const r = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' });
      return r.ok;
    } catch {
      return false;
    } finally {
      // Liberar el lock al terminar — el `finally` corre antes del `return` final del IIFE.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}
