PARTYZRA ANALYTICS + GALLERY — V2.4 PRIVACY & SPEED FIX
====================================================

WHAT THIS FIXES
1. Visible confirmation for opt-out: ?analytics=off and ?analytics=status.
2. Privacy preference set in the public page BEFORE its embedded iframe loads.
3. The V2.4 tracking script checks the opt-out before ALL events.
4. Cache-busting ?v=2.4.0 script references avoid older cached analytics code.
5. Thumbnail grid NEVER fetches full-resolution photos as a fallback.
6. Reduces eagerness (6 desktop/3 mobile), gallery preload threshold,
   and removes full-resolution mobile downloads on simple scrolling.
7. Actual fullscreen image viewing remains unchanged; the existing D1
   database and Cloudflare Worker are completely untouched.

INSTALLATION — ONLY REPLACE THE TEN FILES IN THIS ZIP
Keep the existing folder paths (js/, css/, root). Do NOT delete the rest
of the GitHub Pages site or its Images/video folders.

Copy root files:
  index.html
  photography.html
  music.html
  home.html
  photography-content.html
  music-content.html

Copy js files:
  js/analytics.js
  js/site-shell.js
  js/photography-page.js

Copy css file:
  css/photography.css

Commit and PUSH the updated files using GitHub Desktop. Wait for GitHub Pages
publication before testing. Visit the site in Chrome and do a hard reload
(Ctrl+Shift+R). Close any old tabs displaying older copies of the site.

EXCLUDE YOUR OWN BROWSER
  https://partyzra.github.io/?analytics=off
You MUST see the visible confirmation banner ("Personal analytics excluded...").
If you don't see it, the new public shell HTML/JS may not yet be published.

CHECK STATUS
  https://partyzra.github.io/?analytics=status

RESUME TRACKING
  https://partyzra.github.io/?analytics=on

VERIFY
1. Visit ?analytics=off; the visible banner should confirm exclusion.
2. Click through Home -> Photography, and open several photographs.
3. Chrome F12 -> Network -> filter "track"; confirm NO new POST requests.
   Disable "Preserve log" or clear the list BEFORE testing. On the first visit,
   any previous in-flight POST from old tabs could still finish.
4. F12 -> Application -> Local Storage -> https://partyzra.github.io:
   partyzra_analytics_opt_out should be 1.
5. Optional Console: document.querySelector('iframe').contentWindow.PortfolioAnalytics
   should expose version "2.4.0", optedOut true, enabled false.

IMPORTANT: This is an opt-out per browser/profile, not an IP-wide ban.
Previously stored events remain in D1; those cannot be retroactively
identified as yours without additional information.

GALLERY NOTES
- Full photos still open at original quality. However if a thumbnail file
  is genuinely absent, its grid tile says "Preview unavailable — open to view"
  rather than silently downloading a large camera original.
- This package does NOT include images. For those placeholders, create the
  missing matching .webp thumbnails in Images/photo-thumbs/ (case-sensitive).
- Since the source archive did not contain Images/, missing thumbnails and
  actual live network timings could not be verified here.

ROLLBACK
Restore the ten files from your repository's previous commit and push.
Do not change your Cloudflare Worker, D1 database or password secret.
