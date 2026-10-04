param(
    [Parameter(Mandatory = $true)]
    [string]$Lane,

    [string]$Branch,

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$repoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
    throw 'Not inside a git repository.'
}

$repoDir = Split-Path -Parent $repoRoot
$repoName = Split-Path -Leaf $repoRoot
$worktreeRoot = Join-Path $repoDir ($repoName + '-worktrees')

if (-not $Branch) {
    $Branch = "upgrade/$Lane"
}

$targetPath = Join-Path $worktreeRoot $Lane

Write-Host "Repo root: $repoRoot"
Write-Host "Lane: $Lane"
Write-Host "Branch: $Branch"
Write-Host "Target worktree: $targetPath"

if ($DryRun) {
    Write-Host 'Dry run only. No changes applied.'
    exit 0
}

if (Test-Path $targetPath) {
    throw "Target worktree already exists: $targetPath"
}

New-Item -ItemType Directory -Path $worktreeRoot -Force | Out-Null

git show-ref --verify --quiet "refs/heads/$Branch"
if ($LASTEXITCODE -eq 0) {
    git worktree add $targetPath $Branch
} else {
    git worktree add -b $Branch $targetPath HEAD
}

Write-Host 'Worktree created successfully.'
