$ErrorActionPreference = 'Stop'

# Login
$body = @{ email = 'inspector@paltas2026.local'; password = 'Inspector2026!' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType 'application/json'
$token = $loginResp.accessToken
$headers = @{ Authorization = "Bearer $token" }

$variedades = Invoke-RestMethod -Uri http://localhost:3001/api/variedades -Headers $headers
$hass = $variedades | Where-Object { $_.nombre -eq 'Hass' } | Select-Object -First 1

$env:PGPASSWORD = 'CAMBIAME_POR_UN_PASSWORD_FUERTE'
$psql = 'C:\Program Files\PostgreSQL\16\bin\psql.exe'
$fundoHefei = (& $psql -U paltas -d paltas2026 -h localhost -t -A -c "SELECT id FROM fundos WHERE nombre='Hefei';").Trim()
$lenticelaId = (& $psql -U paltas -d paltas2026 -h localhost -t -A -c "SELECT id FROM tipos_defecto WHERE nombre='Lenticelas';").Trim()
$russetId = (& $psql -U paltas -d paltas2026 -h localhost -t -A -c "SELECT id FROM tipos_defecto WHERE nombre='Russet';").Trim()
$danoMecId = (& $psql -U paltas -d paltas2026 -h localhost -t -A -c "SELECT id FROM tipos_defecto WHERE nombre='Daño mecánico';").Trim()

# Reglas vigentes (PDF):
# CALIDAD:   1: [0,3)  2: [3,5)  3: [5,7)  4: [7,inf)
# CONDICION: 1: [0,1)  2: [1,2.1)  3: [2.1,4.1)  4: [4.1,inf)
# Matriz (notaCal, notaCond) -> resultado

Write-Host "=== CASO 1: 0 defectos (notas 1,1 -> BUENO) ==="
$payload = @{
    tipo = 'EXPORTACION'; fecha = '2026-05-17'; numeroMuestra = 1
    fundoId = $fundoHefei; variedadId = $hass.id
    categoria = 'CAT1'; plu = $false; calibre = 'C16'
    conteoMuestra = 100
    calidadEmbalaje = 'BUENO'; rotulacion = 'BUENO'; paletizaje = 'BUENO'
    defectos = @()
} | ConvertTo-Json -Depth 10
$r = Invoke-RestMethod -Uri http://localhost:3001/api/inspecciones -Method POST -Body $payload -ContentType 'application/json' -Headers $headers
Write-Host ("  sumCal={0}% sumCon={1}%  notas=({2},{3})  notaFinal={4}  resultado={5}" -f $r.sumatoriaCalidad, $r.sumatoriaCondicion, $r.notaCalidad, $r.notaCondicion, $r.notaFinal, $r.resultadoFinal)
Write-Host "  Esperado: notas=(1,1), resultado=BUENO"

Write-Host ""
Write-Host "=== CASO 2: 2% calidad, 0% condicion (notas 1,1 -> BUENO) ==="
$payload = @{
    tipo = 'EXPORTACION'; fecha = '2026-05-17'; numeroMuestra = 2
    fundoId = $fundoHefei; variedadId = $hass.id
    conteoMuestra = 100
    defectos = @(
        @{ tipoDefectoId = $lenticelaId; cantidadFrutos = 1 },
        @{ tipoDefectoId = $russetId; cantidadFrutos = 1 }
    )
} | ConvertTo-Json -Depth 10
$r = Invoke-RestMethod -Uri http://localhost:3001/api/inspecciones -Method POST -Body $payload -ContentType 'application/json' -Headers $headers
Write-Host ("  sumCal={0}% sumCon={1}%  notas=({2},{3})  notaFinal={4}  resultado={5}" -f $r.sumatoriaCalidad, $r.sumatoriaCondicion, $r.notaCalidad, $r.notaCondicion, $r.notaFinal, $r.resultadoFinal)
Write-Host "  Esperado: notas=(1,1), resultado=BUENO"

Write-Host ""
Write-Host "=== CASO 3: 5% calidad, 2% condicion (notas 3,2 -> BUENO segun matriz) ==="
$payload = @{
    tipo = 'EXPORTACION'; fecha = '2026-05-17'; numeroMuestra = 3
    fundoId = $fundoHefei; variedadId = $hass.id
    conteoMuestra = 100
    defectos = @(
        @{ tipoDefectoId = $lenticelaId; cantidadFrutos = 4 },
        @{ tipoDefectoId = $russetId; cantidadFrutos = 1 },
        @{ tipoDefectoId = $danoMecId; cantidadFrutos = 2 }
    )
} | ConvertTo-Json -Depth 10
$r = Invoke-RestMethod -Uri http://localhost:3001/api/inspecciones -Method POST -Body $payload -ContentType 'application/json' -Headers $headers
Write-Host ("  sumCal={0}% sumCon={1}%  notas=({2},{3})  notaFinal={4}  resultado={5}" -f $r.sumatoriaCalidad, $r.sumatoriaCondicion, $r.notaCalidad, $r.notaCondicion, $r.notaFinal, $r.resultadoFinal)
Write-Host "  Esperado: notas=(3,2), resultado=BUENO (segun matriz Excel)"

Write-Host ""
Write-Host "=== CASO 4: 1% calidad, 6% condicion (notas 1,4 -> RECHAZO) ==="
$payload = @{
    tipo = 'EXPORTACION'; fecha = '2026-05-17'; numeroMuestra = 4
    fundoId = $fundoHefei; variedadId = $hass.id
    conteoMuestra = 100
    defectos = @(
        @{ tipoDefectoId = $lenticelaId; cantidadFrutos = 1 },
        @{ tipoDefectoId = $danoMecId; cantidadFrutos = 6 }
    )
} | ConvertTo-Json -Depth 10
$r = Invoke-RestMethod -Uri http://localhost:3001/api/inspecciones -Method POST -Body $payload -ContentType 'application/json' -Headers $headers
Write-Host ("  sumCal={0}% sumCon={1}%  notas=({2},{3})  notaFinal={4}  resultado={5}" -f $r.sumatoriaCalidad, $r.sumatoriaCondicion, $r.notaCalidad, $r.notaCondicion, $r.notaFinal, $r.resultadoFinal)
Write-Host "  Esperado: notas=(1,4), resultado=RECHAZO"

Write-Host ""
Write-Host "=== CASO 5: 8% calidad, 5% condicion (notas 4,4 -> RECHAZO) ==="
$payload = @{
    tipo = 'EXPORTACION'; fecha = '2026-05-17'; numeroMuestra = 5
    fundoId = $fundoHefei; variedadId = $hass.id
    conteoMuestra = 100
    defectos = @(
        @{ tipoDefectoId = $lenticelaId; cantidadFrutos = 5 },
        @{ tipoDefectoId = $russetId; cantidadFrutos = 3 },
        @{ tipoDefectoId = $danoMecId; cantidadFrutos = 5 }
    )
} | ConvertTo-Json -Depth 10
$r = Invoke-RestMethod -Uri http://localhost:3001/api/inspecciones -Method POST -Body $payload -ContentType 'application/json' -Headers $headers
Write-Host ("  sumCal={0}% sumCon={1}%  notas=({2},{3})  notaFinal={4}  resultado={5}" -f $r.sumatoriaCalidad, $r.sumatoriaCondicion, $r.notaCalidad, $r.notaCondicion, $r.notaFinal, $r.resultadoFinal)
Write-Host "  Esperado: notas=(4,4), resultado=RECHAZO"

Write-Host ""
Write-Host "=== CASO 6: borde 3% calidad (notas 2,1 -> BUENO) ==="
$payload = @{
    tipo = 'EXPORTACION'; fecha = '2026-05-17'; numeroMuestra = 6
    fundoId = $fundoHefei; variedadId = $hass.id
    conteoMuestra = 100
    defectos = @(
        @{ tipoDefectoId = $lenticelaId; cantidadFrutos = 3 }
    )
} | ConvertTo-Json -Depth 10
$r = Invoke-RestMethod -Uri http://localhost:3001/api/inspecciones -Method POST -Body $payload -ContentType 'application/json' -Headers $headers
Write-Host ("  sumCal={0}% sumCon={1}%  notas=({2},{3})  notaFinal={4}  resultado={5}" -f $r.sumatoriaCalidad, $r.sumatoriaCondicion, $r.notaCalidad, $r.notaCondicion, $r.notaFinal, $r.resultadoFinal)
Write-Host "  Esperado: notas=(2,1), resultado=BUENO"
