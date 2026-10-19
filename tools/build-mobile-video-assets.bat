@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-mobile-video-assets.ps1" %*
pause
