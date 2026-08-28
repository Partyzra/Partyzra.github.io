# V4.14.7 — Grid focal-point adjustments

Replace only:

- `js/photography-page.js`

Grid-only focal points added:
- Model → `50% 100%` (bottom)
- The Rocket → `50% 0%` (top)
- Derick → `50% 10%` (upper)
- Fox2 → `50% 10%` (upper)

Existing Peacock and Fox focal behavior is preserved.

## Manual control
Add a `focus` property to any item in `js/photos.js`:

```js
{
  file: 'Example.jpg',
  title: 'Example',
  collection: 'People',
  focus: '50% 20%'
}
```

The first percentage is horizontal (0%=left, 50%=center, 100%=right).
The second is vertical (0%=top, 50%=center, 100%=bottom).

An explicit `focus` in `photos.js` overrides any automatic default in `photography-page.js`.
