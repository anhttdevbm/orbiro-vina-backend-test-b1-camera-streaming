# Build and start full CamStream stack in Docker
param(
    [switch]$Build,
    [switch]$Logs
)

Set-Location (Join-Path $PSScriptRoot "..")

$args = @("compose", "up", "-d")
if ($Build) { $args += "--build" }

Write-Host "Starting CamStream (Docker)..."
docker @args

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "URLs:"
Write-Host "  Dashboard : http://localhost:8080"
Write-Host "  API docs  : http://localhost:8000/docs"
Write-Host "  RTSP      : rtsp://127.0.0.1:8554/cam1 .. cam4"
Write-Host ""
Write-Host "Wait ~30s for seed + stream connect, then open the dashboard."
Write-Host "Logs: docker compose logs -f backend frontend"

if ($Logs) {
    docker compose logs -f backend frontend
}
