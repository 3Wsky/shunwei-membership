# Generate TabBar icons for shunwei-app-v2 (81x81 PNG)
# Inactive: #999999  Active: #C9A227 (brand gold)

Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\static\tabbar"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

function ColorFromHex([string]$hex) {
    $hex = $hex.TrimStart('#')
    return [System.Drawing.Color]::FromArgb(
        255,
        [Convert]::ToInt32($hex.Substring(0,2), 16),
        [Convert]::ToInt32($hex.Substring(2,2), 16),
        [Convert]::ToInt32($hex.Substring(4,2), 16)
    )
}

function DrawIcon([string]$name, [System.Drawing.Color]$color, [scriptblock]$drawFn) {
    $size = 81
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $pen = New-Object System.Drawing.Pen $color, 4
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    & $drawFn $g $pen $color $size

    $path = Join-Path $outDir "$name.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $pen.Dispose()
    Write-Host "Created $path"
}

$inactive = ColorFromHex "#999999"
$active = ColorFromHex "#C9A227"

# Home icon
DrawIcon "home" $inactive {
    param($g, $pen, $color, $size)
    $g.DrawLines($pen, @(
        [System.Drawing.Point]::new(40, 18),
        [System.Drawing.Point]::new(16, 38),
        [System.Drawing.Point]::new(16, 62),
        [System.Drawing.Point]::new(64, 62),
        [System.Drawing.Point]::new(64, 38),
        [System.Drawing.Point]::new(40, 18)
    ))
    $g.DrawRectangle($pen, 30, 44, 20, 18)
}
DrawIcon "home_active" $active {
    param($g, $pen, $color, $size)
    $g.DrawLines($pen, @(
        [System.Drawing.Point]::new(40, 18),
        [System.Drawing.Point]::new(16, 38),
        [System.Drawing.Point]::new(16, 62),
        [System.Drawing.Point]::new(64, 62),
        [System.Drawing.Point]::new(64, 38),
        [System.Drawing.Point]::new(40, 18)
    ))
    $g.DrawRectangle($pen, 30, 44, 20, 18)
}

# Shop icon (bag)
DrawIcon "shop" $inactive {
    param($g, $pen, $color, $size)
    $g.DrawArc($pen, 28, 14, 24, 20, 180, 180)
    $g.DrawRectangle($pen, 18, 32, 44, 36)
}
DrawIcon "shop_active" $active {
    param($g, $pen, $color, $size)
    $g.DrawArc($pen, 28, 14, 24, 20, 180, 180)
    $g.DrawRectangle($pen, 18, 32, 44, 36)
}

# User icon
DrawIcon "user" $inactive {
    param($g, $pen, $color, $size)
    $g.DrawEllipse($pen, 28, 14, 24, 24)
    $g.DrawArc($pen, 16, 42, 48, 32, 0, 180)
}
DrawIcon "user_active" $active {
    param($g, $pen, $color, $size)
    $g.DrawEllipse($pen, 28, 14, 24, 24)
    $g.DrawArc($pen, 16, 42, 48, 32, 0, 180)
}

Write-Host "TabBar icons generated successfully."
