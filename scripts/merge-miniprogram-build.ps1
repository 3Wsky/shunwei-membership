# Merge uni-app dist into shunwei-miniprogram (preserve custom pages)
param(
    [string]$BuildDir = "F:\shunweiapp\CMB\CMB-backend\template\uni-app\dist\build\mp-weixin",
    [string]$TargetDir = "F:\shunweiapp\shunwei\shunwei-miniprogram"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $BuildDir)) {
    throw "Build output not found: $BuildDir — run build-miniprogram.ps1 first"
}

$preservePaths = @(
    "docs",
    "pages\activity\newcomer_lottery",
    "pages\membership\center"
)

$backupRoot = Join-Path $env:TEMP "shunwei-mp-backup-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

foreach ($rel in $preservePaths) {
    $src = Join-Path $TargetDir $rel
    if (Test-Path $src) {
        $dst = Join-Path $backupRoot $rel
        $parent = Split-Path $dst -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item $src $dst -Recurse -Force
        Write-Host "backup: $rel"
    }
}

Write-Host "copy build -> target"
Get-ChildItem $TargetDir | Where-Object { $_.Name -ne "docs" } | Remove-Item -Recurse -Force
Copy-Item (Join-Path $BuildDir "*") $TargetDir -Recurse -Force

foreach ($rel in $preservePaths) {
    $src = Join-Path $backupRoot $rel
    if (Test-Path $src) {
        $dst = Join-Path $TargetDir $rel
        # 关键：若目标已存在，必须先删除再复制。否则 Copy-Item -Recurse 会把
        # 源目录拷进已存在的目标目录内部，产生 docs/docs、center/center 这类递归嵌套冗余。
        if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
        $parent = Split-Path $dst -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item $src $dst -Recurse -Force
        Write-Host "restore: $rel"
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
    Write-Host "patched project.config.json packOptions.ignore"
}
$sitemapPath = Join-Path $TargetDir "sitemap.json"
if (-not (Test-Path $sitemapPath)) {
    @'
{
  "rules": [{ "action": "allow", "page": "*" }]
}
'@ | Set-Content $sitemapPath -Encoding UTF8
    Write-Host "created sitemap.json"
}

Write-Host "Done. Refresh WeChat DevTools."
