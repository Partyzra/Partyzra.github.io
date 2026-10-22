@echo off
setlocal EnableExtensions

title Partyzra - Build Mobile Video Assets

echo.
echo ==========================================
echo  PARTYZRA - MOBILE VIDEO ASSET GENERATOR
echo ==========================================
echo.
echo This script keeps your original videos untouched.
echo It creates smaller mobile MP4 files and WebP poster images
echo in the SAME folder as this script.
echo.

where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo ERROR: FFmpeg was not found on this computer.
    echo.
    echo On Windows 11, open Terminal or PowerShell and run:
    echo.
    echo     winget install --id Gyan.FFmpeg -e
    echo.
    echo After installation, close/reopen Terminal and run this script again.
    echo.
    pause
    exit /b 1
)

echo FFmpeg found.
echo.

call :process "Horses.mp4" "Horses-mobile.mp4" "Horses-poster.webp"
call :process "Deer Smoothed.mp4" "Deer-Smoothed-mobile.mp4" "Deer-Smoothed-poster.webp"
call :process "Hot Box.mp4" "Hot-Box-mobile.mp4" "Hot-Box-poster.webp"
call :process "Snow.mp4" "Snow-mobile.mp4" "Snow-poster.webp"
call :process "Abandoned.mp4" "Abandoned-mobile.mp4" "Abandoned-poster.webp"

echo.
echo ==========================================
echo  FINISHED
echo ==========================================
echo.
echo Your originals were not changed.
echo Look for the new *-mobile.mp4 and *-poster.webp files.
echo.
pause
exit /b 0

:process
set "INPUT=%~1"
set "MOBILE=%~2"
set "POSTER=%~3"

echo ------------------------------------------
echo Processing: %INPUT%
echo ------------------------------------------

if not exist "%INPUT%" (
    echo SKIPPED: "%INPUT%" was not found.
    echo.
    goto :eof
)

echo Creating mobile video...
ffmpeg -y ^
  -i "%INPUT%" ^
  -map 0:v:0 ^
  -vf "scale='min(1280,iw)':-2:flags=lanczos" ^
  -c:v libx264 ^
  -preset slow ^
  -crf 23 ^
  -pix_fmt yuv420p ^
  -movflags +faststart ^
  -an ^
  "%MOBILE%"

if errorlevel 1 (
    echo ERROR creating "%MOBILE%"
    echo.
    goto :eof
)

echo Creating poster frame...
ffmpeg -y ^
  -ss 00:00:02 ^
  -i "%INPUT%" ^
  -frames:v 1 ^
  -vf "scale='min(1280,iw)':-2:flags=lanczos" ^
  -c:v libwebp ^
  -quality 82 ^
  "%POSTER%"

if errorlevel 1 (
    echo WARNING: Mobile video succeeded, but poster creation failed.
) else (
    echo Done:
    echo   %MOBILE%
    echo   %POSTER%
)

echo.
goto :eof
