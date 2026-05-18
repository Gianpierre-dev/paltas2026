$ErrorActionPreference = 'Stop'

$body = @{ email = 'inspector@paltas2026.local'; password = 'Inspector2026!' } | ConvertTo-Json
$token = (Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -Body $body -ContentType 'application/json').accessToken
$headers = @{ Authorization = "Bearer $token" }

$endpoints = @(
    @{ name='Variedades';      url='http://localhost:3001/api/variedades' }
    @{ name='Fundos';          url='http://localhost:3001/api/fundos' }
    @{ name='Clientes';        url='http://localhost:3001/api/clientes' }
    @{ name='Destinos';        url='http://localhost:3001/api/destinos' }
    @{ name='TiposEmbalaje';   url='http://localhost:3001/api/tipos-embalaje' }
    @{ name='TiposDefecto';    url='http://localhost:3001/api/tipos-defecto' }
)

foreach ($ep in $endpoints) {
    $data = Invoke-RestMethod -Uri $ep.url -Headers $headers
    Write-Host ("{0,-15} count: {1}" -f $ep.name, $data.Count)
}

Write-Host ""
Write-Host "=== Filtro por familia en TiposDefecto ==="
$cal = Invoke-RestMethod -Uri 'http://localhost:3001/api/tipos-defecto?familia=CALIDAD' -Headers $headers
$con = Invoke-RestMethod -Uri 'http://localhost:3001/api/tipos-defecto?familia=CONDICION' -Headers $headers
Write-Host ("CALIDAD:   " + $cal.Count + " defectos")
Write-Host ("CONDICION: " + $con.Count + " defectos")
