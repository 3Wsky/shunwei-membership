# MySQL 8.4 安装后初始化（winget 静默安装后需执行本脚本）
# 用法（管理员 PowerShell）: .\init-mysql-local.ps1 -RootPassword "shunwei2026"

param(
    [string]$RootPassword = "shunwei2026",
    [string]$MysqlHome = "C:\Program Files\MySQL\MySQL Server 8.4",
    [string]$DataDir = "C:\ProgramData\MySQL\Data",
    [string]$ServiceName = "MySQL84"
)

$ErrorActionPreference = "Stop"
$bin = Join-Path $MysqlHome "bin"
$mysqld = Join-Path $bin "mysqld.exe"
$mysql = Join-Path $bin "mysql.exe"
$myIni = Join-Path $MysqlHome "my.ini"

Write-Host "=== MySQL 本地初始化 ===" -ForegroundColor Cyan

if (-not (Test-Path $mysqld)) {
    Write-Error "未找到 mysqld.exe: $mysqld`n请先运行: winget install Oracle.MySQL"
}

if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
    Write-Host "初始化数据目录: $DataDir" -ForegroundColor Yellow
    & $mysqld --initialize-insecure --datadir="$DataDir" --console
}

if (-not (Test-Path $myIni)) {
    @"
[mysqld]
basedir=$MysqlHome
datadir=$DataDir
port=3306
character-set-server=utf8mb4
collation-server=utf8mb4_general_ci
"@ | Set-Content -Path $myIni -Encoding ASCII
    Write-Host "已创建 my.ini" -ForegroundColor Yellow
}

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Host "注册 Windows 服务: $ServiceName" -ForegroundColor Yellow
    & $mysqld --install $ServiceName --defaults-file="$myIni"
}

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne 'Running') {
    Write-Host "启动 MySQL 服务..." -ForegroundColor Yellow
    Start-Service $ServiceName
    Start-Sleep -Seconds 3
}

Write-Host "设置 root 密码..." -ForegroundColor Yellow
& $mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$RootPassword'; FLUSH PRIVILEGES;"

# 将 mysql 加入当前会话 PATH
$env:Path = "$bin;" + $env:Path

Write-Host @"

MySQL 已就绪！
  服务名: $ServiceName
  root 密码: $RootPassword
  mysql 路径: $bin

下一步:
  F:\shunweiapp\scripts\setup-database.ps1 -MySqlBin `"$mysql`" -DbPassword `"$RootPassword`"
  F:\shunweiapp\scripts\run-mvp1-migrations.ps1 -MySqlBin `"$mysql`" -DbPassword `"$RootPassword`"

"@ -ForegroundColor Green
