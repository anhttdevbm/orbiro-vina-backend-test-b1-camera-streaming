# Collect FPS/latency/CPU/RAM samples for the report (run while system is up).
# Usage:
#   .\scripts\benchmark-metrics.ps1 -Channels 4 -DurationSec 30 -TargetFps 10

param(
    [int]$Channels = 4,
    [int]$DurationSec = 30,
    [int]$TargetFps = 10,
    [string]$ApiBase = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"
$outDir = Join-Path $PSScriptRoot ".." "docs" "benchmark-results"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $outDir "benchmark-$Channels-ch-$stamp.json"

Write-Host "Benchmark: $Channels cameras, ${DurationSec}s sampling..."

$sysSamples = @()
$chSamples = @{}

1..$Channels | ForEach-Object { $chSamples[$_] = @() }

$end = (Get-Date).AddSeconds($DurationSec)
while ((Get-Date) -lt $end) {
    try {
        $sys = Invoke-RestMethod "$ApiBase/api/metrics/system"
        $sysSamples += $sys
        1..$Channels | ForEach-Object {
            $id = $_
            try {
                $st = Invoke-RestMethod "$ApiBase/api/cameras/$id/status"
                $chSamples[$id] += $st
            } catch { }
        }
    } catch {
        Write-Warning "API unreachable: $_"
        break
    }
    Start-Sleep -Seconds 2
}

function Avg($arr, $prop) {
    $vals = $arr | ForEach-Object { $_.$prop } | Where-Object { $_ -ne $null }
    if (-not $vals -or $vals.Count -eq 0) { return 0 }
    return [math]::Round(($vals | Measure-Object -Average).Average, 2)
}

$channelSummary = @()
1..$Channels | ForEach-Object {
    $id = $_
    $arr = $chSamples[$id]
    if ($arr.Count -eq 0) { return }
    $channelSummary += [ordered]@{
        camera_id = $id
        target_fps = $TargetFps
        avg_measured_fps = Avg $arr "measured_fps"
        avg_latency_ms = Avg $arr "latency_ms"
        avg_uptime_sec = Avg $arr "uptime_sec"
        reconnect_count_last = ($arr[-1].reconnect_count)
        status_last = $arr[-1].status
    }
}

$result = [ordered]@{
    captured_at = (Get-Date).ToUniversalTime().ToString("o")
    channels = $Channels
    duration_sec = $DurationSec
    target_fps = $TargetFps
    system = [ordered]@{
        avg_cpu_percent = Avg $sysSamples "cpu_percent"
        avg_memory_percent = Avg $sysSamples "memory_percent"
        avg_memory_used_mb = Avg $sysSamples "memory_used_mb"
        gpu_available = ($sysSamples[-1].gpu_available)
        avg_gpu_percent = Avg $sysSamples "gpu_percent"
        active_streams_last = $sysSamples[-1].active_streams
    }
    channels_detail = $channelSummary
}

$result | ConvertTo-Json -Depth 6 | Set-Content $outFile -Encoding UTF8
Write-Host "Saved: $outFile"
Write-Host ""
Write-Host "=== Paste into docs/REPORT.md ==="
Write-Host ("CPU avg: {0}%  RAM avg: {1}%" -f $result.system.avg_cpu_percent, $result.system.avg_memory_percent)
$channelSummary | ForEach-Object {
    Write-Host ("Cam {0}: FPS {1}  latency {2}ms  status {3}" -f $_.camera_id, $_.avg_measured_fps, $_.avg_latency_ms, $_.status_last)
}
