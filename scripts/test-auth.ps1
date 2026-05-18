Write-Host "=== 1. /api/health (publico) ===" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri http://localhost:3001/api/health
$health | ConvertTo-Json

Write-Host ""
Write-Host "=== 2. /api/auth/me SIN token (debe dar 401) ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri http://localhost:3001/api/auth/me -ErrorAction Stop
} catch {
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__) -ForegroundColor Yellow
    Write-Host ("OK: bloqueo de auth funciona")
}

Write-Host ""
Write-Host "=== 3. /api/auth/login con credenciales malas (debe dar 401) ===" -ForegroundColor Cyan
try {
    $badBody = @{ email = 'admin@paltas2026.local'; password = 'wrong_password' } | ConvertTo-Json
    Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $badBody -ContentType 'application/json' -ErrorAction Stop
} catch {
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__) -ForegroundColor Yellow
    Write-Host ("OK: rechaza password invalido")
}

Write-Host ""
Write-Host "=== 4. /api/auth/login con body invalido (Zod debe rechazar) ===" -ForegroundColor Cyan
try {
    $invalidBody = @{ email = 'not-an-email'; password = '123' } | ConvertTo-Json
    Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $invalidBody -ContentType 'application/json' -ErrorAction Stop
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__) -ForegroundColor Yellow
    $err | ConvertTo-Json -Depth 10
}

Write-Host ""
Write-Host "=== 5. /api/auth/login correcto (admin) ===" -ForegroundColor Cyan
$loginBody = @{ email = 'admin@paltas2026.local'; password = 'Admin2026!' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $loginBody -ContentType 'application/json'
$loginResp | ConvertTo-Json
$token = $loginResp.accessToken

Write-Host ""
Write-Host "=== 6. /api/auth/me CON token ===" -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $token" }
$me = Invoke-RestMethod -Uri http://localhost:3001/api/auth/me -Headers $headers
$me | ConvertTo-Json
