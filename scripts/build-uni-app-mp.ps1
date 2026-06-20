# 编译 uni-app 微信小程序并同步到 shunwei-miniprogram
# 前置：Node.js 16.x 或 18.x（Node 20+ 与 vue-cli 4 / webpack 4 不兼容）
param(
    [string]$UniAppRoot = "F:\shunweiapp\CMB\CMB-backend\template\uni-app",
    [string]$OutputDir = "F:\shunweiapp\shunwei\shunwei-miniprogram",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$nodeMajor = [int](node -v).TrimStart('v').Split('.')[0]
if ($nodeMajor -ge 20) {
    Write-Warning "当前 Node v$nodeMajor 可能导致 uni-app 编译失败（需 Node 16-18）。可安装 nvm-windows 或使用 HBuilderX 发布。"
}

Push-Location $UniAppRoot
try {
    if (-not $SkipInstall) {
        Write-Host "=== npm install ===" -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    }

    Write-Host "=== build:mp-weixin ===" -ForegroundColor Cyan
    npm run build:mp-weixin
    if ($LASTEXITCODE -ne 0) { throw "build failed" }

    $buildDir = Join-Path $UniAppRoot "dist\build\mp-weixin"
    if (-not (Test-Path $buildDir)) {
        $buildDir = Join-Path $UniAppRoot "unpackage\dist\build\mp-weixin"
    }
    if (-not (Test-Path $buildDir)) {
        throw "Build output not found under dist/build/mp-weixin or unpackage/dist/build/mp-weixin"
    }

    Write-Host "=== sync to $OutputDir ===" -ForegroundColor Cyan
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }

    # 保留 docs 目录
    $docsBackup = $null
    if (Test-Path (Join-Path $OutputDir "docs")) {
        $docsBackup = Join-Path $env:TEMP "shunwei-miniprogram-docs-backup"
        if (Test-Path $docsBackup) { Remove-Item $docsBackup -Recurse -Force }
        Copy-Item (Join-Path $OutputDir "docs") $docsBackup -Recurse
    }

    Get-ChildItem $OutputDir -Exclude "docs" | Remove-Item -Recurse -Force
    Copy-Item (Join-Path $buildDir "*") $OutputDir -Recurse -Force

    if ($docsBackup -and (Test-Path $docsBackup)) {
        # 关键：先删已存在的 docs 再复制，否则 Copy-Item -Recurse 会嵌套成 docs/docs。
        $docsDst = Join-Path $OutputDir "docs"
        if (Test-Path $docsDst) { Remove-Item $docsDst -Recurse -Force }
        Copy-Item $docsBackup $docsDst -Recurse -Force
        Remove-Item $docsBackup -Recurse -Force
    }

    Write-Host "{green}Build synced successfully.{/green}" -ForegroundColor Green
    Write-Host "Open in WeChat DevTools: $OutputDir"
}
finally {
    Pop-Location
}
