# generate-og-card.ps1
#
# Regenerates one of the site's social-share cards (1200x630 JPEG, quality 88).
#
# Variants:
#   default  -> og.jpg          Homepage card (Logan M Edwards + tagline)
#   drone    -> og-drone.jpg    Drone Target Identification project card (teal accent)
#   star     -> og-star.jpg     Star Cataloguing project card (blue accent)
#   aspire   -> og-aspire.jpg   AspireCURES Website project card (teal accent)
#
# JPEG is used instead of PNG because the card is gradient-heavy with no
# transparency — q=88 gives a 3-4x size reduction over PNG with no visible
# degradation, and OG / Twitter both accept image/jpeg.
#
# Usage (from the repo root, on Windows PowerShell 5.1+):
#   .\scripts\generate-og-card.ps1                  # default
#   .\scripts\generate-og-card.ps1 -Variant drone
#   .\scripts\generate-og-card.ps1 -Variant star
#   .\scripts\generate-og-card.ps1 -Variant all     # regenerate all three
#
# If you tweak any of the values (size, gradient stops, fonts, copy), keep
# the dimensions at 1200x630 to stay inside the OG / Twitter
# "summary_large_image" recommended aspect ratio.

param(
  [ValidateSet('default','drone','star','aspire','all')]
  [string] $Variant = 'default'
)

Add-Type -AssemblyName System.Drawing

# Variant config table. Each entry overrides the accent glyph, accent color,
# the secondary radial glow color, the headline copy, and the output filename.
# Keep title strings under ~28 chars so they fit on one line at 84px.
$variants = @{
  'default' = @{
    Out        = 'og.jpg'
    AccentRgb  = @(99, 179, 237)
    GlowRgb    = @(120, 80, 255)   # purple bottom-right glow
    Glyph      = [char]0x2737      # eight-pointed star ✷
    GlyphSize  = 220
    GlyphX     = 90
    GlyphY     = 200
    Title      = 'Logan M Edwards'
    Subtitle   = 'Astronomy & Astrophysics  {0}  Planetary Science'  # {0} -> bullet
  }
  'drone' = @{
    Out        = 'og-drone.jpg'
    AccentRgb  = @(34, 211, 238)   # aqua-cyan — matches .project-card--teal
    GlowRgb    = @(34, 211, 238)
    Glyph      = [char]0x25CE      # circled dot ◎
    GlyphSize  = 220
    GlyphX     = 90
    GlyphY     = 200
    Title      = 'Drone Target ID'
    Subtitle   = '87% fine  {0}  91% coarse  {0}  182k samples'
  }
  'star' = @{
    Out        = 'og-star.jpg'
    AccentRgb  = @(99, 179, 237)   # blue — matches .project-card--blue
    GlowRgb    = @(99, 179, 237)
    Glyph      = [char]0x2605      # solid star ★
    GlyphSize  = 240
    GlyphX     = 100
    GlyphY     = 190
    Title      = 'Star Cataloguing'
    Subtitle   = '84% letter top-1  {0}  98% top-2  {0}  96k samples'
  }
  'aspire' = @{
    Out        = 'og-aspire.jpg'
    AccentRgb  = @(30, 158, 150)   # teal — matches .project-card--green
    GlowRgb    = @(30, 158, 150)
    Glyph      = [char]0x271A      # heavy Greek cross ✚
    GlyphSize  = 220
    GlyphX     = 90
    GlyphY     = 200
    Title      = 'AspireCURES'
    Subtitle   = '~15k lines  {0}  8 programs  {0}  Cloudflare Pages'
  }
}

function New-OgCard {
  param(
    [Parameter(Mandatory=$true)] [hashtable] $Cfg,
    [Parameter(Mandatory=$true)] [string]   $RepoRoot
  )

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

  # 2. Top-left blue radial glow (kept on every variant for site continuity).
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(-200, -200, 1100, 900)
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush -ArgumentList $path
  $pgb.CenterColor = [System.Drawing.Color]::FromArgb(75, 49, 130, 206)
  $pgb.SurroundColors = ,[System.Drawing.Color]::FromArgb(0, 49, 130, 206)
  $g.FillPath($pgb, $path)
  $pgb.Dispose()
  $path.Dispose()

  # 3. Bottom-right accent glow — tinted by the variant.
  $glow = $Cfg.GlowRgb
  $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path2.AddEllipse(400, 200, 1100, 900)
  $pgb2 = New-Object System.Drawing.Drawing2D.PathGradientBrush -ArgumentList $path2
  $pgb2.CenterColor = [System.Drawing.Color]::FromArgb(60, $glow[0], $glow[1], $glow[2])
  $pgb2.SurroundColors = ,[System.Drawing.Color]::FromArgb(0, $glow[0], $glow[1], $glow[2])
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

  # 5. Big accent glyph on the left, tinted by the variant.
  $accent = $Cfg.AccentRgb
  $starFam = New-Object System.Drawing.FontFamily -ArgumentList 'Segoe UI Symbol'
  $starFont = New-Object System.Drawing.Font -ArgumentList $starFam, ([single]$Cfg.GlyphSize), ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
  $accentBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(220, $accent[0], $accent[1], $accent[2]))
  $g.DrawString([string]$Cfg.Glyph, $starFont, $accentBrush, [single]$Cfg.GlyphX, [single]$Cfg.GlyphY)
  $starFont.Dispose()
  $accentBrush.Dispose()

  # 6. Title.
  $titleFam = New-Object System.Drawing.FontFamily -ArgumentList 'Segoe UI'
  $titleFont = New-Object System.Drawing.Font -ArgumentList $titleFam, 84, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $titleBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(245, 245, 245))
  $g.DrawString($Cfg.Title, $titleFont, $titleBrush, [single]380, [single]220)

  # 7. Subtitle (substitutes {0} with the bullet glyph used on the on-page tagline).
  $bullet = [char]0x2022
  $subText = [string]::Format($Cfg.Subtitle, $bullet)
  $subFont = New-Object System.Drawing.Font -ArgumentList $titleFam, 36, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
  $subBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(220, 160, 174, 192))
  $g.DrawString($subText, $subFont, $subBrush, [single]380, [single]330)

  # 8. URL footer (constant across all variants — same site).
  $urlFont = New-Object System.Drawing.Font -ArgumentList $titleFam, 28, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
  $urlBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(180, 160, 174, 192))
  $g.DrawString('www.loganmedwardsastrophy.com', $urlFont, $urlBrush, [single]380, [single]410)

  $titleFont.Dispose(); $subFont.Dispose(); $urlFont.Dispose()
  $titleBrush.Dispose(); $subBrush.Dispose(); $urlBrush.Dispose()
  $g.Dispose()

  $out = Join-Path $RepoRoot $Cfg.Out

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
}

# Resolve the repo-root path relative to this script.
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

$toRender = if ($Variant -eq 'all') { @('default','drone','star','aspire') } else { @($Variant) }
foreach ($v in $toRender) {
  New-OgCard -Cfg $variants[$v] -RepoRoot $repoRoot
}
