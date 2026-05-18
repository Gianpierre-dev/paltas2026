$ErrorActionPreference = 'Stop'

Write-Host "=== 1. GET / SIN cookie debe redirect a /login ==="
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3000/' -MaximumRedirection 0 -ErrorAction SilentlyContinue
} catch {
    $r = $_.Exception.Response
}
Write-Host ("StatusCode:  " + $r.StatusCode)
Write-Host ("Location:    " + $r.Headers.Location)

Write-Host ""
Write-Host "=== 2. GET /login SIN cookie debe 200 ==="
$r = Invoke-WebRequest -Uri 'http://localhost:3000/login' -ErrorAction Stop
Write-Host ("StatusCode:  " + $r.StatusCode)
$ok = $r.Content -match 'Paltas 2026' -and $r.Content -match 'Ingresar'
Write-Host ("Tiene marca y boton: " + $ok)

Write-Host ""
Write-Host "=== 3. GET /dashboard SIN cookie debe redirect a /login ==="
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3000/dashboard' -MaximumRedirection 0 -ErrorAction SilentlyContinue
} catch {
    $r = $_.Exception.Response
}
Write-Host ("StatusCode:  " + $r.StatusCode)
Write-Host ("Location:    " + $r.Headers.Location)

Write-Host ""
Write-Host "=== 4. GET /dashboard CON cookie valida ==="
# Login via API para obtener token
$body = @{ email = 'admin@paltas2026.local'; password = 'Admin2026!' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType 'application/json'
$sessionJson = $loginResp | ConvertTo-Json -Compress
$cookieValue = [System.Web.HttpUtility]::UrlEncode($sessionJson)
$session = New-Object System.Net.CookieContainer
$cookie = New-Object System.Net.Cookie('paltas_session', $cookieValue, '/', 'localhost')
$session.Add($cookie)

$req = [System.Net.HttpWebRequest]::Create('http://localhost:3000/dashboard')
$req.CookieContainer = $session
$req.AllowAutoRedirect = $false
$resp = $req.GetResponse()
Write-Host ("StatusCode: " + [int]$resp.StatusCode)
$reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
$html = $reader.ReadToEnd()
$reader.Close()
$resp.Close()
$tieneAdmin = $html -match 'Admin' -and $html -match 'Hola'
Write-Host ("HTML tiene saludo y rol admin: " + $tieneAdmin)

Write-Host ""
Write-Host "=== 5. GET /inspecciones CON cookie ==="
$req = [System.Net.HttpWebRequest]::Create('http://localhost:3000/inspecciones')
$req.CookieContainer = $session
$req.AllowAutoRedirect = $false
$resp = $req.GetResponse()
Write-Host ("StatusCode: " + [int]$resp.StatusCode)
$reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
$html = $reader.ReadToEnd()
$reader.Close()
$resp.Close()
$tieneItems = $html -match 'Inspecciones' -and ($html -match 'BUENO' -or $html -match 'totales')
Write-Host ("HTML tiene listado: " + $tieneItems)
