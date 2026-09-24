# V4.17.26 — Immediate Random Landing Hero

Replace only:

- `js/portfolio.js`

## Fixes

- Removes the intentional 12-second blank/hold before the first landing photograph.
- Starts a photograph request immediately when `home.html` initializes.
- The first photograph is randomized from the full `PORTFOLIO_PHOTOS` archive; Sunset is no longer forced first.
- Continues cycling through the full archive in shuffled order.
- Restores the existing one-way landing motion system by assigning each slide one of: zoom-in, zoom-out, pan-left, or pan-right.
- Preloads each later image before crossfading so the current image remains visible while the next one loads.
- Uses `Images/photo-thumbs/<filename>.webp` first for speed and falls back to `Images/photo-full/<filename>` if a thumbnail is missing.
- Preserves reduced-motion behavior: the first random photograph still displays immediately, but movement/cycling is disabled when the visitor has reduced motion enabled.

No changes are required to `photos.js`, `home.html`, or the Photography page.
