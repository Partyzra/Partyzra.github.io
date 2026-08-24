# Photography V4.8 — fresh shuffle + People album cleanup

This version is based on V4.7 and keeps the mobile progressive-loading work, soundtrack, dark design, albums, and full-image viewer.

## Changes

- **All photographs reshuffle once on every page load.** The shuffle is a lightweight Fisher–Yates pass; it does not meaningfully affect page speed. Image downloading/decoding remains the expensive part and still uses progressive loading.
- The shuffled order stays fixed for the current page visit. Switching between All, Antelope Island, Hawaii, Lagoon, People, and Landscapes does not reshuffle again until reload.
- **People album exclusions:** `Possey.jpg`, `Door.jpg`, and filenames/titles containing the standalone words `cat` or `kitty` are excluded from People even if older metadata says `People`, `Portraits`, or has a people/portrait tag.
- This means `Sun Kitty.jpg` is also protected from accidentally appearing in People now or later.

## Install

For the small patch, replace only:

- `js/photography-page.js`

Everything else can remain as-is.


## Photography V4.9 — Animals + zoom

- Added an **Animals** virtual album. It includes Wildlife entries plus obvious animal files such as Fox, Buffalo, cows, horses, grasshoppers, peacocks, seagulls, squirrels, tiger, bird, kitty/cat files, and `Open Mouth.jpg` (fox).
- Added a magnifying-glass **+** control to the full-screen viewer.
- Desktop: click the magnifier to zoom to 2.35x; drag to pan; click again to return to the complete fitted photograph. Double-click is also supported.
- Mobile/tablet: pinch continuously from 1x to 4x; when zoomed, one finger pans. At 1x, one-finger swipes continue to move between photographs.
- Navigating to a different photograph resets zoom so every new image first appears completely fitted.
- Existing albums, per-load randomization, soundtrack, progressive image loading, and cross-fade transitions are preserved.
