PARTYZRA — HOMEPAGE HERO PHOTO MODE TOGGLE

Replace / add:

1. home.html
2. js/hero-mode.js

This package is based on the latest approved:
  Observe / Listen / Record
homepage intro.

HOW TO SWITCH MODES

Open:
  js/hero-mode.js

Near the top you will see:

  const HERO_MODE = 'curated';

Use:

  const HERO_MODE = 'curated';

to cycle only photographs that have:

  "hero": true

inside photos.js.

Or change it to:

  const HERO_MODE = 'all';

to let the homepage cycle through the entire photo archive.

IMPORTANT:
Switching to "all" does NOT erase or modify your saved hero:true choices
inside photos.js. It only changes eligibility in memory while the homepage
is running.

That makes it useful for exactly this workflow:
- browse ALL photos on the hero
- notice which ones work well
- mark the good ones hero:true in photos.js
- switch back to CURATED to review only your selections

After changing HERO_MODE, save hero-mode.js and refresh the homepage.
