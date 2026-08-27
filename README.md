# V4.13.8 — Horses third film motion study

Replace only `index.html` in the site root.

This adds `video/Horses.mp4` as the third moving-image study in the Film section. It uses the existing right-weighted layout class, completing the left → center → right sequence:

- Forest: left
- Deer: center
- Horses: right

The existing motion-video JavaScript handles it automatically: muted autoplay when near the viewport, looping, no controls, lazy loading, and pausing when far offscreen.

Expected media path: `video/Horses.mp4` (case-sensitive on GitHub Pages).
