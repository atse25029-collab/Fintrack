Add-Type -AssemblyName System.Drawing

$srcIcon = "public/icons/icon-512.png"
$srcMaskable = "public/icons/icon-maskable-512.png"

if (-not (Test-Path $srcIcon)) {
    Write-Error "Source icon not found: $srcIcon"
    exit 1
}

function Resize-Image($srcPath, $dstPath, $targetWidth, $targetHeight) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    $dst = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $targetWidth, $targetHeight)
    $g.Dispose()
    $src.Dispose()
    
    $parent = Split-Path $dstPath -Parent
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $dst.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dst.Dispose()
    Write-Host "Created: $dstPath ($targetWidth x $targetHeight)"
}

function Create-Splash($srcIconPath, $dstPath, $targetWidth, $targetHeight) {
    $src = [System.Drawing.Bitmap]::FromFile($srcIconPath)
    $dst = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Logo size is ~25% of the smaller dimension (min 96px)
    $logoSize = [Math]::Max(96, [Math]::Min([Math]::Min($targetWidth, $targetHeight) * 0.35, 240))
    $x = ($targetWidth - $logoSize) / 2
    $y = ($targetHeight - $logoSize) / 2
    
    $g.DrawImage($src, [int]$x, [int]$y, [int]$logoSize, [int]$logoSize)
    $g.Dispose()
    $src.Dispose()
    
    $parent = Split-Path $dstPath -Parent
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $dst.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dst.Dispose()
    Write-Host "Created Splash: $dstPath ($targetWidth x $targetHeight)"
}

# 1. Launcher Icons
$iconSizes = @{
    "mdpi" = @{ "icon" = 48; "fg" = 108 }
    "hdpi" = @{ "icon" = 72; "fg" = 162 }
    "xhdpi" = @{ "icon" = 96; "fg" = 216 }
    "xxhdpi" = @{ "icon" = 144; "fg" = 324 }
    "xxxhdpi" = @{ "icon" = 192; "fg" = 432 }
}

foreach ($density in $iconSizes.Keys) {
    $info = $iconSizes[$density]
    $iconW = $info["icon"]
    $fgW = $info["fg"]
    
    $dir = "android/app/src/main/res/mipmap-$density"
    Resize-Image $srcIcon "$dir/ic_launcher.png" $iconW $iconW
    Resize-Image $srcIcon "$dir/ic_launcher_round.png" $iconW $iconW
    Resize-Image $srcIcon "$dir/ic_launcher_foreground.png" $fgW $fgW
}

# 2. Splash Screens (Portrait)
Create-Splash $srcIcon "android/app/src/main/res/drawable/splash.png" 480 800
Create-Splash $srcIcon "android/app/src/main/res/drawable-port-mdpi/splash.png" 320 480
Create-Splash $srcIcon "android/app/src/main/res/drawable-port-hdpi/splash.png" 480 800
Create-Splash $srcIcon "android/app/src/main/res/drawable-port-xhdpi/splash.png" 720 1280
Create-Splash $srcIcon "android/app/src/main/res/drawable-port-xxhdpi/splash.png" 960 1600
Create-Splash $srcIcon "android/app/src/main/res/drawable-port-xxxhdpi/splash.png" 1280 1920

# 3. Splash Screens (Landscape)
Create-Splash $srcIcon "android/app/src/main/res/drawable-land-mdpi/splash.png" 480 320
Create-Splash $srcIcon "android/app/src/main/res/drawable-land-hdpi/splash.png" 800 480
Create-Splash $srcIcon "android/app/src/main/res/drawable-land-xhdpi/splash.png" 1280 720
Create-Splash $srcIcon "android/app/src/main/res/drawable-land-xxhdpi/splash.png" 1600 960
Create-Splash $srcIcon "android/app/src/main/res/drawable-land-xxxhdpi/splash.png" 1920 1280

Write-Host "All Android FinTrack icons and splash screens generated successfully!"
