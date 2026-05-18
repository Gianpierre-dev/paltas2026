# Despliegue a Railway

Esta guía documenta cómo desplegar Paltas 2026 a Railway. La app se compone de
**dos servicios** + **una base de datos**:

1. **`paltas2026-api`** — NestJS (`apps/api`)
2. **`paltas2026-web`** — Next.js (`apps/web`)
3. **PostgreSQL** — plugin oficial de Railway

> **Importante**: Railway inyecta `PORT` dinámicamente en cada deploy. **NO**
> hardcodear `PORT=4000` o `PORT=5000` en las variables del dashboard — la app
> ya lo respeta por código.

---

## 1. Crear los servicios

Desde el dashboard de Railway:

1. **New Project → Deploy from GitHub repo** → `paltas2026`.
2. Cuando pregunte qué desplegar, elegí `apps/api` (root directory). Va a ser
   el servicio **paltas2026-api**.
3. Después, **Add service → GitHub Repo** y elegí `apps/web` (root directory).
   Servicio **paltas2026-web**.
4. **Add service → Database → PostgreSQL**. Railway crea la DB y expone
   `DATABASE_URL` automáticamente.

### Build commands por servicio

Como es un monorepo pnpm, hay que setear correctamente el comando de build.
En cada servicio, **Settings → Build & Deploy**:

#### `paltas2026-api`
```
Root Directory:    apps/api
Build Command:     pnpm install --frozen-lockfile && pnpm prisma generate && pnpm build
Start Command:     pnpm prisma migrate deploy && pnpm start:prod
```

> El `migrate deploy` aplica las migraciones pendientes al arrancar.
> Si preferís aplicarlas manualmente (más seguro), sacalo del Start y corré
> `railway run -s paltas2026-api pnpm prisma:migrate:deploy` antes del deploy.

#### `paltas2026-web`
```
Root Directory:    apps/web
Build Command:     pnpm install --frozen-lockfile && pnpm build
Start Command:     pnpm start
```

> El `next start` respeta automáticamente la variable `PORT` que Railway inyecta.

---

## 2. Variables de entorno

Setealas en **Settings → Variables** de cada servicio. Copiá y pegá.

### Servicio `paltas2026-api`

| Variable | Valor | Nota |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Referencia al plugin de Postgres |
| `JWT_SECRET` | (generar) | `openssl rand -hex 32` — NUNCA reutilizar el de dev |
| `JWT_EXPIRES_IN` | `15m` | TTL del access token |
| `JWT_REFRESH_TTL_DAYS` | `7` | TTL del refresh token |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | `https://paltas2026-web.up.railway.app` | Reemplazá por el dominio real del frontend |

> **No setees `PORT`**. Railway lo inyecta y la app ya lo lee con
> `config.get<number>('PORT', 4000)`.

### Servicio `paltas2026-web`

| Variable | Valor | Nota |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://paltas2026-api.up.railway.app/api` | URL pública del API (la usa el browser) |
| `API_URL_INTERNAL` | `http://paltas2026-api.railway.internal:${{paltas2026-api.PORT}}/api` | URL privada — el SSR habla por la red interna del proyecto |
| `NODE_ENV` | `production` | |

> **¿Por qué `API_URL_INTERNAL`?**
> En Railway, los services dentro del mismo proyecto se ven entre sí por
> una red privada (`<service>.railway.internal`). Usarla para SSR ahorra
> egress (Railway lo factura) y elimina latencia. El browser sí usa la URL
> pública porque vive fuera de la red privada.

---

## 3. Orden de despliegue

1. **DB primero**: que Postgres esté arriba y con `DATABASE_URL` exportada.
2. **API segundo**: necesita la DB. Si pusiste `prisma migrate deploy` en
   Start Command, va a aplicar las migraciones al arrancar.
3. **Web tercero**: necesita el API arriba para que `/auth/me` durante SSR
   no rompa el layout.

> Si vas a primer deploy, hacé el seed:
> ```
> railway run -s paltas2026-api pnpm prisma:seed
> ```

---

## 4. Health checks

Railway tiene healthcheck por servicio. Configurá:

- **paltas2026-api**: `Path = /api/health`, `Timeout = 30s`. (Verificá que el
  módulo `/health` realmente toque la DB con `prisma.$queryRaw\`SELECT 1\`` —
  un healthcheck que sólo devuelve 200 estático no sirve.)
- **paltas2026-web**: `Path = /` o `/login`, `Timeout = 60s`. Next 16 tarda en
  warmup la primera request.

---

## 5. Verificaciones post-deploy

Después del primer deploy, probá manualmente:

1. **Login funciona**: `https://<web>/login` → entrar con credenciales.
2. **Cookies httpOnly seteadas**: en DevTools → Application → Cookies,
   `paltas_access` y `paltas_refresh` deben tener `HttpOnly ✓ Secure ✓`.
3. **Refresh token rota**: esperá 16 minutos y disparar una acción → en
   Network ves un `POST /api/auth/refresh` 200 → la cookie cambia.
4. **Logout revoca**: hacé logout → en DB la fila de `refresh_tokens`
   debe tener `revoked_at` no nulo.
5. **CORS**: el browser NO debería pegarle al backend directo. Todas las
   llamadas pasan por `/api/proxy/*` mismo-origin. Si ves errores de CORS
   en DevTools, probablemente está mal `NEXT_PUBLIC_API_URL`.

---

## 6. Rollback

Cada deploy en Railway queda como una "deployment" en el historial.

- **Rollback de código**: Settings → Deployments → seleccionar uno previo
  → **Redeploy**.
- **Rollback de migración**: Prisma no tiene `migrate undo`. Para revertir
  una migración hay que escribir una migración inversa (otra `migration.sql`
  que deshaga los cambios). Es por esto que las migraciones tienen que ser
  retrocompatibles (agregar columnas nullable, nunca DROP en una sola pasada).

---

## 7. Costos a observar

- **Postgres**: $5/mes mínimo en hobby plan. Tier free se duerme tras 5 días.
- **API + Web**: cada servicio cobra por RAM/CPU/horas-de-ejecución.
- **Egress**: cobrado por GB salido. Por eso `API_URL_INTERNAL` con la red
  privada importa — el tráfico SSR↔API no cuenta como egress.
