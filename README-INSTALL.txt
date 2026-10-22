PARTYZRA ANALYTICS V2.6 — ALBUM INSIGHTS
=======================================

Built incrementally on the working V2.5 portfolio / Cloudflare Worker.
This release adds album selections only. NO database migration.

WHAT IS INCLUDED
----------------
  cloudflare-worker/worker.js         Updated authenticated dashboard; keeps IP exclusion
  portfolio/js/photography-page.js    Sends ONE event when a visitor changes album tabs
  portfolio/photography-content.html Updates the JS cache-busting version to v2.6.0
  dashboard-demo.html                Sample data preview; do NOT deploy this file
  backup-v2.5/                       Copies of the three pre-update files for rollback

DASHBOARD: "INSIDE THE COLLECTIONS"
------------------------------------
• Named album selections (clicks that change to a named album)
• Exploring sessions (anonymous sessions that chose any named album)
• Albums explored (distinct named albums selected)
• Returns to All (deliberate switches from another album to All)
• Most explored albums (ranking with selection counts and session counts)
• Recent album selections (shown in Mountain Time)
• Recent Activity now labels the new event as "Album selected"
• Today / 7 Days / 30 Days / All Time filters apply to these metrics.

MEASUREMENT DEFINITIONS
-----------------------
• The Photography page initially opens on "All". That initial default is
  already a page view and is NOT recorded as an album selection.
• A click on a different album tab records a single custom_event:
      event_type=custom_event
      page=/photography
      item=album_select
      label=<selected album name>
• Clicking the already-active album again records nothing.
• Selecting "All" after a named album counts as a return to All,
  not in the ranking of named albums.
• One anonymous session may choose several albums and produce several
  selections. Sessions are NOT unique people or devices.
• This does not currently associate individual photograph opens with
  a particular album or track time spent in that album.
• These metrics start when the V2.6 portfolio code goes live; older
  events cannot be retroactively assigned album selections.

INSTALL — CLOUDFLARE WORKER
---------------------------
1. Back up the current live Worker source before changing it.
2. Workers & Pages > partyzra-analytics > Edit Code.
3. Replace the contents of your editable worker.js with
   cloudflare-worker/worker.js from this package.
4. Deploy.
5. DO NOT delete or change the existing bindings and secrets:
      DB / partyzra-analytics-db
      DASHBOARD_PASSWORD
      EXCLUDED_IPS (private IP exclusions)
   Other configured variables can stay as they are.
6. Your existing /health, /track, /dashboard and Basic Auth keep working.

INSTALL — GITHUB PAGES
----------------------
1. Commit/backup your currently working portfolio repository first.
2. Copy ONLY these two files into matching locations:
      portfolio/js/photography-page.js  -> js/photography-page.js
      portfolio/photography-content.html -> photography-content.html
3. Do NOT replace js/analytics.js, photos.js, images, thumbnails, home.html,
   portfolio.js, CSS, film or music files. Performance optimizations stay intact.
4. Commit and Push origin with GitHub Desktop.
5. After deployment, close old site tabs and hard refresh Ctrl+Shift+R.

VERIFY
------
• Visit /health and ensure it still responds OK.
• Visit /dashboard and click Today, 7 Days, 30 Days, All Time.
• Scroll to "Inside the collections". Before non-excluded visitors click tabs,
  the values can correctly show zero, including when you test from your own IP.
• When a NON-excluded visitor clicks Lagoon, Hawaii, Animals, etc., a
  /track event will be accepted and the album ranking will update upon
  dashboard refresh. The event is queued asynchronously by existing analytics.
• Your excluded home IP should continue producing {"ok":true,"excluded":true}
  to any /track request that reaches the Worker. A browser opt-out may prevent
  the request from being sent entirely. Don't remove your exclusion to test.

ROLLBACK
--------
• Worker: restore your saved pre-install version, or backup-v2.5/worker.js.
• Portfolio: restore the two previous files in backup-v2.5/ and push.
• No schema/data rollback is required. Any new custom_event rows harmlessly
  remain in the existing D1 database if you roll back.

PRIVACY & PERFORMANCE
---------------------
The Worker still checks EXCLUDED_IPS *before* reading the payload or writing
anything to D1. No visitor IP, MAC, exact location, browser fingerprint, email
or name is stored by this analytics feature. Cloudflare/GitHub Pages may still
process network traffic under their own infrastructure policies.

Album events use the current asynchronous analytics queue. Switching tabs does
not fetch new full-resolution photos for analytics, call D1 from the browser,
or wait for a Worker response. The site loading optimizations of V2.5 remain.

Files are generated against the supplied V2.5 release; if you've hand-edited
those particular files since V2.5, compare changes before overwriting.
