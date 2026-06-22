# Create shunwei-api app DB user + run all sw_* migrations on local MySQL
# Usage: .\bootstrap-local-db.ps1 -RootPassword "shunwei2026"

param(
    [string]$MySqlBin = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 3306,
    [string]$RootUser = "root",
    [string]$RootPassword = "shunwei2026",
    [string]$Database = "so1988_shunwei",
    [string]$AppUser = "so1988_shunwei",
    [string]$AppPassword = "HEscpERX3FYH7BYj"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$migRoot = Join-Path $repoRoot "CMB\shunwei-api\migrations"

if (-not (Test-Path $MySqlBin)) {
    Write-Error "mysql.exe not found: $MySqlBin"
}

Write-Host "=== Bootstrap local DB for shunwei-api ===" -ForegroundColor Cyan

$userSql = @"
CREATE USER IF NOT EXISTS '$AppUser'@'localhost' IDENTIFIED BY '$AppPassword';
CREATE USER IF NOT EXISTS '$AppUser'@'127.0.0.1' IDENTIFIED BY '$AppPassword';
GRANT ALL PRIVILEGES ON ``$Database``.* TO '$AppUser'@'localhost';
GRANT ALL PRIVILEGES ON ``$Database``.* TO '$AppUser'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
$userSql | & $MySqlBin --default-character-set=utf8mb4 -h $DbHost -P $DbPort -u $RootUser -p"$RootPassword"
Write-Host "[OK] App user $AppUser" -ForegroundColor Green

$scripts = @(
    "mvp1/001_sw_system_config.sql",
    "mvp1/002_sw_integral_batch.sql",
    "mvp1/003_sw_user_membership.sql",
    "mvp1/004_sw_integral_mall.sql",
    "mvp1/005_eb_member_ship_seed.sql",
    "mvp2/001_sw_approval.sql",
    "mvp2/002_sw_tier_rules.sql",
    "mvp2/003_sw_store_manager.sql",
    "mvp3/001_sw_cash_voucher.sql",
    "mvp3/002_sw_merchant.sql",
    "mvp3/003_sw_integral_recharge.sql",
    "admin-r1/001_sw_admin_audit_log.sql",
    "admin-r2/001_sw_staff_card_and_merchant_extend.sql"
)

foreach ($rel in $scripts) {
    $file = Join-Path $migRoot $rel
    if (-not (Test-Path $file)) { Write-Error "Missing migration: $file" }
    Write-Host "Run: $rel" -ForegroundColor Yellow
    Get-Content -Raw -Encoding UTF8 $file | & $MySqlBin --default-character-set=utf8mb4 -h $DbHost -P $DbPort -u $RootUser -p"$RootPassword" $Database
}

$swCount = & $MySqlBin -h $DbHost -P $DbPort -u $RootUser -p"$RootPassword" $Database -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$Database' AND table_name LIKE 'sw_%';"
Write-Host "Done. sw_* tables: $swCount" -ForegroundColor Green
Write-Host "Next: start shunwei-api and run .\scripts\admin-smoke.ps1" -ForegroundColor Cyan
