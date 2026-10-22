PARTYZRA — MOBILE VIDEO OPTIMIZATION PATCH

Replace only these two files in your current repo:

  home.html
  js/portfolio.js

Do NOT replace your /video folder. Keep the mobile MP4 and WebP files you generated.

Expected files in /video:
  aerial-forest-hero-mobile.mp4
  aerial-forest-poster.webp
  Horses-mobile.mp4
  Horses-poster.webp
  Deer-Smoothed-mobile.mp4
  Deer-Smoothed-poster.webp
  Hot-Box-mobile.mp4
  Hot-Box-poster.webp
  Snow-mobile.mp4
  Snow-poster.webp
  Abandoned-mobile.mp4
  Abandoned-poster.webp

What this patch does:
- Corrects filename capitalization so GitHub Pages can actually find the new mobile assets.
- Uses poster images immediately before video playback.
- Mobile/coarse-pointer devices choose the smaller *-mobile.mp4 source.
- Desktop keeps the original high-quality MP4 files.
- Only one film clip is allowed to play at a time on mobile.
- Adds a small visibility/handoff buffer to prevent rapid pause/play switching while scrolling.
- Removes unnecessary HEAD/preflight requests before media loading.
- Keeps preload="none" so off-screen videos do not eagerly download.

After copying the files, commit/push your existing video assets and these code changes together.
