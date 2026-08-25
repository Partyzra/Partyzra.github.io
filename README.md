# Photography V4.10.1 — Original Grid Revert

This patch removes the V4.10 framed five-column experiment and restores the previous Photography grid styling.

## Install
Replace only:

- `css/photography.css`

No JavaScript, photo metadata, album rules, viewer zoom, soundtrack, or image files are changed.

## Thumbnail optimization
The current gallery already defers most image requests until they approach the viewport, but the grid still points to the full-resolution originals in `Images/photo-full/`.

For a true bandwidth/decoding improvement, create dedicated grid thumbnails (recommended: about 960px maximum dimension, WebP) in `Images/photo-thumbs/` and make the grid use those while the fullscreen viewer continues to use `Images/photo-full/`.
