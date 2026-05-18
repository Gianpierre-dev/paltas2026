try {
    $r = Invoke-RestMethod -Uri http://localhost:3001/api/health -TimeoutSec 5
    Write-Host ("OK: " + $r.status)
} catch {
    Write-Host ("BACKEND CAIDO: " + $_.Exception.Message)
}
Write-Host ""
Write-Host "=== Procesos node corriendo ==="
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, StartTime, WorkingSet64 | Format-Table -AutoSize
Write-Host ""
Write-Host "=== Puertos 3000/3001 ==="
netstat -ano | findstr ":3000 :3001 LISTENING"
