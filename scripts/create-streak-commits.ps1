# Streak Commit Script - Fixed version
# Creates backdated commits for maintaining GitHub contribution streak

param(
    [string]$Date,
    [int]$Count,
    [string]$RepoPath = "d:\Projects\MAKANBOOK"
)

Set-Location $RepoPath

$logFile = Join-Path $RepoPath ".streak-log"

$messages = @(
    "chore(metrics): update contribution log entry",
    "docs(activity): update sync timestamp log",
    "chore(activity): record streak telemetry checkpoint",
    "chore(telemetry): record dev pulse status heartbeat",
    "chore(telemetry): sync activity metrics heartbeat",
    "chore(docs): refresh project health indicator",
    "chore(sync): update project activity beacon",
    "docs(metrics): log development session marker",
    "chore(activity): checkpoint development progress",
    "chore(telemetry): update project vitals snapshot",
    "docs(sync): record workspace activity pulse",
    "chore(metrics): refresh contribution tracker log",
    "chore(activity): sync development heartbeat signal",
    "docs(telemetry): update activity stream checkpoint",
    "chore(sync): log project contribution marker",
    "chore(docs): record development session heartbeat",
    "docs(activity): refresh project sync beacon",
    "chore(metrics): checkpoint activity telemetry data",
    "chore(telemetry): log workspace vitals update",
    "docs(sync): update development progress marker"
)

for ($i = 1; $i -le $Count; $i++) {
    $msg = $messages[($i - 1) % $messages.Count]
    $commitMsg = "$msg #$i ($Date)"
    
    # Write to log file to create a change
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Add-Content -Path $logFile -Value "[$timestamp] Commit $i of $Count for $Date - $msg"
    
    git add $logFile
    
    # Calculate varied time
    $hour = 9 + [math]::Floor($i / 20)
    $minute = $i % 60
    $second = ($i * 7) % 60
    if ($hour -gt 23) { $hour = 23 }
    
    $hourStr = $hour.ToString("00")
    $minuteStr = $minute.ToString("00")
    $secondStr = $second.ToString("00")
    $timeStr = "${hourStr}:${minuteStr}:${secondStr}"
    
    $dateTimeStr = "${Date}T${timeStr}+05:30"
    
    $env:GIT_AUTHOR_DATE = $dateTimeStr
    $env:GIT_COMMITTER_DATE = $dateTimeStr
    
    git commit -m $commitMsg --quiet
    
    if ($i % 25 -eq 0) {
        Write-Host "  Progress: $i / $Count commits done for $Date"
    }
}

# Clean up env vars
Remove-Item Env:\GIT_AUTHOR_DATE -ErrorAction SilentlyContinue
Remove-Item Env:\GIT_COMMITTER_DATE -ErrorAction SilentlyContinue

Write-Host "Completed $Count commits for $Date"
