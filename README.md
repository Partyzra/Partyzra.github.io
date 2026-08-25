# V4.13.4 — Photo filename case fallback

Replace:
- `js/photography-page.js`

The current manifest lists `Derick2.JPG`. This update keeps that metadata intact, but makes both the thumbnail grid and fullscreen viewer try common extension-case variants (`.JPG` / `.jpg`) before removing an image as missing. This addresses Windows-vs-GitHub-Pages filename case differences without changing the rest of the Photography page.
