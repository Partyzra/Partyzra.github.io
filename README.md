# V4.15 — Photo variants / alternate snapshots

Adds alternate snapshots inside the fullscreen Photography viewer.

Replace/add these files in the repo:

- `js/photos.js`
- `js/photography-page.js`
- `css/photography.css`
- `photography-content.html`

Configured sets:

- `Bullet Bike.jpg` -> `Bullet Bike1.jpg`
- `Andrew.JPG` -> `Andrew1.jpg`
- `My Mother.jpg` -> `My Mother1.jpg`
- `Side of Kauai.jpg` -> `Side of Kauai1.jpg`

The primary photo remains the only grid tile. When opened, a small 01 / 02 / 03 selector appears only when that subject has alternate snapshots. Main left/right arrows still navigate between different subjects.

To add another set later, edit the primary photo in `js/photos.js`:

```js
{
  "file": "Example.jpg",
  "variants": ["Example1.jpg", "Example2.jpg"],
  "title": "Example"
}
```

Do not add the alternate files as separate `PORTFOLIO_PHOTOS` entries unless you also want them to appear as their own grid tiles. The alternate full-resolution files must exist in `Images/photo-full/`. Thumbnails are not required for alternates unless they are also grid entries.
