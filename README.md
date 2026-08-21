# Photography V4.6 — Updated archive

This bundle incorporates the latest uploaded `photos.js` into the current dark Photography page.

## Included

- `photography.html`
- `css/photography.css`
- `js/photos.js` — cleaned current manifest with 101 unique image files
- `js/photography-page.js` — randomized All view, Antelope Island/Hawaii albums, soundtrack, and full-image viewer
- `assets/audio/the-drive-back-tom-anello.mp3`

## Install

Copy the files/folders into the matching locations in your local `partyzra.github.io` repository and replace the older Photography-specific versions.

Do **not** delete or replace `Images/photo-full/`. The image files remain there.

The page still references your existing `css/style.css`, so keep that file from the main site in place.

## Current behavior

- All photographs shuffle on every page load.
- Shuffle button creates another random sequence.
- Antelope Island and Hawaii appear as virtual albums.
- New Antelope/Buffalo filenames are automatically recognized as Antelope Island.
- Hawaii collection entries, Kauai, Side of Kauai, and Relaxing are recognized as Hawaii.
- Clicking a photograph opens the entire image with no intentional cropping.
- Previous/next transitions use the existing soft cross-fade.
- The Drive Back soundtrack remains enabled with browser autoplay fallback.

## Archive cleanup

The uploaded manifest contained 102 entries but `Flowers.JPG` appeared twice. This package keeps one copy, leaving 101 unique image filenames.
