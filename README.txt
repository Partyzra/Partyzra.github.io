PARTYZRA — PHOTOGRAPHY AS HOME + LATEST DEFAULT V1

Replace these files:
  index.html
  photography.html
  music.html
  photography-content.html
  music-content.html
  home.html
  js/site-shell.js
  js/photography-page.js

WHAT CHANGED
1. Photography now opens on the Latest album by default.
2. Latest is the first visible album tab, followed by All.
3. Existing direct photo hashes still start in All so shared photo links keep their prior navigation context.
4. The bare site URL / index.html now opens Photography instead of the old landing page.
5. Explicit index.html#film, #about, and #contact links still load the preserved old Home content.
6. Home/brand links on Photography and Music now point to Photography, and the visible brand label is Home.
7. Home links on the preserved old landing page also return to Photography.
8. No changes were made to photos.js or your newly added photographs.
9. The existing 4-column Photography grid remains intact.

CACHE BUMPS
- photography-page.js -> v2.9.6
- site-shell.js -> v2.9.2
