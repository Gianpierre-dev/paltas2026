# Despliegue a Railway (con CLI)

Esta guía documenta el flujo de despliegue de Paltas 2026 a Railway usando
**Railway CLI**. La app se compone de:

1. **`paltas2026-api`** — NestJS (`apps/api`)
2. **`paltas2026-web`** — Next.js (`apps/web`)
3. **PostgreSQL** — plugin oficial de Railway

> Cada servicio tiene su propio `railway.json` (en `apps/api/` y `apps/web/`)
> con los `buildCommand` y `startCommand` correctos para el monorepo pnpm.
> No hay que configurar nada en el dashboard, lo lee automático.

---

## 0. Requisitos previos

```powershell
npm i -g @railway/cli
railway --version    # debe ser >= 3.x
railway login        # abre el browser, autorizá la app
```

---

## 1. Crear el proyecto y vincularlo al repo

Desde la raíz del repo:

```powershell
cd C:\dev\gian\paltas2026
railway init
```

Te va a preguntar el nombre del proyecto. Ponele algo como `paltas2026`.

Después vinculá al repo de GitHub:
```powershell
railway link
```
Elegí el proyecto que recién creaste.

---

## 2. Crear los servicios

### 2.a Postgres (primero)

```powershell
railway add --database postgres
```

Esto crea el plugin de Postgres y deja la variable `${{Postgres.DATABASE_URL}}`
disponible para que la referencien los otros servicios.

### 2.b Servicio API

```powershell
railway add --service paltas2026-api
```

Conectá el servicio al repo:
- Dashboard → `paltas2026-api` → Settings → Source → Connect Repo → seleccionar
  `paltas2026` → branch `main` → Root Directory: `apps/api`.

> Railway va a detectar el `apps/api/railway.json` y usar sus comandos.

### 2.c Servicio Web

```powershell
railway add --service paltas2026-web
```

Mismo paso: conectar repo, branch `main`, Root Directory: `apps/web`.

---

## 3. Variables de entorno

Setealas desde la CLI (más rápido que dashboard). Ejecutá cada bloque
seleccionando el servicio correcto.

### 3.a Variables del servicio `paltas2026-api`

```powershell
railway service paltas2026-api

railway variables --set "DATABASE_URL=$\{\{Postgres.DATABASE_URL\}\}"
railway variables --set "JWT_SECRET=81c94add5bbd31ebff2e02fccc40ff616cc2381ce73d9b609e37ec9d49eafea5"
railway variables --set "JWT_EXPIRES_IN=15m"
railway variables --set "JWT_REFRESH_TTL_DAYS=7"
railway variables --set "NODE_ENV=production"
railway variables --set "CORS_ORIGIN=https://paltas2026-web.up.railway.app"
```

> El `JWT_SECRET` arriba fue generado para este deploy. Si lo querés
> regenerar:
> ```powershell
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

> `CORS_ORIGIN` tenés que ajustarlo al dominio real del frontend después
> del primer deploy (Railway genera dominios tipo
> `paltas2026-web-production-XXXX.up.railway.app`).

> **NO setees `PORT`** — Railway lo inyecta y el código ya lo respeta
> (`apps/api/src/main.ts` lee `config.get<number>('PORT', 4000)`).

### 3.b Variables del servicio `paltas2026-web`

```powershell
railway service paltas2026-web

