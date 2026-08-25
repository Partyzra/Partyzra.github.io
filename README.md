# V4.13.3 — Deer hosted path fix

Replace:
- `index.html`

The Deer video source has been corrected from:
- `Video/Deer.mp4`

to:
- `video/Deer.mp4`

Keep the actual video file at:
- `video/Deer.mp4`

This fixes the case-sensitive hosted path while leaving the Forest/Deer layout, lazy loading, autoplay, looping, muted playback, and styling unchanged.
