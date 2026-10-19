MOBILE PERFORMANCE PASS
=======================

Already active in the code:
- Photography opens instantly with the cached thumbnail, then fades in full resolution.
- Mobile Photography preloads only the immediate previous/next full-resolution image.
- Mobile viewer has large, visible Previous/Next arrow buttons; swipe still works.
- Only the most-visible local homepage film is allowed to play on mobile.
- Poster support is wired for all six local film clips.
- Mobile-specific video source support is wired for all six local film clips.

ONE LOCAL STEP IS NEEDED FOR THE NEW VIDEO FILES
------------------------------------------------
The small .7z archive supplied for this edit did not contain the large video files,
so the optimized MP4s/poster images could not be physically rendered inside this
package.

In your full repository (the one that contains the /video folder):

1. Copy the updated files from this package into the full repository.
2. Double-click:
      tools\build-mobile-video-assets.bat
3. If Windows says FFmpeg is missing, install it with:
      winget install --id Gyan.FFmpeg -e
   Then close/reopen the terminal or double-click the .bat again.
4. The script creates:
      video/horses-mobile.mp4
      video/deer-smoothed-mobile.mp4
      video/snow-mobile.mp4
      video/hot-box-mobile.mp4
      video/abandoned-mobile.mp4
      plus matching *-poster.webp files.
   It also preserves/recreates the existing aerial mobile/poster assets if needed.
5. Commit those generated files to GitHub with the code changes.

The mobile encodes are 1280px wide H.264, CRF 22, no audio, with fast-start enabled.
The webpage's clips are already muted, so removing audio saves bandwidth without
changing what visitors experience.

To choose a different poster frame, edit PosterTime for that clip in:
  tools\build-mobile-video-assets.ps1
Then run the script with -Force from PowerShell, for example:
  .\tools\build-mobile-video-assets.ps1 -Force
