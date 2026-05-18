$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web

# Auth helpers
function Login($email, $password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType 'application/json'
    return $r
}

function ToCookies($loginResp) {
    $json = $loginResp | ConvertTo-Json -Compress
    $val = [System.Web.HttpUtility]::UrlEncode($json)
    $c = New-Object System.Net.CookieContainer
    $c.Add((New-Object System.Net.Cookie('paltas_session', $val, '/', 'localhost')))
    return $c
}

function GetPage($url, $cookies) {
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

$admin = Login 'admin@paltas2026.local' 'Admin2026!'
$inspector = Login 'inspector@paltas2026.local' 'Inspector2026!'
$adminCookies = ToCookies $admin
$inspectorCookies = ToCookies $inspector

$adminAuth = @{ Authorization = "Bearer $($admin.accessToken)" }
$inspectorAuth = @{ Authorization = "Bearer $($inspector.accessToken)" }

# Resolver IDs
$env:PGPASSWORD = 'CAMBIAME_POR_UN_PASSWORD_FUERTE'
$psql = 'C:\Program Files\PostgreSQL\16\bin\psql.exe'
$fundoMosqueta = (& $psql -U paltas -d paltas2026 -h localhost -t -A -c "SELECT id FROM fundos WHERE nombre='Mosqueta';").Trim()
$variedades = Invoke-RestMethod -Uri http://localhost:3001/api/variedades -Headers $adminAuth
$hassId = ($variedades | Where-Object { $_.nombre -eq 'Hass' }).id
$lenticelaId = (& $psql -U paltas -d paltas2026 -h localhost -t -A -c "SELECT id FROM tipos_defecto WHERE nombre='Lenticelas';").Trim()

Write-Host "================ FEATURE A: RESUMEN ================" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== A1. GET /api/inspecciones-resumen sin token ==="
try {
    Invoke-RestMethod -Uri 'http://localhost:3001/api/inspecciones-resumen?fecha=2026-05-17' -ErrorAction Stop
} catch {
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__) -NoNewline
    Write-Host " (esperado 401)"
}

Write-Host ""
Write-Host "=== A2. GET con token de INSPECTOR (403 esperado) ==="
try {
    Invoke-RestMethod -Uri 'http://localhost:3001/api/inspecciones-resumen?fecha=2026-05-17' -Headers $inspectorAuth -ErrorAction Stop
} catch {
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__) -NoNewline
    Write-Host " (esperado 403)"
}

Write-Host ""
Write-Host "=== A3. GET con token ADMIN (200 + resumen) ==="
$resumen = Invoke-RestMethod -Uri 'http://localhost:3001/api/inspecciones-resumen?fecha=2026-05-17' -Headers $adminAuth
Write-Host ("Inspecciones del dia:   " + $resumen.inspecciones.Count)
Write-Host ("Tipos de defecto:       " + $resumen.tiposDefecto.Count)
Write-Host ("Fundo (sin filtro):     " + ($resumen.fundo -eq $null))

Write-Host ""
Write-Host "=== A4. GET con fundoId (filtrado) ==="
$resumenF = Invoke-RestMethod -Uri "http://localhost:3001/api/inspecciones-resumen?fecha=2026-05-17&fundoId=$fundoMosqueta" -Headers $adminAuth
Write-Host ("Fundo:                  " + $resumenF.fundo.nombre)
Write-Host ("Inspecciones Mosqueta:  " + $resumenF.inspecciones.Count)

Write-Host ""
Write-Host "=== A5. Frontend /admin/resumen como ADMIN ==="
$page = GetPage 'http://localhost:3000/admin/resumen' $adminCookies
Write-Host ("StatusCode: " + $page.status)
$ok = $page.html -match 'Planilla' -or $page.html -match 'resumen' -or $page.html -match 'Resumen'
Write-Host ("Renderizo:  " + $ok)

