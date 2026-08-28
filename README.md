# V4.14.3 — Animal grid focal points

Replace only:

- `js/photography-page.js`

## What changed

The Photography grid can now use a custom crop focal point without changing the fullscreen/original image.

Current automatic focal points:

- Any filename beginning with `Peacock` → upper-centered crop (`50% 18%`)
- `Fox.jpg` → upper-centered crop (`50% 20%`)
- Everything else → normal centered crop (`50% 50%`)

This means Peacock/Peacock2/Peacock3/etc. will show the head area rather than the center of the body when displayed as cropped grid thumbnails.

## Manual control for any future photo

You can optionally add a `focus` property to any entry in `js/photos.js`:

```js
{
  file: 'Example.jpg',
  title: 'Example',
  collection: 'Wildlife',
  focus: '50% 20%',
  ...
}
```

- First percentage = horizontal position (0% left, 50% center, 100% right)
- Second percentage = vertical position (0% top, 50% center, 100% bottom)

Only the grid crop changes. The fullscreen viewer still uses the complete full-resolution photograph.
