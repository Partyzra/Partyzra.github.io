# V4.17.11 — Higher-quality Photography thumbnails

Changes to `tools/make-thumbnails.html`:
- Default longest edge increased from 1200 px to 1600 px.
- WebP encoding quality increased from 0.82 to 0.90.
- On-screen recommendation updated to 1600 px.
- Fallback default updated to 1600 px.

To rebuild the existing thumbnail archive at the new quality, check **Rebuild existing thumbnails** before running the tool. Without that box checked, existing WebPs are intentionally skipped.
