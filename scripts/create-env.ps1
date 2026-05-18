@"
DATABASE_URL="postgresql://paltas:CAMBIAME_POR_UN_PASSWORD_FUERTE@localhost:5432/paltas2026?schema=public"

JWT_SECRET="dev-only-secret-cambiar-en-prod-con-openssl-rand-hex-32"
JWT_EXPIRES_IN="7d"

PORT=3001
NODE_ENV="development"

CORS_ORIGIN="http://localhost:3000"
"@ | Out-File -FilePath "$PSScriptRoot\..\apps\api\.env" -Encoding utf8 -NoNewline
Write-Host "Created: $PSScriptRoot\..\apps\api\.env"
Get-Content "$PSScriptRoot\..\apps\api\.env"
