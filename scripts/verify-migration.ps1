$env:PGPASSWORD = 'CAMBIAME_POR_UN_PASSWORD_FUERTE'
$psql = 'C:\Program Files\PostgreSQL\16\bin\psql.exe'

Write-Host "=== Totales globales ==="
& $psql -U paltas -d paltas2026 -h localhost -c "
SELECT 'inspecciones' AS tabla, COUNT(*)::text AS total FROM inspecciones
UNION ALL SELECT 'inspeccion_defectos', COUNT(*)::text FROM inspeccion_defectos
UNION ALL SELECT 'usuarios', COUNT(*)::text FROM usuarios
UNION ALL SELECT 'tipos_embalaje', COUNT(*)::text FROM tipos_embalaje
ORDER BY tabla;
"

Write-Host ""
Write-Host "=== Distribucion por resultado ==="
& $psql -U paltas -d paltas2026 -h localhost -c "
SELECT resultado_final, COUNT(*) FROM inspecciones GROUP BY resultado_final ORDER BY resultado_final NULLS FIRST;
"

Write-Host ""
Write-Host "=== Inspecciones por fundo ==="
& $psql -U paltas -d paltas2026 -h localhost -c "
SELECT f.nombre AS fundo, COUNT(*) AS total
FROM inspecciones i JOIN fundos f ON f.id = i.fundo_id
GROUP BY f.nombre ORDER BY total DESC;
"

Write-Host ""
Write-Host "=== Rango de fechas ==="
& $psql -U paltas -d paltas2026 -h localhost -c "
SELECT MIN(fecha) AS desde, MAX(fecha) AS hasta, COUNT(DISTINCT fecha) AS dias_distintos FROM inspecciones;
"

Write-Host ""
Write-Host "=== Top 5 defectos cargados ==="
& $psql -U paltas -d paltas2026 -h localhost -c "
SELECT td.nombre, td.familia, COUNT(*) AS apariciones
FROM inspeccion_defectos id_def
JOIN tipos_defecto td ON td.id = id_def.tipo_defecto_id
GROUP BY td.nombre, td.familia
ORDER BY apariciones DESC
LIMIT 5;
"
