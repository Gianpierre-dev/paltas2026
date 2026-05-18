-- ============================================================
-- Paltas2026 — Setup inicial de base de datos
-- ============================================================
-- INSTRUCCIONES:
--   1. Editá la línea CREATE USER y poné un password fuerte de verdad.
--      (anotalo, despues lo necesitamos para el .env)
--   2. Ejecutá desde PowerShell:
--        & 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U postgres -f scripts/setup-database.sql
--      Te va a pedir el password del superusuario postgres.
-- ============================================================

-- 1) Crear usuario dedicado para la app (NO usamos postgres directo en prod)
--    REEMPLAZA 'CAMBIAME_POR_UN_PASSWORD_FUERTE' por el password real.
CREATE USER paltas WITH PASSWORD 'CAMBIAME_POR_UN_PASSWORD_FUERTE';

-- 2) Crear la base de datos, owner = paltas
CREATE DATABASE paltas2026 OWNER paltas ENCODING 'UTF8';

-- 3) Permisos sobre el schema public (Postgres 15+ los restringe por default)
\connect paltas2026

GRANT ALL ON SCHEMA public TO paltas;
GRANT ALL PRIVILEGES ON DATABASE paltas2026 TO paltas;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO paltas;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO paltas;

-- 4) Verificación: tirá una query con el usuario nuevo
\echo ''
\echo '=== Setup completado ==='
\echo 'Base creada: paltas2026'
\echo 'Usuario:     paltas'
\echo ''
\echo 'Probá la conexión con:'
\echo '  psql -U paltas -d paltas2026 -h localhost'
