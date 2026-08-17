# Ryan Portfolio — Version 2

This is the redesigned GitHub Pages version of the portfolio.

## Main files

- `index.html` — home, selected film/video work, about, contact
- `photography.html` — masonry gallery + seamless full-screen viewer
- `music.html` — listening room for music tracks
- `css/style.css` — shared visual system and responsive layout
- `js/portfolio.js` — navigation, gallery gestures, image preloading, and audio behavior

## Before publishing

1. Keep your existing `Images/` folder in the repository. The photography page uses the same image filenames from the previous version.
2. Replace `YOUR_EMAIL@example.com` in `index.html` with the email address you want visitors to use.
3. The music page currently includes the two audio files that were present in the ZIP: `All Alone.wav` and `Lemon Bundt.wav`.
4. Test locally before committing to GitHub Desktop.

## Updating GitHub Pages

After replacing the files in your local `partyzra.github.io` repository:

1. Open GitHub Desktop.
2. Review the Changes list.
3. Commit with a message such as `Portfolio Version 2 redesign`.
4. Click **Push origin**.
5. GitHub Pages will republish automatically.

## Photography viewer controls

- Click a photo to open it.
- Desktop: Left/Right arrows or onscreen arrows.
- Touchscreen: swipe left/right.
- Mouse: click-drag left/right.
- Escape or × closes the viewer.
- Neighboring images are preloaded to make transitions feel faster.

## Later: site soundtrack

The current structure intentionally does not force autoplay. A later version can add an `Enter with sound` interaction that starts a selected track after the visitor clicks and stores playback position while navigating between pages.
