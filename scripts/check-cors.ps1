Write-Host "=== Contenido del .env ==="
Get-Content "D:\Desktop\Paltas2026\apps\api\.env"

Write-Host ""
Write-Host "=== Preflight OPTIONS desde origin http://localhost:3000 ==="
$req = [System.Net.HttpWebRequest]::Create('http://localhost:3001/api/auth/login')
$req.Method = 'OPTIONS'
$req.Headers.Add('Origin', 'http://localhost:3000')
$req.Headers.Add('Access-Control-Request-Method', 'POST')
$req.Headers.Add('Access-Control-Request-Headers', 'content-type')
try {
    $resp = $req.GetResponse()
    Write-Host ("Status: " + [int]$resp.StatusCode)
    Write-Host "Headers de respuesta:"
    foreach ($k in $resp.Headers.AllKeys) {
        if ($k -like '*Access*' -or $k -like '*Allow*') {
            Write-Host ("  " + $k + ": " + $resp.Headers[$k])
        }
    }
    $resp.Close()
} catch {
    Write-Host ("ERROR: " + $_.Exception.Message)
    if ($_.Exception.Response) {
        $errResp = $_.Exception.Response
        Write-Host ("Status: " + [int]$errResp.StatusCode)
        foreach ($k in $errResp.Headers.AllKeys) {
            Write-Host ("  " + $k + ": " + $errResp.Headers[$k])
        }
    }
}

Write-Host ""
Write-Host "=== POST login con origin http://localhost:3000 ==="
$body = @{ email='admin@paltas2026.local'; password='Admin2026!' } | ConvertTo-Json
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' -Method POST -Body $body -ContentType 'application/json' -Headers @{ 'Origin'='http://localhost:3000' }
    Write-Host ("Status: " + $r.StatusCode)
    Write-Host "Headers de respuesta (filtrados):"
    foreach ($k in $r.Headers.Keys) {
        if ($k -like '*Access*' -or $k -like '*Allow*') {
            Write-Host ("  " + $k + ": " + ($r.Headers[$k] -join ','))
        }
    }
} catch {
    Write-Host ("ERROR: " + $_.Exception.Message)
}
