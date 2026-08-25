# Photography V4.9.3 — Click-to-Zoom Fix (Patch)

Replace only:

`js/photography-page.js`

This fixes click-to-zoom by checking whether the click coordinates are inside the visible photograph rather than relying on `event.target`, which can be retargeted by pointer capture.
