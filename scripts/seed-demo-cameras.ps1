# Register 4 demo cameras pointing at local RTSP (run after: docker compose up -d)
$Base = "http://localhost:8000/api/cameras"
$Rtsps = @(
    # Docker backend must use hostname mediamtx (not 127.0.0.1)
    @{ name = "Demo Cam 1"; rtsp_url = "rtsp://mediamtx:8554/cam1"; target_fps = 10; grid_slot = 0 },
    @{ name = "Demo Cam 2"; rtsp_url = "rtsp://mediamtx:8554/cam2"; target_fps = 10; grid_slot = 1 },
    @{ name = "Demo Cam 3"; rtsp_url = "rtsp://mediamtx:8554/cam3"; target_fps = 10; grid_slot = 2 },
    @{ name = "Demo Cam 4"; rtsp_url = "rtsp://mediamtx:8554/cam4"; target_fps = 10; grid_slot = 3 }
)

foreach ($cam in $Rtsps) {
    $body = $cam | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $Base -Method Post -Body $body -ContentType "application/json"
        Write-Host "Created: $($cam.name)"
    } catch {
        Write-Warning "Skip or failed $($cam.name): $_"
    }
}

Write-Host "Open http://localhost:8080 (Docker) or http://localhost:5173 (npm dev) for the grid."
