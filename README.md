# V4.14.1 — Photography navigation fix

Replace only:

- `js/site-shell.js`
- `js/shell-navigation.js`

What changed:

- Home → Photography now changes the iframe content before attempting any browser-history URL update.
- `file://` local-folder testing no longer relies on `history.pushState`, which can be rejected by browsers for local files.
- Home and Photography content pages now call the persistent shell directly when possible, with `postMessage` retained as a fallback.
- The persistent soundtrack player remains in the outer shell, so audio continues without restarting during Home ↔ Photography navigation.
- Guitar Solo remains track 1; The Drive Back remains track 2.
