# Build and start Prelegal in Docker. The development database is recreated on every start.
$ErrorActionPreference = "Stop"
$composeFile = Join-Path $PSScriptRoot "../docker-compose.yml"
docker compose -f $composeFile up --build --force-recreate -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Output "Prelegal is running at http://localhost:8000"
