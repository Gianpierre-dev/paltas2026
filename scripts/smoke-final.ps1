$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web

$body = @{ email='admin@paltas2026.local'; password='Admin2026!' } | ConvertTo-Json
$admin = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType 'application/json'
$adminAuth = @{ Authorization = "Bearer $($admin.accessToken)" }
$sessionJson = $admin | ConvertTo-Json -Compress
$cookieValue = [System.Web.HttpUtility]::UrlEncode($sessionJson)
$adminCookies = New-Object System.Net.CookieContainer
$adminCookies.Add((New-Object System.Net.Cookie('paltas_session', $cookieValue, '/', 'localhost')))

$bodyI = @{ email='inspector@paltas2026.local'; password='Inspector2026!' } | ConvertTo-Json
$insp = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $bodyI -ContentType 'application/json'
$inspAuth = @{ Authorization = "Bearer $($insp.accessToken)" }

function GetPage($url, $cookies) {
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.CookieContainer = $cookies
    $req.AllowAutoRedirect = $false
    $resp = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $html = $reader.ReadToEnd()
    $reader.Close()
    $s = [int]$resp.StatusCode
    $resp.Close()
    return @{ status=$s; html=$html }
}

Write-Host "==== A. CRUD admin de catalogos ===="
$pages = @(
    'http://localhost:3000/admin/catalogos',
    'http://localhost:3000/admin/catalogos/variedades',
    'http://localhost:3000/admin/catalogos/fundos',
    'http://localhost:3000/admin/catalogos/clientes',
    'http://localhost:3000/admin/catalogos/destinos',
    'http://localhost:3000/admin/catalogos/tipos-embalaje',
    'http://localhost:3000/admin/catalogos/tipos-defecto'
)
foreach ($p in $pages) {
    $r = GetPage $p $adminCookies
    $name = $p.Substring($p.LastIndexOf('/')+1); if (-not $name) { $name='index' }
    Write-Host ("  {0,-20} -> {1}" -f $name, $r.status)
}

Write-Host ""
Write-Host "==== B. Stats endpoint + Graficos ===="
$stats = Invoke-RestMethod -Uri 'http://localhost:3001/api/inspecciones-stats' -Headers $adminAuth
Write-Host ("  Total inspecciones:        " + $stats.totalInspecciones)
Write-Host ("  Resultados BUENO/ACEPT/RCH: " + $stats.porResultado.BUENO + "/" + $stats.porResultado.ACEPTABLE + "/" + $stats.porResultado.RECHAZO)
Write-Host ("  Fundos en stats:           " + $stats.porFundo.Count)
Write-Host ("  Defectos top:              " + $stats.defectosTop.Count)

try {
    Invoke-RestMethod -Uri 'http://localhost:3001/api/inspecciones-stats' -Headers $inspAuth -ErrorAction Stop
} catch {
    Write-Host ("  Inspector -> " + $_.Exception.Response.StatusCode.value__ + " (esperado 403)")
}

$g = GetPage 'http://localhost:3000/admin/graficos' $adminCookies
Write-Host ("  Frontend /admin/graficos -> " + $g.status)

Write-Host ""
Write-Host "==== C. Script migracion (dry-run --limit 5) ===="
$out = & pnpm --filter "@paltas2026/api" exec tsx scripts/migrate-historic.ts --limit 5 2>&1 | Select-Object -Last 10
foreach ($l in $out) { Write-Host ("  " + $l) }

Write-Host ""
Write-Host "==== Resumen rutas backend totales ===="
$lines = Get-Content "C:\Users\USER\AppData\Local\Temp\claude\D--Desktop-Paltas2026\095098de-491e-451f-93c0-85991e112eb6\tasks\b283w1hyl.output" | Where-Object { $_ -match 'Mapped' }
Write-Host ("  Total rutas backend mapeadas: " + $lines.Count)
