param(
    [string]$Date = (Get-Date).ToString("yyyy-MM-dd"),
    [int]$Count = 222,
    [double]$StartHour = 9.0,
    [double]$EndHour = 21.0,
    [switch]$Push
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mjsScript = Join-Path $scriptDir "streak_commits.mjs"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🚀 Running GitHub Streak Committer" -ForegroundColor Green
Write-Host "  Date: $Date" -ForegroundColor Yellow
Write-Host "  Count: $Count" -ForegroundColor Yellow
Write-Host "  Time Range: ${StartHour}:00 to ${EndHour}:00 (+05:30)" -ForegroundColor Yellow
Write-Host "  Push: $Push" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

$pushArg = if ($Push) { "--push" } else { "" }
node "$mjsScript" --date "$Date" --count $Count --startHour $StartHour --endHour $EndHour $pushArg
