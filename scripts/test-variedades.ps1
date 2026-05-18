$ErrorActionPreference = 'Stop'

function Login($email, $password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType 'application/json'
    return $resp.accessToken
}

Write-Host "=== Login admin + inspector ==="
$adminToken = Login 'admin@paltas2026.local' 'Admin2026!'
$inspectorToken = Login 'inspector@paltas2026.local' 'Inspector2026!'
Write-Host "OK"

$adminHeaders = @{ Authorization = "Bearer $adminToken" }
$inspectorHeaders = @{ Authorization = "Bearer $inspectorToken" }

Write-Host ""
Write-Host "=== 1. GET /variedades (inspector autorizado) ==="
$vars = Invoke-RestMethod -Uri http://localhost:3001/api/variedades -Headers $inspectorHeaders
$vars | Format-Table id, nombre, activo

Write-Host ""
Write-Host "=== 2. POST /variedades como INSPECTOR (debe dar 403) ==="
try {
    $body = @{ nombre = 'TestBlocked' } | ConvertTo-Json
    Invoke-RestMethod -Uri http://localhost:3001/api/variedades -Method POST -Body $body -ContentType 'application/json' -Headers $inspectorHeaders -ErrorAction Stop
} catch {
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__)
    Write-Host "OK: bloqueado por roles"
}

Write-Host ""
Write-Host "=== 3. POST /variedades como ADMIN (crea Lamb Hass) ==="
$body = @{ nombre = 'Lamb Hass' } | ConvertTo-Json
$nueva = Invoke-RestMethod -Uri http://localhost:3001/api/variedades -Method POST -Body $body -ContentType 'application/json' -Headers $adminHeaders
$nueva | ConvertTo-Json

Write-Host ""
Write-Host "=== 4. POST /variedades con nombre duplicado (debe dar 409) ==="
try {
    Invoke-RestMethod -Uri http://localhost:3001/api/variedades -Method POST -Body $body -ContentType 'application/json' -Headers $adminHeaders -ErrorAction Stop
} catch {
    Write-Host ("Status: " + $_.Exception.Response.StatusCode.value__)
    Write-Host "OK: conflicto detectado"
}

Write-Host ""
Write-Host "=== 5. PATCH /variedades/:id como ADMIN ==="
$updateBody = @{ nombre = 'Lamb Hass Premium' } | ConvertTo-Json
$updated = Invoke-RestMethod -Uri "http://localhost:3001/api/variedades/$($nueva.id)" -Method PATCH -Body $updateBody -ContentType 'application/json' -Headers $adminHeaders
$updated | ConvertTo-Json

Write-Host ""
Write-Host "=== 6. DELETE soft de /variedades/:id como ADMIN ==="
$deleted = Invoke-RestMethod -Uri "http://localhost:3001/api/variedades/$($nueva.id)" -Method DELETE -Headers $adminHeaders
$deleted | ConvertTo-Json

Write-Host ""
Write-Host "=== 7. GET /variedades default (sin includeInactive, no debe aparecer la borrada) ==="
$vars = Invoke-RestMethod -Uri http://localhost:3001/api/variedades -Headers $inspectorHeaders
Write-Host ("Variedades visibles: " + $vars.Count)
$vars | Format-Table nombre, activo

Write-Host ""
Write-Host "=== 8. GET /variedades?includeInactive=true (debe aparecer la borrada) ==="
$varsAll = Invoke-RestMethod -Uri 'http://localhost:3001/api/variedades?includeInactive=true' -Headers $inspectorHeaders
Write-Host ("Variedades totales: " + $varsAll.Count)
$varsAll | Format-Table nombre, activo
