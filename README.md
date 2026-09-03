# V4.15.9 — Visible + Mobile-Friendly Alternate Frames

Replace these files in the repository:

- `css/photography.css`
- `js/photography-page.js`

## What changed

- Fixes the alternate-frame button class mismatch that caused 01 / 02 controls to render with browser-default bright styling.
- Preserves the `FRAME` label instead of deleting it when the controls are rendered.
- Makes 01 / 02 / 03 buttons higher contrast and easier to read.
- Gives frame buttons larger mobile touch targets.
- On screens 600px and narrower, raises the FRAME selector above the bottom viewer controls so the persistent soundtrack player cannot cover it.
- No changes to photo assignments, albums, zoom/pan, swiping, soundtrack playback, or the main gallery grid.
