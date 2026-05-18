$env:PGPASSWORD = 'CAMBIAME_POR_UN_PASSWORD_FUERTE'
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U paltas -d paltas2026 -h localhost -c "\dt"
