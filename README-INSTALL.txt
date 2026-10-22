PARTYZRA ANALYTICS V2.7 — RECENT ACTIVITY HISTORY
=================================================

This is a small, dashboard-only update on top of the working V2.6
Album Insights Worker. It does NOT alter the tracking endpoint, analytics
collection, database schema, personal IP exclusions, or the GitHub Pages site.

WHAT CHANGED
------------
- Recent Activity can show 20 (default), 50, 100, or 250 rows per page.
- Older / Newer links let you browse back through ALL saved records within
  the selected date filter, in chronological order (newest first).
- A label shows which rows are displayed: e.g. 101–200 of 527 events.
- The entire Recent Activity panel is wider for easier browsing.
- Links retain the chosen date filter and event-count selection.
- No new JavaScript, client-side requests, endpoints, database tables,
  indexes, or new analytics tracking events are added.

INSTALL — ONLY CLOUDFLARE
-------------------------
1. In Cloudflare, open Workers & Pages > partyzra-analytics > Edit Code.
2. Back up your currently deployed Worker code.
3. Open the existing editable worker.js and replace all of its contents
   with cloudflare-worker/worker.js from this package.
4. Deploy.
5. Visit https://partyzra-analytics.12rparker.workers.dev/dashboard
   and refresh the dashboard. Scroll to Recent Activity.

KEEP EXISTING SETTINGS AS THEY ARE
----------------------------------
- D1 binding DB, connected to partyzra-analytics-db
- Private DASHBOARD_PASSWORD secret
- Private EXCLUDED_IPS secret
- Any SITE_ORIGIN / DASHBOARD_USER settings already configured

DO NOT edit or redeploy your GitHub Pages portfolio for this update.
DO NOT change the D1 schema or delete old events.

USING THE HISTORY
-----------------
- Select 100 or 250 to see more rows on one page.
- Select Older to browse farther back; Newer to return toward recent events.
- All Time includes every event currently stored in D1, and paging works
  through that entire range. You can page beyond 250 events.
- The Recent Activity table is scrollable inside its section to avoid a
  very long dashboard. Navigation is below the scrollable table.
- Date filter changes return to page 1 of the newly selected period.
- If you see fewer rows than requested, that is all the data stored in the
  selected period or you have reached the final page.
- Existing IP exclusions remain active, so excluded events are not stored
  and cannot appear in the history.

ROLLBACK
--------
If needed, restore your pre-upgrade Worker, or use
backup-v2.6/worker.js in this package. No database rollback is needed.

NOTES
-----
This interface reads previously stored data. It does not recover events that
were never recorded, or events correctly excluded by privacy settings.
Large All Time histories use database pagination to avoid fetching the entire
history into the dashboard at once. The Worker remains protected by Basic Auth.

The included dashboard-demo.html has simulated data generated in local tests;
it does not display your real events. Do not deploy that file.
