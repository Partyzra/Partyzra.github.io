# Reorganized Portfolio Website

This is a cleaned-up version of the uploaded Bootstrap portfolio pages.

## Structure

- `index.html` — home/portfolio landing page from the uploaded `html` file
- `photography.html` — photography gallery based on the uploaded `Photography.html`
- `music.html` — music page based on the uploaded `Music` file
- `css/style.css` — shared and page-specific CSS extracted from the HTML pages
- `js/portfolio.js` — shared photography modal/viewer JavaScript
- `Images/photo-thumbs/` — place thumbnail photographs here if you want separate thumbnail files
- `Images/photo-full/` — place full-resolution photographs here
- `MusicTracks/` — place your music files here

## Notes

1. The uploaded photography pages referenced images but the actual image files were not part of the upload, so image assets were not copied into this package.
2. The photography viewer now supports previous/next navigation, Escape to close, and left/right arrow keys.
3. The music file originally used Windows backslashes in audio URLs; those were changed to web-friendly forward slashes.
4. `index.html` had a malformed custom stylesheet link and embedded CSS; that CSS is now centralized in `css/style.css`.
5. The uploaded file named `New Index that AI generated.html` contains another photography page rather than a home page, so it was not used as the primary `index.html`.
