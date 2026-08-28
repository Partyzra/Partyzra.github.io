# V4.14.4 — Continuous soundtrack on Music

This patch extends the persistent soundtrack shell from Home + Photography to Home + Photography + Music.

Replace/add:
- `music.html` (replace existing public Music page with shell wrapper)
- `music-content.html` (new; contains the existing Music page)
- `js/site-shell.js`
- `js/shell-navigation.js`

No Photography manifest or gallery files are changed.

Behavior:
- The site soundtrack continues at the same playback position when navigating among Home, Photography, and Music.
- Guitar Solo remains track 1; The Drive Back remains track 2.
- The Music page's own All Alone / Lemon Bundt players remain available inside the page.
