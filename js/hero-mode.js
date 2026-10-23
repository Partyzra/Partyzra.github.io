/*
  Partyzra — Homepage Hero Photo Mode

  Change ONLY HERO_MODE below.

  'curated'
    Uses only photographs marked with:
      "hero": true
    in js/photos.js.

  'all'
    Temporarily makes every photograph eligible for the homepage hero,
    without changing any of your saved "hero": true selections.

  After changing the mode, save this file and refresh the homepage.
*/

(() => {
  'use strict';

  // ============================================================
  // HERO BACKGROUND SWITCH
  // ============================================================
  const HERO_MODE = 'all';
  //                  ^^^^^^^^^
  // Change to 'all' to preview the entire photo archive.
  // Change back to 'curated' to use only "hero": true photos.

  const photos = Array.isArray(window.PORTFOLIO_PHOTOS)
    ? window.PORTFOLIO_PHOTOS
    : [];

  if (!photos.length) return;

  const normalizedMode = String(HERO_MODE).trim().toLowerCase();

  if (normalizedMode === 'all') {
    /*
      Mutate only this page's in-memory photo objects.
      photos.js itself is NOT edited, so all of your curated hero:true
      choices remain exactly as you saved them.
    */
    photos.forEach(photo => {
      if (photo && typeof photo === 'object') {
        photo.hero = true;
      }
    });
  }

  /*
    Expose the current mode for an easy browser-console check:
      window.PARTYZRA_HERO_MODE
  */
  window.PARTYZRA_HERO_MODE =
    normalizedMode === 'all' ? 'all' : 'curated';
})();
