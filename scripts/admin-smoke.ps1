# FZLSaas Admin + shunwei-api smoke test
# Usage: .\scripts\admin-smoke.ps1 [-BaseUrl http://127.0.0.1:8787] [-User admin] [-Password shunwei2026dev]

param(
    [string]$BaseUrl = 'http://127.0.0.1:8787',
    [string]$User = 'admin',
    [string]$Password = 'shunwei2026dev'
)

$ErrorActionPreference = 'Stop'
$passed = 0
$failed = 0

function Test-Endpoint {
    param([string]$Path, [Microsoft.PowerShell.Commands.WebRequestSession]$Session, [int[]]$ExpectStatus = @(200))
    $url = "$BaseUrl$Path"
    try {
        $r = Invoke-WebRequest -Uri $url -WebSession $Session -UseBasicParsing -TimeoutSec 15
        if ($ExpectStatus -contains $r.StatusCode) {
            Write-Host "[OK] $Path -> $($r.StatusCode)" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "[FAIL] $Path -> $($r.StatusCode) (expected $($ExpectStatus -join '/'))" -ForegroundColor Red
            $script:failed++
        }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($ExpectStatus -contains $code) {
            Write-Host "[OK] $Path -> $code" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "[FAIL] $Path -> $code" -ForegroundColor Red
            $script:failed++
        }
    }
}

Write-Host "=== shunwei-api health ===" -ForegroundColor Cyan
try {
    $h = Invoke-RestMethod -Uri "$BaseUrl/health" -TimeoutSec 5
    Write-Host "[OK] /health -> $($h.status)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] /health unreachable: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== admin login ===" -ForegroundColor Cyan
$loginBody = @{ username = $User; password = $Password } | ConvertTo-Json
try {
    $null = Invoke-WebRequest -Uri "$BaseUrl/admin/login" -Method POST -ContentType 'application/json' -Body $loginBody -SessionVariable sess -UseBasicParsing
    Write-Host "[OK] /admin/login -> 200" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] /admin/login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Admin-R1 ===" -ForegroundColor Cyan
Test-Endpoint '/api/admin/dashboard/summary?range=7d' $sess
Test-Endpoint '/api/admin/members/list?page=1&limit=5' $sess
Test-Endpoint '/api/admin/members/list?tag=tier299,staff' $sess
Test-Endpoint '/api/admin/approval/list?page=1' $sess

Write-Host "`n=== Admin-R2 ===" -ForegroundColor Cyan
Test-Endpoint '/api/admin/staff/list?page=1' $sess
Test-Endpoint '/api/admin/merchant/list?page=1' $sess

Write-Host "`n=== Admin-R3 ===" -ForegroundColor Cyan
Test-Endpoint '/api/admin/audit-logs?page=1' $sess
Test-Endpoint '/api/admin/integral-mall/products?page=1' $sess
Test-Endpoint '/api/admin/members/batch-grant/template' $sess

Write-Host "`n=== Finance ===" -ForegroundColor Cyan
Test-Endpoint '/api/admin/finance/summary' $sess
Test-Endpoint '/api/admin/finance/cash-voucher-ledger?page=1' $sess
Test-Endpoint '/api/admin/finance/integral-ledger?page=1' $sess
Test-Endpoint '/api/admin/finance/recharge/list?page=1' $sess
Test-Endpoint '/api/admin/finance/settlement/list' $sess

Write-Host "`n=== Public API (401 expected) ===" -ForegroundColor Cyan
Test-Endpoint '/api/membership/plans' $null @(200)
Test-Endpoint '/api/integral/summary' $null @(401)
Test-Endpoint '/api/integral-mall/products' $null @(200)

Write-Host "`n=== Summary: $passed passed, $failed failed ===" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
if ($failed -gt 0) { exit 1 }