railway variables --set "NEXT_PUBLIC_API_URL=https://paltas2026-api.up.railway.app/api"
railway variables --set "API_URL_INTERNAL=http://paltas2026-api.railway.internal:8080/api"
railway variables --set "NODE_ENV=production"
```

> Otra vez, ajustá los dominios después del primer deploy. El
> `API_URL_INTERNAL` usa la red privada de Railway para el tráfico SSR↔API
> (ahorra egress + reduce latencia).

---

## 4. Primer deploy

```powershell
railway up
```

Esto sube el código, Railway buildea ambos servicios en paralelo, aplica las
migraciones (`prisma migrate deploy` está en el `startCommand` del api), y los
levanta.

Si querés ver logs:
```powershell
railway logs --service paltas2026-api
railway logs --service paltas2026-web
```

---

## 5. Seed inicial (solo la primera vez)

La DB de Railway arranca vacía. Corré el seed para crear:
- Usuario admin (`admin@paltas.com` / `123456`)
- Inspector demo (`inspector@paltas.com` / `123456`)
- Reglas de calificación + matriz (configuración crítica)
- Catálogos base (variedades, fundos, clientes, destinos, embalajes, defectos)

```powershell
railway run --service paltas2026-api pnpm --filter @paltas2026/api prisma:seed
```

> **Cambiá la password del admin de inmediato** desde la app
> (`Dashboard → Cambiar password`) — `123456` es una credencial de dev.

### Opcional: importar histórico desde Excel

Si querés cargar las 6165 inspecciones del Excel histórico (`docs/Inspecciones
de proceso (33).xlsx`):

```powershell
railway run --service paltas2026-api pnpm --filter @paltas2026/api migrate:historic:apply
```

Tarda ~30 segundos. **Solo correlo una vez** — el script no es idempotente y
duplicaría inspecciones si lo ejecutás dos veces.

---

## 6. Generar dominios públicos

```powershell
railway domain --service paltas2026-api
railway domain --service paltas2026-web
```

Anotá los dominios que te devuelve. Después **actualizá las variables que
dependen del dominio real**:

```powershell
railway service paltas2026-api
railway variables --set "CORS_ORIGIN=https://<dominio-real-del-web>"

railway service paltas2026-web
railway variables --set "NEXT_PUBLIC_API_URL=https://<dominio-real-del-api>/api"
```

Y redesplegá los servicios afectados:
```powershell
railway redeploy --service paltas2026-api
railway redeploy --service paltas2026-web
```

---

## 7. Verificaciones post-deploy

1. **Login funciona**: `https://<web>/login` → `admin@paltas.com` / `123456`
2. **Cookies httpOnly seteadas**: DevTools → Application → Cookies,
   `paltas_access` y `paltas_refresh` deben tener `HttpOnly ✓` y `Secure ✓`.
3. **Refresh token rota**: esperá 16 min, dispará una acción → en Network
   ves `POST /api/auth/refresh` 200 → la cookie cambia.
4. **CORS**: el browser no debería pegarle al backend directo. Todas las
   llamadas pasan por `/api/proxy/*` mismo-origin. Si ves errores de CORS,
   `NEXT_PUBLIC_API_URL` está mal seteado.
5. **DB conectada**: probá cargar una inspección. Si rebota con error de
   DB, mirá `railway logs --service paltas2026-api`.

---

## 8. Comandos útiles para mantener

| Operación | Comando |
|---|---|
| Ver vars de un servicio | `railway variables --service paltas2026-api` |
| Conectarse al psql del Postgres | `railway connect postgres` |
| Correr un comando ad-hoc en producción | `railway run --service paltas2026-api <comando>` |
| Logs en vivo | `railway logs --service paltas2026-api --follow` |
| Forzar redeploy | `railway redeploy --service paltas2026-api` |

---

## 9. Rollback

- **Rollback de código**: Dashboard → Servicio → Deployments → seleccionar
  un deploy previo → **Redeploy**.
- **Rollback de migración Prisma**: no hay `migrate undo` nativo. Escribí
  una migración inversa nueva (otro `migration.sql` que deshaga los cambios).
  Por esto las migraciones tienen que ser retrocompatibles (agregar columnas
  nullable, nunca DROP en una sola pasada).

---

## 10. Costos

- **Postgres** (Hobby): $5/mes mínimo.
- **API + Web**: cada servicio cobra por RAM/CPU/horas. Hobby plan da $5/mes
  de crédito gratis al mes.
- **Egress**: cobrado por GB salido. Por eso `API_URL_INTERNAL` con
  `*.railway.internal` importa — el tráfico SSR↔API por red privada no cuenta
  como egress.
