param(
    [string]$BranchName,

    [string[]]$Lanes = @('control-plane', 'phase2-domain', 'phase3-classroom', 'phase6-release-ops'),

    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$repoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
    throw 'Not inside a git repository.'
}

if (-not $BranchName) {
    $BranchName = (git branch --show-current).Trim()
}

if (-not $BranchName) {
    throw 'Unable to resolve current branch name.'
}

$safeBranch = $BranchName -replace '[\\/:\*\?"<>\| ]', '-'
$artifactRoot = Join-Path $repoRoot "strategy\artifacts\$safeBranch"

if (-not $OutputPath) {
    $OutputPath = Join-Path $artifactRoot 'control-plane\outputs\status-dashboard.md'
}

function Get-StatusMap {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $map = @{}
    if (-not (Test-Path $Path)) {
        return $map
    }

    Get-Content $Path | ForEach-Object {
        if ($_ -match '^- ([^:]+):\s*(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $map[$key] = $value
        }
    }

    return $map
}

$rows = foreach ($lane in $Lanes) {
    $statusFile = Join-Path $artifactRoot "$lane\status.md"
    $statusMap = Get-StatusMap -Path $statusFile

    [pscustomobject]@{
        Lane = $lane
        Status = if ($statusMap.ContainsKey('Status')) { $statusMap['Status'] } elseif (Test-Path $statusFile) { 'planned' } else { 'missing' }
        NextGate = if ($statusMap.ContainsKey('Next gate')) { $statusMap['Next gate'] } else { '-' }
        Focus = if ($statusMap.ContainsKey('Current focus')) { $statusMap['Current focus'] } elseif ($statusMap.ContainsKey('Scope')) { $statusMap['Scope'] } else { '-' }
        Updated = if (Test-Path $statusFile) { (Get-Item $statusFile).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss') } else { '-' }
    }
}

$lines = @(
    '# Upgrade Dashboard',
    '',
    "- Branch: $BranchName",
    "- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    '',
    '| Lane | Status | Next gate | Updated | Focus |',
    '| --- | --- | --- | --- | --- |'
)

foreach ($row in $rows) {
    $focus = ($row.Focus -replace '\|', '/')
    $lines += "| $($row.Lane) | $($row.Status) | $($row.NextGate) | $($row.Updated) | $focus |"
}

New-Item -ItemType Directory -Path (Split-Path -Parent $OutputPath) -Force | Out-Null
Set-Content -Path $OutputPath -Value $lines -Encoding utf8

Write-Host "Dashboard written to $OutputPath"
