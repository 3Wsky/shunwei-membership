# MVP1 migration runner (PowerShell compatible)
param(
    [string]$MySqlBin = "mysql",
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 3306,
    [string]$DbUser = "root",
    [string]$DbPassword = "root",
    [string]$Database = "so1988_shunwei",
    [string]$MigrationsDir = (Join-Path (Split-Path $PSScriptRoot -Parent) "CMB\shunwei-api\migrations\mvp1")
)

$ErrorActionPreference = "Stop"
Write-Host "=== MVP1 migrations ===" -ForegroundColor Cyan
& $MySqlBin --version | Out-Null

$scripts = @(
    "001_sw_system_config.sql",
    "002_sw_integral_batch.sql",
    "003_sw_user_membership.sql",
    "004_sw_integral_mall.sql",
    "005_eb_member_ship_seed.sql"
)

foreach ($name in $scripts) {
    $file = Join-Path $MigrationsDir $name
    Write-Host "Run: $name" -ForegroundColor Yellow
    Get-Content -Raw -Encoding UTF8 $file | & $MySqlBin --default-character-set=utf8mb4 -h $DbHost -P $DbPort -u $DbUser -p"$DbPassword" $Database
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed: $name" }
}

Write-Host "MVP1 migrations done." -ForegroundColor Green