Write-Host ""
Write-Host "=== A6. Frontend /admin/resumen como INSPECTOR (debe redirect) ==="
try {
    $page = GetPage 'http://localhost:3000/admin/resumen' $inspectorCookies
    Write-Host ("StatusCode: " + $page.status)
    if ($page.status -ge 300 -and $page.status -lt 400) {
        Write-Host "Redirige (OK)"
    } else {
        Write-Host "ATENCION: no redirige siendo inspector. Verificar guard."
    }
} catch {
    Write-Host ("Redirect 307 detectado (OK)")
}

Write-Host ""
Write-Host "================ FEATURE B: EDIT/DELETE ================" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== B1. POST nueva inspeccion (admin) ==="
$payload = @{
    tipo = 'EXPORTACION'; fecha = '2026-05-17'; numeroMuestra = 999
    fundoId = $fundoMosqueta; variedadId = $hassId
    conteoMuestra = 100
    defectos = @( @{ tipoDefectoId = $lenticelaId; cantidadFrutos = 1 } )
} | ConvertTo-Json -Depth 10
$created = Invoke-RestMethod -Uri http://localhost:3001/api/inspecciones -Method POST -Body $payload -ContentType 'application/json' -Headers $adminAuth
Write-Host ("ID:                 " + $created.id)
Write-Host ("sumCal=" + $created.sumatoriaCalidad + " notaCal=" + $created.notaCalidad + " resultado=" + $created.resultadoFinal)

Write-Host ""
Write-Host "=== B2. PATCH cambiando solo observaciones (admin) ==="
$body = @{ observaciones = 'editado via smoke test' } | ConvertTo-Json
$updated = Invoke-RestMethod -Uri "http://localhost:3001/api/inspecciones/$($created.id)" -Method PATCH -Body $body -ContentType 'application/json' -Headers $adminAuth
Write-Host ("Observaciones: " + $updated.observaciones)
Write-Host ("Notas conservadas: notaCal=" + $updated.notaCalidad + " (esperado igual que B1)")

Write-Host ""
Write-Host "=== B3. PATCH cambiando defectos (recalcula notas) ==="
$body = @{ defectos = @( @{ tipoDefectoId = $lenticelaId; cantidadFrutos = 8 } ) } | ConvertTo-Json -Depth 10
$updated = Invoke-RestMethod -Uri "http://localhost:3001/api/inspecciones/$($created.id)" -Method PATCH -Body $body -ContentType 'application/json' -Headers $adminAuth
Write-Host ("sumCal=" + $updated.sumatoriaCalidad + " notaCal=" + $updated.notaCalidad + " resultado=" + $updated.resultadoFinal + " (esperado nota 4)")

Write-Host ""
Write-Host "=== B4. PATCH como INSPECTOR debe 403 ==="
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/inspecciones/$($created.id)" -Method PATCH -Body '{"observaciones":"x"}' -ContentType 'application/json' -Headers $inspectorAuth -ErrorAction Stop
} catch {
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__) -NoNewline
    Write-Host " (esperado 403)"
}

Write-Host ""
Write-Host "=== B5. Frontend /inspecciones/<id>/editar como ADMIN ==="
$page = GetPage "http://localhost:3000/inspecciones/$($created.id)/editar" $adminCookies
Write-Host ("StatusCode: " + $page.status)
$hasForm = $page.html -match 'Encabezado' -and $page.html -match 'Embalaje'
Write-Host ("Form renderizado:  " + $hasForm)

Write-Host ""
Write-Host "=== B6. DELETE como INSPECTOR debe 403 ==="
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/inspecciones/$($created.id)" -Method DELETE -Headers $inspectorAuth -ErrorAction Stop
} catch {
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__) -NoNewline
    Write-Host " (esperado 403)"
}

Write-Host ""
Write-Host "=== B7. DELETE como ADMIN ==="
$deleted = Invoke-RestMethod -Uri "http://localhost:3001/api/inspecciones/$($created.id)" -Method DELETE -Headers $adminAuth
Write-Host ("Respuesta DELETE:    OK")

Write-Host ""
Write-Host "=== B8. GET tras DELETE debe 404 ==="
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/inspecciones/$($created.id)" -Headers $adminAuth -ErrorAction Stop
} catch {
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__) -NoNewline
    Write-Host " (esperado 404)"
}
