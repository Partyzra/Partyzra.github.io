PARTYZRA ANALYTICS — V2.2 PHOTOGRAPHY INSIGHTS
================================================

THIS IS AN UPGRADE TO YOUR WORKING V2.1 — NOT A REBUILD.

FILES
-----
worker.js                   New V2.2 Cloudflare Worker (DEPLOY THIS FILE)
dashboard-demo.html          Standalone preview with SAMPLE DATA, not connected to D1
backup/worker-v2.1.js       The previous V2.1 code, for rollback if needed
README.txt                  This file

WHAT'S NEW
----------
- 'Through the lens' photography section
- Gallery sessions: sessions that included a /photography page view
- Gallery-to-photo rate: those gallery sessions that also opened an image
- Alternate frame opens
- Average photo opens per photo-opening session
- Top photographs: primary and alternate frames grouped by the shared title
- Individual image files: alternate frames remain distinct, with frame labels
- Gaining attention: photo opens vs the immediately preceding equal-length
  Mountain Time period (Today vs Yesterday, 7 Days vs previous 7, etc.)
- Latest eight photograph opens, with files and Mountain timestamps
- All-Time range does not show a comparison because there is no comparable
  preceding period.

NO DATABASE MIGRATION REQUIRED.
Existing table, indexes, events, schema and `/track` payloads remain unchanged.
No changes to your public portfolio/GitHub Pages are required.

DEPLOYMENT STEPS
----------------
1. Open Cloudflare > Workers & Pages > partyzra-analytics > Edit Code.
2. Save a backup of the currently working worker.js, if desired.
3. Open the worker.js in THIS V2.2 package and copy its full contents.
4. In Cloudflare select the actual editable worker.js file, press Ctrl+A,
   paste the V2.2 worker.js source, then click Deploy and confirm.
   (Do not edit a deployment's read-only source preview.)
5. Leave these unchanged:
     Worker name:           partyzra-analytics
     D1 binding:            DB
     D1 database:           partyzra-analytics-db
     Secret:                DASHBOARD_PASSWORD
6. Visit:
    https://partyzra-analytics.12rparker.workers.dev/health
    https://partyzra-analytics.12rparker.workers.dev/dashboard?range=7d
7. Check Today, 7 Days, 30 Days and All Time. Scroll to 'Through the lens'.
8. Test opening a photograph on your public portfolio and then refresh the
   dashboard to check its latest photo opens, if desired.

ROLLBACK
--------
If you encounter 'Dashboard unavailable', copy
backup/worker-v2.1.js into the Cloudflare editor, Deploy, and check /health
and /dashboard. Existing D1 data remains unchanged.

DATA INTERPRETATION
-------------------
- Opens are events, not unique people; repeated opens count again.
- Sessions are temporary anonymous browser sessions, not unique visitors.
- Gallery-to-photo uses /photography page_view sessions as the denominator.
- Primary and alternate files use the same label when grouped, except
  for the existing '— Frame 02' suffix. Files still have individual counts.
- 'New in period' means zero opens during the comparison period, not that
  a photograph was uploaded recently.
- 'All Time' preserves its historical cumulative data, but has no prior
  equal-length reference window for trending.
- Album/tab analytics aren't included yet: the current portfolio does not
  send separate album-selection events. This can be added later using the
  existing custom_event channel without migrating the D1 database.
- This version does not track IP addresses, emails, precise location,
  browser fingerprints, or identifying visitor information.

TESTED LOCALLY
--------------
All four date filters, empty database, SQLite schema-compatible queries,
photo/frame grouping, comparison periods, output escaping, authentication,
/health and /track. Max prepared-statement binds observed: 80.
Live Cloudflare deployment has NOT been performed from this package.
