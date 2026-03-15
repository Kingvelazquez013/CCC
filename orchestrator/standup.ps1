# CCC Daily Stand-Up — Windows PowerShell version
# Sends a task board digest to Telegram
# Runs via Task Scheduler: 7am, 12pm, 7pm
#
# Setup: see docs/orchestrator-setup.md

param(
    [string]$Period = "update"  # morning | midday | evening | update
)

# Load config — set these or use a .ccc-config.ps1 file
$ConfigFile = "$env:USERPROFILE\.ccc-config.ps1"
if (Test-Path $ConfigFile) { . $ConfigFile }

$BotToken = $env:TELEGRAM_BOT_TOKEN
$ChatId   = $env:TELEGRAM_CHAT_ID
$CccUrl   = if ($env:CCC_URL) { $env:CCC_URL } else { "https://ccc-ten-weld.vercel.app" }

if (-not $BotToken -or -not $ChatId) {
    Write-Error "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set"
    exit 1
}

# Fetch tasks
try {
    $Tasks = Invoke-RestMethod -Uri "$CccUrl/api/tasks" -Method GET
} catch {
    Write-Error "Failed to fetch tasks: $_"
    exit 1
}

function Get-StageCount($stage) {
    ($Tasks | Where-Object { $_.stage -eq $stage }).Count
}

function Get-StageSummary($stage) {
    $filtered = $Tasks | Where-Object { $_.stage -eq $stage }
    if ($filtered.Count -eq 0) { return "  _none_" }
    $lines = $filtered | Select-Object -First 5 | ForEach-Object {
        $pri   = $_.priority.Substring(0,1).ToUpper()
        $biz   = if ($_.business.Length -gt 12) { $_.business.Substring(0,12) } else { $_.business }
        $title = if ($_.title.Length -gt 40) { $_.title.Substring(0,40) } else { $_.title }
        $agent = if ($_.assigned_agent) { " → $($_.assigned_agent)" } else { "" }
        "  [$pri] $title ($biz)$agent"
    }
    $result = $lines -join "`n"
    if ($filtered.Count -gt 5) { $result += "`n  ... +$($filtered.Count - 5) more" }
    return $result
}

$Backlog = Get-StageCount "backlog"
$Working = Get-StageCount "working"
$Review  = Get-StageCount "review"
$Done    = Get-StageCount "done"

$Header = switch ($Period) {
    "morning" { "☀️ *Morning Stand-Up*" }
    "midday"  { "🌤 *Midday Check-In*" }
    "evening" { "🌙 *Evening Wrap-Up*" }
    default   { "📋 *CCC Status Update*" }
}

$Msg = @"
$Header

📊 *Board Summary*
• Backlog: $Backlog  |  Working: $Working  |  Review: $Review  |  Done: $Done

🔧 *In Progress*
$(Get-StageSummary "working")

📥 *Up Next (Backlog)*
$(Get-StageSummary "backlog")

🔍 *Needs Review*
$(Get-StageSummary "review")

🔗 [Open CCC]($CccUrl)
"@

$Body = @{
    chat_id                  = $ChatId
    text                     = $Msg
    parse_mode               = "Markdown"
    disable_web_page_preview = $true
}

try {
    Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/sendMessage" `
        -Method POST -ContentType "application/json" `
        -Body ($Body | ConvertTo-Json)
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Stand-up sent ($Period)"
} catch {
    Write-Error "Failed to send Telegram message: $_"
    exit 1
}
