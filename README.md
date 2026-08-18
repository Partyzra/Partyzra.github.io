# Ryan Portfolio — Version 3

Version 3 is a full visual remaster of the GitHub Pages portfolio.

## What changed

- Full-bleed photographic homepage hero using `Images/photo-full/Mountain.jpg`
- More editorial typography and spacing across all pages
- Animated discipline strip and subtle scroll reveals
- New homepage photography triptych using existing photo filenames
- Reworked film section with a featured reel and supporting projects
- Redesigned About and Contact sections
- Photography gallery keeps the working `js/photos.js` manifest
- Photo viewer retains drag, swipe, keyboard navigation, and preloading, with a new progress indicator
- Custom music controls replace the browser-default audio player
- New favicon in `assets/favicon.svg`
- Responsive/mobile styling refined throughout

## Important: keep your Images folder

This package intentionally does not contain your large `Images/` directory. Keep the existing folder in your GitHub repository.

Version 3 expects these existing files for homepage previews:

- `Images/photo-full/Mountain.jpg`
- `Images/photo-full/Night Sky.jpg`
- `Images/photo-full/Sean.JPG`
- `Images/photo-full/Performance.jpg`

The photography page uses all filenames listed in `js/photos.js`.

## Install into your existing repository

Copy these items over the matching files/folders in your local `partyzra.github.io` repository:

- `index.html`
- `photography.html`
- `music.html`
- `css/`
- `js/`
- `assets/`
- `MusicTracks/`
- `README.md`

Do **not** delete your existing `Images/` folder.

Then test locally, commit in GitHub Desktop, and Push origin.

## Contact email

Before treating the site as finished, replace `YOUR_EMAIL@example.com` in `index.html` with the email address you want visitors to use.

## Adding photography

1. Add the image to `Images/photo-full/`.
2. Add one object to `js/photos.js` with the exact filename and desired caption.
3. Commit and push.

GitHub Pages filenames are case-sensitive, so `.JPG` and `.jpg` must match exactly.

## Next audio phase

The custom player in Version 3 lays the groundwork for a future “Enter with sound” experience and cross-page playback-state persistence.


## Version 3.1 — Photography collections

`js/photos.js` now stores richer metadata for every photograph: title, collection, optional year/location, featured status, tags, and a personal note field. The Photography page automatically builds collection filters from that manifest, and the fullscreen viewer stays inside the active collection when a filter is selected.

The starter collection assignments are organizational suggestions based only on the filenames. Adjust them freely as the archive becomes more personal. Blank `year`, `location`, and `note` values are intentional placeholders for information only you can supply.
