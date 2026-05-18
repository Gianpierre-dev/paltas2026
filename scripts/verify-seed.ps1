$env:PGPASSWORD = 'CAMBIAME_POR_UN_PASSWORD_FUERTE'
$psql = 'C:\Program Files\PostgreSQL\16\bin\psql.exe'
& $psql -U paltas -d paltas2026 -h localhost -c "
SELECT 'usuarios' AS tabla, COUNT(*) FROM usuarios
UNION ALL SELECT 'variedades', COUNT(*) FROM variedades
UNION ALL SELECT 'fundos', COUNT(*) FROM fundos
UNION ALL SELECT 'destinos', COUNT(*) FROM destinos
UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL SELECT 'tipos_embalaje', COUNT(*) FROM tipos_embalaje
UNION ALL SELECT 'tipos_defecto', COUNT(*) FROM tipos_defecto
UNION ALL SELECT 'reglas_calificacion', COUNT(*) FROM reglas_calificacion
UNION ALL SELECT 'matriz_calificacion_final', COUNT(*) FROM matriz_calificacion_final
ORDER BY tabla;
"
