param(
    [string]$EnvFile = ".env.production",
    [switch]$SkipBuild,
    [switch]$SeedDemo
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $EnvFile)) {
    Copy-Item ".env.production.example" $EnvFile
    Write-Host "Created $EnvFile from .env.production.example." -ForegroundColor Yellow
    Write-Host "Set POSTGRES_PASSWORD and SECRET_KEY, then rerun this script." -ForegroundColor Yellow
    exit 1
}

$composeArgs = @("compose", "--env-file", $EnvFile, "-f", "docker-compose.prod.yml")

if (-not $SkipBuild) {
    Write-Host "Building images..." -ForegroundColor Cyan
    & docker @composeArgs build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Starting the production-like stack..." -ForegroundColor Cyan
& docker @composeArgs up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
& docker @composeArgs ps

if ($SeedDemo) {
    Write-Host ""
    Write-Host "Seeding demo organisation, users, partners and rate cards..." -ForegroundColor Cyan
    & docker @composeArgs exec -T backend python scripts/seed_demo.py
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ""
Write-Host "Deployment started. Check health with:" -ForegroundColor Green
Write-Host "  docker $($composeArgs -join ' ') ps"
Write-Host "  curl http://localhost:8080/api/v1/public/overview"
