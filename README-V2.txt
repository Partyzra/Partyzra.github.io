PARTYZRA ANALYTICS — V2.0 DASHBOARD UPDATE
===========================================

THIS IS AN INCREMENTAL UPDATE, NOT A REBUILD.

WHAT CHANGES
- Polished dark/minimal dashboard themed to Partyzra (black, warm cream, muted gold)
- Date selectors: Today, 7 Days, 30 Days, All Time
- Correct America/Denver timezone display (MST/MDT; DST-aware)
- Hourly, daily, and monthly (or longer period) traffic charts
- Page and photograph views distinguished within each chart bar
- Anonymous sessions, page views, photograph opens, pageviews/session,
  and photo-engaged sessions for each selected period
- Filtered Pages, Top Photographs, Recent Activity, and Traffic Sources
- Refreshed privacy and data metric explanations

WHAT DOES NOT CHANGE
- Worker URL: https://partyzra-analytics.12rparker.workers.dev
- /track endpoint or accepted event payloads
- /health endpoint
- D1 database, events table, indexes, or previously collected events
- Portfolio files on GitHub Pages
- Existing Basic Auth login or secret names
- Data collection privacy policy

FILES
- cloudflare-worker/worker.js = complete replacement Worker source
- dashboard-v2-demo-preview.html = static illustration with fake sample data

INSTALLATION (CLOUDFLARE DASHBOARD)
1. Go to Cloudflare Dashboard > Workers & Pages > partyzra-analytics.
2. Open Edit Code for the EXISTING Worker.
3. As a precaution, keep a copy of the current working Worker code.
4. Replace the existing Worker source with the complete contents of
   cloudflare-worker/worker.js, then Deploy.
5. Leave the existing D1 binding DB in place. Do not re-create the database,
   run a schema migration, or delete the events table.
6. Leave DASHBOARD_PASSWORD as the existing secret. Do NOT put the password
   in any source code or on GitHub. Your username is still admin by default.
7. Do not update or re-deploy the portfolio: its tracking code is unchanged.

VERIFICATION
1. Open .../health and ensure it still returns ok: true.
2. Open .../dashboard and log in using the same username/password.
3. Use each filter: Today / 7 Days / 30 Days / All Time.
4. Open a photograph on the live portfolio. Refresh the dashboard to see
   the new event appear in the relevant period.
5. Check /dashboard?range=today after Mountain midnight: the numbers should
   roll over at midnight in Denver, not at 00:00 UTC.
6. In case of deployment errors, restore the saved previous Worker code or
   roll back to the previously working deployment from Cloudflare.

IMPORTANT METRIC NOTES
- Today, 7 Days, 30 Days use *Mountain local calendar days*. For example,
  7 Days means today and the six preceding local dates.
- D1 continues to store UTC timestamps. Only dashboard display / date
  window queries use Mountain Time (including daylight saving transitions).
- All Time counts all records, with longer-range chart grouping.
- Sessions count anonymous, sessionStorage-based session IDs observed in
  the selected period. They do not count unique people.
- Alternate photo files are already logged as independent photo views.
- A pageview/session average isn't a bounce rate or time-on-site metric.
- Traffic sources depend on referrers transmitted by visitors' browsers;
  some browsers intentionally omit these details.
- Contact conversions, album views, video plays, and device breakdowns
  need additional, privacy-conscious event tracking later. They aren't
  inferred from data that was not collected.

NEXT POSSIBLE VERSION
Add deliberate custom events for film playback, photo-album selections,
and contact conversions, while avoiding personal contact form contents.
