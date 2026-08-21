# Photography V4.1 — Look Slowly / Editorial Grid

This is a photography-only patch. It intentionally keeps your existing `js/photos.js` manifest untouched.

## Replace / add

- `photography.html`
- `css/photography.css`
- `js/photography-page.js` (new)

## Do not replace

- `js/photos.js`
- `Images/`
- `MusicTracks/`
- your Home/Music page files

## What changed

- Restores the “Look slowly.” photography introduction.
- Uses a clean, image-first three-column grid on desktop, inspired by the calm spacing of the supplied reference page while retaining your own site identity.
- Keeps Fox first, Buffalo second, then prioritizes people and locations automatically.
- Keeps lazy loading and async decoding for a faster 100+ image archive.
- Uses a new photography-only JavaScript file so legacy lightbox CSS/JS cannot interfere.
- Fullscreen viewer uses two centered image layers with natural width/height plus max-width/max-height containment. The complete photograph should remain visible.
- Previous/next uses a soft cross-fade rather than physically sliding the full-size image offscreen.
- Keyboard arrows, Escape, touchscreen swipe, and neighboring-image preloading remain supported.

## Important

`photography.html` no longer loads `js/portfolio.js`. Other pages can continue using that file normally. This isolates the photography viewer from the older lightbox code.

The current `js/photos.js` remains the source of truth for filenames and metadata. Continue adding new photographs there as before.
