# V4.17.5 — Automatic Photography Albums

Replace only:

- `js/photography-page.js`

## What changed

The Photography album navigation now automatically discovers custom album names from `js/photos.js`.

For example, any photo with:

```js
album: 'American Fork Canyon'
```

will cause an **American Fork Canyon** tab to appear automatically.

Multiple albums are also supported:

```js
albums: ['American Fork Canyon', 'Landscapes']
```

The existing built-in album order is preserved first, and new custom albums are appended in the order they first appear in `photos.js`.

`All` remains automatic and should not be added manually.
