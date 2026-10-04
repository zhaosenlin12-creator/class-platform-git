param(
    [string[]]$Lanes = @('control-plane', 'phase2-domain', 'phase3-classroom', 'phase6-release-ops'),

    [string]$BranchName,

    [switch]$CreateWorktrees,

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

$initScript = Join-Path $repoRoot 'scripts\agent\init-agent-session.ps1'
$worktreeScript = Join-Path $repoRoot 'scripts\agent\new-upgrade-worktree.ps1'

if (-not (Test-Path $initScript)) {
    throw "Missing helper script: $initScript"
}

if ($CreateWorktrees -and -not (Test-Path $worktreeScript)) {
    throw "Missing helper script: $worktreeScript"
}

$results = New-Object System.Collections.Generic.List[object]

Write-Host "Repo root: $repoRoot"
Write-Host "Branch: $BranchName"
Write-Host "Dry run: $DryRun"
Write-Host "Create worktrees: $CreateWorktrees"

foreach ($lane in $Lanes) {
    Write-Host ""
    Write-Host "=== Lane: $lane ==="

    $initParams = @{
        Lane = $lane
        BranchName = $BranchName
    }

    if ($DryRun) {
        $initParams.DryRun = $true
    }

    & $initScript @initParams

    $worktreeState = 'skipped'
    if ($CreateWorktrees -and $lane -ne 'control-plane') {
        $worktreeParams = @{
            Lane = $lane
        }

        if ($DryRun) {
            $worktreeParams.DryRun = $true
        }

        & $worktreeScript @worktreeParams
        $worktreeState = if ($DryRun) { 'dry-run' } else { 'created' }
    }

    $results.Add([pscustomobject]@{
        Lane = $lane
        Artifacts = if ($DryRun) { 'dry-run' } else { 'ready' }
        Worktree = $worktreeState
    })
}

Write-Host ""
$results | Format-Table -AutoSize
Write-Host 'Upgrade session bootstrap completed.'
