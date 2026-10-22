$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$home = Join-Path $repo 'home.html'
$css  = Join-Path $repo 'css\style.css'

if (-not (Test-Path $home)) {
    Write-Host "ERROR: home.html was not found next to this patch script." -ForegroundColor Red
    Write-Host "Place this patch in the ROOT of your Partyzra repo and run it again."
    exit 1
}

if (-not (Test-Path $css)) {
    Write-Host "ERROR: css\style.css was not found." -ForegroundColor Red
    Write-Host "Place this patch in the ROOT of your Partyzra repo and run it again."
    exit 1
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $home "$home.backup-$stamp" -Force
Copy-Item $css  "$css.backup-$stamp" -Force

$homeText = Get-Content $home -Raw

if ($homeText -notmatch 'class="contact-email"') {
    $emailBlock = @'

      <p class="contact-email">
        Prefer email?
        <a href="mailto:12rparker@gmail.com">12rparker@gmail.com</a>
      </p>
'@

    $buttonPattern = '(?s)(<button\s+class="button button-light"\s+type="button"\s+data-contact-open>.*?</button>)'

    if ($homeText -match $buttonPattern) {
        $homeText = [regex]::Replace($homeText, $buttonPattern, '$1' + $emailBlock, 1)
        Set-Content -Path $home -Value $homeText -Encoding UTF8
        Write-Host "Added visible email beneath Start a conversation." -ForegroundColor Green
    }
    else {
        Write-Host "ERROR: Could not find the Start a conversation button in home.html." -ForegroundColor Red
        Write-Host "No HTML changes were made."
        exit 1
    }
}
else {
    Write-Host "Contact email block already exists; skipping HTML insertion." -ForegroundColor Yellow
}

$cssText = Get-Content $css -Raw

if ($cssText -notmatch '\.contact-email\s*\{') {
    $cssBlock = @'

/* Contact email fallback */
.contact-email {
  margin: 14px 0 0;
  color: rgba(255, 255, 255, 0.52);
  font-size: 0.78rem;
  letter-spacing: 0.02em;
}

.contact-email a {
  color: rgba(255, 255, 255, 0.82);
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.28);
  transition: color 0.2s ease, border-color 0.2s ease;
}

.contact-email a:hover,
.contact-email a:focus-visible {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.7);
}
'@

    Add-Content -Path $css -Value $cssBlock -Encoding UTF8
    Write-Host "Added contact-email styling." -ForegroundColor Green
}
else {
    Write-Host "Contact email CSS already exists; skipping CSS insertion." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "PATCH COMPLETE" -ForegroundColor Cyan
Write-Host "Backups were created with .backup-$stamp appended to the filenames."
Write-Host ""
Write-Host "Result:"
Write-Host "  Start a conversation"
Write-Host "  Prefer email? 12rparker@gmail.com"
Write-Host ""
