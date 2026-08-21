# Photography V4.4 — Soundtrack

This patch keeps the near-black Photography page, the `Look slowly.` intro, the current grid order from `js/photos.js`, and the full-frame cross-fade viewer.

## New

- Adds **The Drive Back — Tom Anello** as the Photography-page soundtrack.
- The supplied 67 MB / 24-bit WAV was converted to a web-friendly 192 kbps MP3 (~5.6 MB). The original upload is unchanged.
- The page attempts audible autoplay when `photography.html` loads.
- If the browser blocks autoplay, the fixed soundtrack control changes to **Play soundtrack**. One click starts it.
- The track starts at a restrained volume and fades up to about 42% so it does not overwhelm the photographs.
- The control remains available while browsing and while the fullscreen photo viewer is open.
- The track plays once. It does not loop automatically.

## Copy into the GitHub repository

Replace/add these paths:

- `photography.html`
- `css/photography.css`
- `js/photography-page.js`
- `assets/audio/the-drive-back-tom-anello.mp3`

Keep your existing `js/photos.js` and `Images/` folder unchanged.

## Browser autoplay note

Modern browsers may block audible autoplay on a visitor's first visit. That cannot be reliably bypassed from page code. This version attempts autoplay immediately and provides the small play/pause control as a graceful fallback.
