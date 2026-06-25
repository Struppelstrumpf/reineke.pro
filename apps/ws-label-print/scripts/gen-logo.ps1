$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$w = 220
$h = 64
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::White)
$titleFont = New-Object System.Drawing.Font('Georgia', 11, [System.Drawing.FontStyle]::Bold)
$g.DrawString('WEISSER SCHÄFER', $titleFont, [System.Drawing.Brushes]::Black, 42, 4)
$bodyBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 20, 20, 20))
$g.FillEllipse($bodyBrush, 88, 24, 44, 34)
$g.FillEllipse($bodyBrush, 72, 28, 16, 14)
$g.FillEllipse($bodyBrush, 132, 28, 16, 14)
$eye = [System.Drawing.Brushes]::White
$g.FillEllipse($eye, 100, 34, 5, 5)
$g.FillEllipse($eye, 116, 34, 5, 5)
$estFont = New-Object System.Drawing.Font('Arial', 6, [System.Drawing.FontStyle]::Bold)
$g.DrawString('EST. 2024', $estFont, [System.Drawing.Brushes]::Gray, 92, 54)
$out = Join-Path $PSScriptRoot '..\assets\ws-logo-print.png'
$dir = Split-Path $out
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output $out
