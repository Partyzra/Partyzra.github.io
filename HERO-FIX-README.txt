V4.17.24 — Landing hero image fix

Problem
-------
The homepage hero attempted to fetch js/photos.js at runtime, but home.html did not
load the manifest directly. Browsers can block that fetch when the site is opened
from a local folder (file://), leaving the intro with a black/empty background.
The previous reduced-motion branch could also skip hero initialization entirely.

Fix
---
1. home.html now loads js/photos.js before js/portfolio.js.
2. js/photos.js exposes PORTFOLIO_PHOTOS on window for shared use.
3. js/portfolio.js reads the loaded manifest first, with fetch() only as fallback.
4. Reduced-motion users still receive a random static hero image; only animation is disabled.

The opening image is still random and the normal hero continues cycling through the
full primary Photography archive.
