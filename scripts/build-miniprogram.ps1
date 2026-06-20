# Build uni-app mp-weixin and merge into shunwei-miniprogram
# Usage: F:\shunweiapp\scripts\build-miniprogram.ps1 [-SkipInstall] [-NodePath "..."]
param(
    [string]$UniAppRoot = "F:\shunweiapp\CMB\CMB-backend\template\uni-app",
    [string]$TargetDir = "F:\shunweiapp\shunwei\shunwei-miniprogram",
    [string]$NodePath = "F:\shunweiapp\tools\node-v18.20.8-win-x64\node.exe",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Invoke-Npm {
    param([string]$NpmCmd, [string[]]$NpmArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $NpmCmd @NpmArgs 2>&1 | ForEach-Object { Write-Host $_ }
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "npm failed with exit code $code" }
}

function Get-NodeExe {
    param([string]$Preferred)
    if ($Preferred -and (Test-Path $Preferred)) { return $Preferred }
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw "node.exe not found"
}

$nodeExe = Get-NodeExe -Preferred $NodePath
$nodeDir = Split-Path $nodeExe
# 确保 npm/vue-cli 子进程使用同一 Node，避免 PATH 中 v24 抢占
$env:PATH = "$nodeDir;" + ($env:PATH -split ';' | Where-Object { $_ -and $_ -ne $nodeDir }) -join ';'
$nodeVer = & $nodeExe -v
$major = [int]$nodeVer.TrimStart('v').Split('.')[0]
Write-Host "Using Node $nodeVer (PATH pinned)"
if ($major -ge 20) {
    Write-Warning "Node 20+ may fail uni-app build; use Node 16/18"
}

$npmCmd = Join-Path (Split-Path $nodeExe) "npm.cmd"
if (-not (Test-Path $npmCmd)) { $npmCmd = "npm" }

Push-Location $UniAppRoot
try {
    if (-not $SkipInstall) {
        Write-Host "=== npm install ==="
        $env:PUPPETEER_SKIP_DOWNLOAD = "true"
        Invoke-Npm -NpmCmd $npmCmd -NpmArgs @("install", "--ignore-scripts")
    }

    Write-Host "=== npm run build:mp-weixin ==="
    Invoke-Npm -NpmCmd $npmCmd -NpmArgs @("run", "build:mp-weixin")

    $buildDir = Join-Path $UniAppRoot "dist\build\mp-weixin"
    if (-not (Test-Path $buildDir)) {
        $buildDir = Join-Path $UniAppRoot "unpackage\dist\build\mp-weixin"
    }
    if (-not (Test-Path $buildDir)) {
        throw "build output not found"
    }

    Write-Host "=== backup shunwei custom files ==="
    $backupRoot = Join-Path $env:TEMP "shunwei-mp-backup-$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

    # newcomer_lottery 仅存在于构建产物，不在 uni-app 源码中，必须保留
    # membership/center 已在 uni-app 源码中，使用编译产物即可
    $preservePaths = @(
        "docs",
        "pages\activity\newcomer_lottery"
    )
    foreach ($rel in $preservePaths) {
        $src = Join-Path $TargetDir $rel
        if (Test-Path $src) {
            $dst = Join-Path $backupRoot $rel
            $parent = Split-Path $dst -Parent
            if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
            Copy-Item $src $dst -Recurse -Force
            Write-Host "  backup: $rel"
        }
    }

    Write-Host "=== copy build to $TargetDir ==="
    Get-ChildItem $TargetDir | Where-Object { $_.Name -ne "docs" } | Remove-Item -Recurse -Force
    Copy-Item (Join-Path $buildDir "*") $TargetDir -Recurse -Force

    Write-Host "=== restore shunwei custom files ==="
    foreach ($rel in $preservePaths) {
        $src = Join-Path $backupRoot $rel
        if (Test-Path $src) {
            $dst = Join-Path $TargetDir $rel
            # 关键：若目标已存在，必须先删除再复制。否则 Copy-Item -Recurse 会把
            # 源目录拷进已存在的目标目录内部，产生 docs/docs 这类递归嵌套冗余。
            if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
            $parent = Split-Path $dst -Parent
            if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
            Copy-Item $src $dst -Recurse -Force
            Write-Host "  restore: $rel"
        }
    }

    Remove-Item $backupRoot -Recurse -Force -ErrorAction SilentlyContinue

    # 合并后恢复 packOptions.ignore（排除 .git/docs，避免模拟器打包失败）
    $projCfg = Join-Path $TargetDir "project.config.json"
    if (Test-Path $projCfg) {
        $cfgJson = Get-Content $projCfg -Raw -Encoding UTF8 | ConvertFrom-Json
        $cfgJson.packOptions = @{
            ignore = @(
                @{ type = "folder"; value = ".git" },
                @{ type = "folder"; value = "docs" },
                @{ type = "suffix"; value = ".md" }
            )
        }
        $cfgJson | ConvertTo-Json -Depth 10 | Set-Content $projCfg -Encoding UTF8
        Write-Host "  patched project.config.json packOptions.ignore"
    }
    $sitemapPath = Join-Path $TargetDir "sitemap.json"
    if (-not (Test-Path $sitemapPath)) {
        @'
{
  "rules": [{ "action": "allow", "page": "*" }]
}
'@ | Set-Content $sitemapPath -Encoding UTF8
        Write-Host "  created sitemap.json"
    }

    Write-Host "Done. Open in WeChat DevTools: $TargetDir"
    Write-Host "Test path: /pages/membership/center/index"
}
finally {
    Pop-Location
}
