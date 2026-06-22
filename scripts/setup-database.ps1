# Shunwei CRMEB local database import
# Usage: .\setup-database.ps1 -DbPassword "your_password"

param(
    [string]$MySqlBin = "mysql",
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 3306,
    [string]$DbUser = "root",
    [Alias("MySqlPassword")]
    [string]$DbPassword = "root",
    [string]$Database = "so1988_shunwei",
    [string]$SqlFile = (Join-Path (Split-Path $PSScriptRoot -Parent) "Data\so1988_shunwei_2026-06-19_mysql_data_kXB9h.sql")
)

$ErrorActionPreference = "Stop"

Write-Host "=== Shunwei CRMEB DB Import ===" -ForegroundColor Cyan

if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file not found: $SqlFile"
}

& $MySqlBin --version | Out-Null

Write-Host "Create database: $Database" -ForegroundColor Yellow
$createSql = "CREATE DATABASE IF NOT EXISTS ``$Database`` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
& $MySqlBin --default-character-set=utf8mb4 -h $DbHost -P $DbPort -u $DbUser -p"$DbPassword" -e $createSql

Write-Host "Import SQL (~12MB, 1-3 min)..." -ForegroundColor Yellow
Write-Host "Tip: must use utf8mb4 or Chinese nicknames become ??? on Windows" -ForegroundColor DarkGray
Get-Content -Raw -Encoding UTF8 $SqlFile | & $MySqlBin --default-character-set=utf8mb4 -h $DbHost -P $DbPort -u $DbUser -p"$DbPassword" $Database
if ($LASTEXITCODE -ne 0) {
    Write-Error "SQL import failed. Check password and MySQL service."
}

$tableCount = & $MySqlBin -h $DbHost -P $DbPort -u $DbUser -p"$DbPassword" $Database -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$Database';"
Write-Host "Done. Table count: $tableCount" -ForegroundColor Green
Write-Host "Next: run-mvp1-migrations.ps1 then start shunwei-api" -ForegroundColor Cyan
