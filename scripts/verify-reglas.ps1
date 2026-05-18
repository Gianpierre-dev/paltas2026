$env:PGPASSWORD = 'CAMBIAME_POR_UN_PASSWORD_FUERTE'
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U paltas -d paltas2026 -h localhost -c "
SELECT familia, nota, porcentaje_min, porcentaje_max
FROM reglas_calificacion
ORDER BY familia, nota;
"
