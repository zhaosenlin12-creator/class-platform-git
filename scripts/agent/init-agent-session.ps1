param(
    [Parameter(Mandatory = $true)]
    [string]$Lane,

    [string]$BranchName,

    [switch]$DryRun
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
$artifactRoot = Join-Path $repoRoot 'strategy\artifacts'
$sessionRoot = Join-Path $artifactRoot $safeBranch
$laneRoot = Join-Path $sessionRoot $Lane

$targets = @(
    $sessionRoot,
    $laneRoot,
    (Join-Path $laneRoot 'inputs'),
    (Join-Path $laneRoot 'outputs'),
    (Join-Path $laneRoot 'reviews'),
    (Join-Path $laneRoot 'qa')
)

Write-Host "Repo root: $repoRoot"
Write-Host "Branch: $BranchName"
Write-Host "Lane: $Lane"
Write-Host "Session path: $laneRoot"

if ($DryRun) {
    Write-Host 'Dry run only. No changes applied.'
    exit 0
}

foreach ($target in $targets) {
    New-Item -ItemType Directory -Path $target -Force | Out-Null
}

$statusFile = Join-Path $laneRoot 'status.md'
if (-not (Test-Path $statusFile)) {
    @"
# Lane Status

- Branch: $BranchName
- Lane: $Lane
- Status: planned
- Next gate: eng_review
"@ | Set-Content -Path $statusFile -Encoding utf8
}

$handoffFile = Join-Path $laneRoot 'handoff.md'
if (-not (Test-Path $handoffFile)) {
    Copy-Item -Path (Join-Path $repoRoot 'strategy\coordination\handoff-template.md') -Destination $handoffFile
}

$reportFile = Join-Path $laneRoot 'report.md'
if (-not (Test-Path $reportFile)) {
    Copy-Item -Path (Join-Path $repoRoot 'strategy\coordination\status-report-template.md') -Destination $reportFile
}

Write-Host 'Agent session initialized successfully.'
