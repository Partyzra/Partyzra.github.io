param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Host ''
  Write-Host 'FFmpeg was not found on this PC.' -ForegroundColor Yellow
  Write-Host 'Install it, then run this script again. On Windows 11 you can usually use:'
  Write-Host '  winget install --id Gyan.FFmpeg -e' -ForegroundColor Cyan
  Write-Host ''
  exit 1
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$jobs = @(
  @{ Input='video/aerial-forest-hero.mp4'; Mobile='video/aerial-forest-hero-mobile.mp4'; Poster='video/aerial-forest-poster.webp'; PosterTime='00:00:01.500' },
  @{ Input='video/Horses.mp4';            Mobile='video/horses-mobile.mp4';            Poster='video/horses-poster.webp';            PosterTime='00:00:01.500' },
  @{ Input='video/Deer Smoothed.mp4';     Mobile='video/deer-smoothed-mobile.mp4';     Poster='video/deer-smoothed-poster.webp';     PosterTime='00:00:01.500' },
  @{ Input='video/Snow.mp4';              Mobile='video/snow-mobile.mp4';              Poster='video/snow-poster.webp';              PosterTime='00:00:01.500' },
  @{ Input='video/Hot Box.mp4';           Mobile='video/hot-box-mobile.mp4';           Poster='video/hot-box-poster.webp';           PosterTime='00:00:01.500' },
  @{ Input='video/Abandoned.mp4';         Mobile='video/abandoned-mobile.mp4';         Poster='video/abandoned-poster.webp';         PosterTime='00:00:01.500' }
)

function Ensure-ParentFolder([string]$Path) {
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

foreach ($job in $jobs) {
  if (-not (Test-Path $job.Input)) {
    Write-Host "Skipping missing source: $($job.Input)" -ForegroundColor DarkYellow
    continue
  }

  Ensure-ParentFolder $job.Mobile
  Ensure-ParentFolder $job.Poster

  if ($Force -or -not (Test-Path $job.Mobile)) {
    Write-Host "Creating mobile video: $($job.Mobile)" -ForegroundColor Cyan
    & ffmpeg -hide_banner -loglevel warning -y `
      -i $job.Input `
      -an `
      -vf 'scale=1280:-2' `
      -c:v libx264 `
      -preset medium `
      -crf 22 `
      -pix_fmt yuv420p `
      -movflags +faststart `
      $job.Mobile

    if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed while creating $($job.Mobile)" }
  } else {
    Write-Host "Already exists: $($job.Mobile)" -ForegroundColor DarkGray
  }

  if ($Force -or -not (Test-Path $job.Poster)) {
    Write-Host "Creating poster: $($job.Poster)" -ForegroundColor Cyan
    & ffmpeg -hide_banner -loglevel warning -y `
      -ss $job.PosterTime `
      -i $job.Input `
      -frames:v 1 `
      -vf 'scale=1280:-2' `
      -c:v libwebp `
      -quality 82 `
      -compression_level 6 `
      $job.Poster

    if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed while creating $($job.Poster)" }
  } else {
    Write-Host "Already exists: $($job.Poster)" -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Mobile video assets are ready.' -ForegroundColor Green
Write-Host 'Commit the generated *-mobile.mp4 and *-poster.webp files with the rest of the site.'
