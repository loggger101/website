# generate-og-card.ps1
#
# Regenerates og.jpg at the repo root. The output is the social-share card
# referenced by every page's og:image and twitter:image meta tags.
#
# Output: 1200x630 JPEG (quality 88), deep-blue gradient + scattered stars +
# accent star glyph + the site title / tagline / URL. JPEG is used instead of
# PNG because the card is gradient-heavy with no transparency — q=88 gives a
# 3-4x size reduction over PNG with no visible degradation, and OG / Twitter
# both accept image/jpeg.
#
# Usage (from the repo root, on Windows PowerShell 5.1+):
#   .\scripts\generate-og-card.ps1
#
# If you tweak any of the values (size, gradient stops, fonts, copy), keep
# the dimensions at 1200x630 to stay inside the OG / Twitter
# "summary_large_image" recommended aspect ratio.

Add-Type -AssemblyName System.Drawing

$w = 1200
$h = 630
$bmp = New-Object System.Drawing.Bitmap -ArgumentList $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 1. Base vertical gradient (deep blue -> near black) matching the site.
$rect = New-Object System.Drawing.Rectangle -ArgumentList 0, 0, $w, $h
$c1 = [System.Drawing.ColorTranslator]::FromHtml('#061027')
$c2 = [System.Drawing.ColorTranslator]::FromHtml('#060913')
$baseBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList $rect, $c1, $c2, ([single]90.0)
$g.FillRectangle($baseBrush, $rect)
$baseBrush.Dispose()

# 2. Top-left blue radial glow.
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse(-200, -200, 1100, 900)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush -ArgumentList $path
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(75, 49, 130, 206)
$pgb.SurroundColors = ,[System.Drawing.Color]::FromArgb(0, 49, 130, 206)
$g.FillPath($pgb, $path)
$pgb.Dispose()
$path.Dispose()

# 3. Bottom-right purple radial glow.
$path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
$path2.AddEllipse(400, 200, 1100, 900)
$pgb2 = New-Object System.Drawing.Drawing2D.PathGradientBrush -ArgumentList $path2
$pgb2.CenterColor = [System.Drawing.Color]::FromArgb(60, 120, 80, 255)
$pgb2.SurroundColors = ,[System.Drawing.Color]::FromArgb(0, 120, 80, 255)
$g.FillPath($pgb2, $path2)
$pgb2.Dispose()
$path2.Dispose()

# 4. Star field (140 dots, seeded so the layout is reproducible).
$starBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(180, 255, 255, 255))
$starBrushDim = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(110, 207, 232, 255))
$rng = New-Object System.Random -ArgumentList 42
for ($i = 0; $i -lt 140; $i++) {
  $x = $rng.Next(0, $w)
  $y = $rng.Next(0, $h)
  $r = $rng.Next(1, 3)
  $b = if ($rng.NextDouble() -lt 0.7) { $starBrush } else { $starBrushDim }
  $g.FillEllipse($b, $x, $y, $r, $r)
}
$starBrush.Dispose()
$starBrushDim.Dispose()

# 5. Big accent eight-pointed star glyph on the left.
$starFam = New-Object System.Drawing.FontFamily -ArgumentList 'Segoe UI Symbol'
$starFont = New-Object System.Drawing.Font -ArgumentList $starFam, 220, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$accentBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(220, 99, 179, 237))
$g.DrawString([string][char]0x2737, $starFont, $accentBrush, [single]90, [single]200)
$starFont.Dispose()
$accentBrush.Dispose()

# 6. Title.
$titleFam = New-Object System.Drawing.FontFamily -ArgumentList 'Segoe UI'
$titleFont = New-Object System.Drawing.Font -ArgumentList $titleFam, 84, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$titleBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(245, 245, 245))
$g.DrawString('Logan M Edwards', $titleFont, $titleBrush, [single]380, [single]220)

# 7. Subtitle.
$subFont = New-Object System.Drawing.Font -ArgumentList $titleFam, 36, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$subBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(220, 160, 174, 192))
$bullet = [char]0x2022   # • — matches the on-page site tagline
$g.DrawString("Astronomy & Astrophysics  $bullet  Planetary Science", $subFont, $subBrush, [single]380, [single]330)

# 8. URL footer.
$urlFont = New-Object System.Drawing.Font -ArgumentList $titleFam, 28, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$urlBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(180, 160, 174, 192))
$g.DrawString('www.loganmedwardsastrophy.com', $urlFont, $urlBrush, [single]380, [single]410)

$titleFont.Dispose(); $subFont.Dispose(); $urlFont.Dispose()
$titleBrush.Dispose(); $subBrush.Dispose(); $urlBrush.Dispose()
$g.Dispose()

# Resolve the repo-root path relative to this script and write og.jpg there.
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$out = Join-Path $repoRoot 'og.jpg'

# Save as JPEG quality 88 — see header comment for the rationale.
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
$encParams = New-Object System.Drawing.Imaging.EncoderParameters -ArgumentList 1
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter -ArgumentList ([System.Drawing.Imaging.Encoder]::Quality, [long]88)
$bmp.Save($out, $jpegCodec, $encParams)
$encParams.Dispose()
$bmp.Dispose()

$size = (Get-Item $out).Length
Write-Output "Wrote $out ($([math]::Round($size/1024,1)) KB)"
