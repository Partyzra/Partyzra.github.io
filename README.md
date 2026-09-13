# V4.17.23 — Random Full-Archive Landing Hero

Replace:

- `js/portfolio.js`
- `css/style.css`

Changes:

- Removes Sunset as the forced opening hero photograph.
- Reads primary photo filenames directly from the current `js/photos.js` file.
- Shuffles the full Photography archive and selects a random valid first image.
- Cycles through every primary photograph before reshuffling for another pass.
- Avoids showing the same photograph twice at a cycle boundary.
- Keeps 1600px WebP thumbnails as the preferred hero source for performance, with full-resolution fallback.
- Keeps the current 12-second moving-image drift, 12-second hold, and 4-second dissolve.
- Keeps all Film, navigation, reveal, soundtrack-shell compatibility, and homepage behavior unchanged.
- Removes the hard-coded Sunset CSS hero background; black is shown only while the first random image is preloading.
