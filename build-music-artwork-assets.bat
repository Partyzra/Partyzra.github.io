@echo off
setlocal EnableExtensions

title Partyzra - Build Music Artwork Assets

echo.
echo ==========================================
echo  PARTYZRA - MUSIC ARTWORK OPTIMIZER
echo ==========================================
echo.
echo This script keeps your original artwork files untouched.
echo It creates smaller WebP copies for the Music page.
echo.

where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo ERROR: FFmpeg was not found on this computer.
    echo.
    echo On Windows 11, open Terminal or PowerShell and run:
    echo.
    echo     winget install --id Gyan.FFmpeg -e
    echo.
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

if not exist "MusicTracks\Album Artwork.png" (
    echo ERROR: Could not find MusicTracks\Album Artwork.png
    pause
    exit /b 1
)

if not exist "MusicTracks\Lemon Bundt.jpg" (
    echo ERROR: Could not find MusicTracks\Lemon Bundt.jpg
    pause
    exit /b 1
)

echo Creating Album-Artwork-web.webp ...
ffmpeg -y -i "MusicTracks\Album Artwork.png" -vf "scale='min(700,iw)':-2:flags=lanczos" -c:v libwebp -quality 86 "MusicTracks\Album-Artwork-web.webp"
if errorlevel 1 (
    echo ERROR creating Album-Artwork-web.webp
    pause
    exit /b 1
)

echo Creating Lemon-Bundt-web.webp ...
ffmpeg -y -i "MusicTracks\Lemon Bundt.jpg" -vf "scale='min(700,iw)':-2:flags=lanczos" -c:v libwebp -quality 86 "MusicTracks\Lemon-Bundt-web.webp"
if errorlevel 1 (
    echo ERROR creating Lemon-Bundt-web.webp
    pause
    exit /b 1
)

echo.
echo Finished.
echo Created:
echo   MusicTracks\Album-Artwork-web.webp
echo   MusicTracks\Lemon-Bundt-web.webp
echo.
pause
exit /b 0
