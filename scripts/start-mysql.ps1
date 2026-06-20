# 顺为本地 MySQL 启动脚本
# 用途：开机后一键拉起本地 MySQL（winget 安装版，未注册为系统服务）
# 用法：右键以 PowerShell 运行，或在终端执行 .\start-mysql.ps1

$ErrorActionPreference = "Stop"

$mysqld = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"
$datadir = "C:\Program Files\MySQL\MySQL Server 8.4\data"

if (-not (Test-Path $mysqld)) {
    Write-Error "未找到 mysqld.exe：$mysqld"
}

# 检查 3306 是否已在运行
$running = (Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded
if ($running) {
    Write-Host "MySQL 已在运行（3306 端口已监听）" -ForegroundColor Green
    exit 0
}

Write-Host "启动 MySQL ..." -ForegroundColor Yellow
Start-Process -FilePath $mysqld -ArgumentList "--datadir=`"$datadir`"" -WindowStyle Hidden
Start-Sleep -Seconds 8

$ok = (Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded
if ($ok) {
    Write-Host "MySQL 启动成功（127.0.0.1:3306）" -ForegroundColor Green
    Write-Host "数据库: so1988_shunwei  用户: so1988_shunwei" -ForegroundColor Cyan
} else {
    Write-Error "MySQL 启动失败，请检查 data 目录下的 *.err 日志"
}
