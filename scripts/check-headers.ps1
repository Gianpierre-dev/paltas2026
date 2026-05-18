$body = @{ email='admin@paltas2026.local'; password='Admin2026!' } | ConvertTo-Json
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' -Method POST -Body $body -ContentType 'application/json' -Headers @{ 'Origin'='http://localhost:3000' }
    Write-Host ("Status: " + $r.StatusCode)
    Write-Host "TODOS los headers de respuesta:"
    foreach ($k in $r.Headers.Keys) {
        Write-Host ("  " + $k + ": " + ($r.Headers[$k] -join ','))
    }
} catch {
    Write-Host ("ERROR: " + $_.Exception.Message)
}
