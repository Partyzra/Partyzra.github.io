# Partyzra Photography V4.11 — Thumbnail Workflow

This patch keeps the current 3-column Photography layout and all existing viewer/album behavior, but changes the bulk gallery to use lightweight local WebP thumbnails.

## What changes

- Grid thumbnails load from `Images/photo-thumbs/`.
- Fullscreen viewer still loads originals from `Images/photo-full/` for zoom/pan quality.
- Progressive/lazy loading remains enabled.
- If a thumbnail is missing, the grid temporarily falls back to the full-resolution original instead of showing a broken tile.
- `tools/make-thumbnails.html` generates thumbnails locally in Chrome or Microsoft Edge. Nothing is uploaded.

## Thumbnail naming

The generator preserves the complete original filename and adds `.webp`:

- `Fox.jpg` -> `Fox.jpg.webp`
- `Field.jpg` -> `Field.jpg.webp`
- `Field.png` -> `Field.png.webp`

Keeping the original extension prevents filename collisions.

## One-time setup

1. Copy `js/photography-page.js` and the `tools` folder into the matching locations in your local GitHub repo.
2. Under `Images/`, create a folder named `photo-thumbs` if it does not already exist.
3. Open `tools/make-thumbnails.html` in current Chrome or Microsoft Edge.
4. Click **Choose photo-full folder** and select `Images/photo-full`.
5. Click **Choose / create photo-thumbs folder** and select `Images/photo-thumbs`.
6. Leave **Longest edge** at `1200 px` and leave **Rebuild existing thumbnails** unchecked.
7. Click **Make thumbnails** and wait for the completion message.
8. Test `photography.html` locally.
9. Commit/push `js/photography-page.js`, `tools/make-thumbnails.html`, and the new `Images/photo-thumbs/` files in GitHub Desktop.

## When adding photos later

1. Add the new full image to `Images/photo-full/`.
2. Add its manifest entry to `js/photos.js` as usual.
3. Run `tools/make-thumbnails.html` again.
4. Existing thumbnails are skipped; only missing ones are generated.
5. Commit and push the new full image, its thumbnail, and your updated `photos.js`.

Your original photos are never modified by the thumbnail generator.
