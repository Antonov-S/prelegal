# Stop Prelegal and remove its container.
$ErrorActionPreference = "Stop"
$composeFile = Join-Path $PSScriptRoot "../docker-compose.yml"
docker compose -f $composeFile down
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
