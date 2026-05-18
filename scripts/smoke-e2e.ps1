$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web

# 1. Login via API
$body = @{ email = 'inspector@paltas2026.local'; password = 'Inspector2026!' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType 'application/json'
$token = $loginResp.accessToken

# Cookie para los GET del frontend (server components)
$sessionJson = $loginResp | ConvertTo-Json -Compress
$cookieValue = [System.Web.HttpUtility]::UrlEncode($sessionJson)
$cookies = New-Object System.Net.CookieContainer
$cookies.Add((New-Object System.Net.Cookie('paltas_session', $cookieValue, '/', 'localhost')))

function Get-Page($url) {
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.CookieContainer = $cookies
    $req.AllowAutoRedirect = $false
    $resp = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $html = $reader.ReadToEnd()
    $reader.Close()
    $status = [int]$resp.StatusCode
    $resp.Close()
    return @{ status = $status; html = $html }
}

Write-Host "=== 1. GET /inspecciones/nueva (server fetcha catalogos) ==="
$nueva = Get-Page 'http://localhost:3000/inspecciones/nueva'
Write-Host ("StatusCode: " + $nueva.status)
$hasForm = $nueva.html -match 'Encabezado' -and $nueva.html -match 'Embalaje' -and $nueva.html -match 'Defectos'
$hasFundos = $nueva.html -match 'Hefei' -and $nueva.html -match 'Mosqueta'
$hasDefectos = $nueva.html -match 'Lenticelas' -and $nueva.html -match 'Russet'
Write-Host ("3 secciones presentes:    " + $hasForm)
Write-Host ("Fundos seedeados visibles: " + $hasFundos)
Write-Host ("Tipos defecto visibles:    " + $hasDefectos)

Write-Host ""
Write-Host "=== 2. POST /api/inspecciones (simula submit del form) ==="
# Resolver IDs de los catalogos
$variedades = Invoke-RestMethod -Uri http://localhost:3001/api/variedades -Headers @{ Authorization = "Bearer $token" }
$hass = ($variedades | Where-Object { $_.nombre -eq 'Hass' }).id
$env:PGPASSWORD = 'CAMBIAME_POR_UN_PASSWORD_FUERTE'
$psql = 'C:\Program Files\PostgreSQL\16\bin\psql.exe'
$fundoMosqueta = (& $psql -U paltas -d paltas2026 -h localhost -t -A -c "SELECT id FROM fundos WHERE nombre='Mosqueta';").Trim()
$lenticelaId = (& $psql -U paltas -d paltas2026 -h localhost -t -A -c "SELECT id FROM tipos_defecto WHERE nombre='Lenticelas';").Trim()
$danoMecId = (& $psql -U paltas -d paltas2026 -h localhost -t -A -c "SELECT id FROM tipos_defecto WHERE nombre='Daño mecánico';").Trim()

$payload = @{
    tipo = 'EXPORTACION'
    fecha = '2026-05-17'
    numeroMuestra = 99
    fundoId = $fundoMosqueta
    variedadId = $hass
    categoria = 'CAT1'
    plu = $false
    calibre = 'C18'
    conteoMuestra = 50
    calidadEmbalaje = 'BUENO'
    rotulacion = 'BUENO'
    paletizaje = 'BUENO'
    observaciones = 'Inspeccion creada via smoke E2E'
    defectos = @(
        @{ tipoDefectoId = $lenticelaId; cantidadFrutos = 2 },
        @{ tipoDefectoId = $danoMecId; cantidadFrutos = 1 }
    )
} | ConvertTo-Json -Depth 10

$created = Invoke-RestMethod -Uri http://localhost:3001/api/inspecciones -Method POST -Body $payload -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" }
Write-Host ("ID creado:         " + $created.id)
Write-Host ("Sumatoria Calidad: " + $created.sumatoriaCalidad + "% (esperado 4% = 2/50*100)")
Write-Host ("Sumatoria Cond:    " + $created.sumatoriaCondicion + "% (esperado 2% = 1/50*100)")
Write-Host ("Resultado:         " + $created.resultadoFinal)

Write-Host ""
Write-Host "=== 3. GET /inspecciones/<id> (detalle) ==="
$detalle = Get-Page ("http://localhost:3000/inspecciones/" + $created.id)
Write-Host ("StatusCode: " + $detalle.status)
$hasDetalle = $detalle.html -match 'Mosqueta' -and $detalle.html -match 'Lenticelas' -and $detalle.html -match 'smoke E2E'
$hasNotas = $detalle.html -match 'Calidad' -and $detalle.html -match 'Condici'
Write-Host ("Detalle renderizado: " + $hasDetalle)
Write-Host ("Notas visibles:      " + $hasNotas)

Write-Host ""
Write-Host "=== 4. GET /inspecciones (listado debe incluir la nueva) ==="
$listado = Get-Page 'http://localhost:3000/inspecciones'
Write-Host ("StatusCode: " + $listado.status)
$conteoNueva = ([regex]::Matches($listado.html, 'Mosqueta')).Count
Write-Host ("Apariciones de 'Mosqueta' en el HTML: " + $conteoNueva)
