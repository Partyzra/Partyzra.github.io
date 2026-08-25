# Photography V4.11.1 — soft scroll fade

This patch adds a viewport-timed soft fade to the Photography grid while keeping the V4.11 thumbnail workflow intact.

Replace:
- `js/photography-page.js`
- `css/photography.css`

What stays the same:
- Grid thumbnails come from `Images/photo-thumbs/<original filename>.webp`.
- The fullscreen viewer uses `Images/photo-full/<original filename>` and therefore displays the original/high-resolution file.
- Random ordering, albums, soundtrack, click-to-zoom, click-to-reset, pan, swipe, and pinch-to-zoom are unchanged.

What changed:
- Thumbnail downloads still begin ahead of the viewport for fast scrolling.
- A separate visibility observer reveals each photograph only when its tile actually reaches the viewport.
- The reveal is a quick opacity fade with a very small settling movement.
- The effect is one-time per rendered tile and respects reduced-motion preferences.
