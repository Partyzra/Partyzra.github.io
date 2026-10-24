PARTYZRA PHOTOGRAPHY — SHARE DEEP-LINK FIX V6

Replace:
  photography.html
  photography-content.html
  js/photography-page.js

Fix:
- Shared photo URLs now use the public page, e.g.:
    https://partyzra.github.io/photography.html#seagulls
- photography.html forwards its #slug into photography-content.html.
- photography-page.js then finds that slug in the All archive and opens the
  matching photo viewer automatically.
- The V5 gray filled share icon, placement, and tiny "link copied" feedback
  are preserved.

Why it was broken:
- The viewer code runs inside photography-content.html, so building the share
  URL from window.location.href copied the iframe URL instead of the public
  Photography shell URL.

photography-content.html bumps photography-page.js to v2.9.3 for cache busting.
