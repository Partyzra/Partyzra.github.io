# Partyzra Analytics — Version 2.9 / Visitor Insights

This package was built from the October 27, 2026 uploaded Partyzra repository. The starting Worker is **V2.8.1**, including Recent Activity near the top, Infrastructure Health, Album Insights, and the existing private IP exclusion.

## What changes

- Adds opt-in, random browser IDs to distinguish first observed/returning browser *profiles* across browsing sessions.
- Adds dashboard cards for known browsers, newly recognized browsers, returning browsers, and unlinked sessions, plus expandable session histories.
- Keeps the **Recent Activity** panel immediately under your existing four summary cards.
- Keeps all historic D1 records. Adds one optional `visitor_id` column and one index; **nothing is deleted or overwritten**.
- Adds a discreet privacy prompt and permanent small “Privacy” control in the public site shell. Visitor choice persists in browser local storage.
- Keeps your `EXCLUDED_IPS` Worker secret and IP filtering, D1 binding, dashboard password, and existing `?analytics=off` browser exclusion.
- Does **not** modify gallery images, `photos.js`, image loading, or photo / album event behavior.

## Install in this exact order

**0. Save a backup.** Retain your live `worker.js` and a copy/backup of your D1 database. The package contains the original V2.8.1 Worker. Do not drop, truncate, recreate, or delete the `events` table. Do not put passwords or IPs into GitHub.

**1. Update Cloudflare D1 database before Worker code.**

Cloudflare Dashboard → **D1 SQL Database** → **partyzra-analytics-db** → **Console**. Run the following SQL statements **once** (they also appear in `cloudflare-worker/migrate-v2.9.sql`):

```sql
ALTER TABLE events ADD COLUMN visitor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_events_visitor_created_at
  ON events(visitor_id, created_at) WHERE visitor_id IS NOT NULL;
```

**IMPORTANT:** The `ALTER TABLE` statement is not repeatable; if you already ran it, do not run it again. The second CREATE INDEX is repeatable.

Verify the migration with:

```sql
PRAGMA table_info(events);
SELECT COUNT(*) AS total_events FROM events;
```

The `visitor_id` column should appear and the total event count should match the original value. Historical rows get a NULL `visitor_id` and remain fully available in all existing dashboards.

**2. Update the Cloudflare Worker.**

Cloudflare → Workers & Pages → **partyzra-analytics** → Edit Code → replace `worker.js` with `cloudflare-worker/worker.js` → Deploy. Keep `DB`, `DASHBOARD_PASSWORD`, and `EXCLUDED_IPS` exactly as they are. Visit `/health`, then `/dashboard?range=all` to confirm the Worker and new sections work before publishing the portfolio changes.

**3. Update GitHub Pages.**

Copy **only** the files in the package's `portfolio/` directory to the same paths of `partyzra.github.io`:

```
index.html
photography.html
music.html
home.html
photography-content.html
music-content.html
analytics-privacy.html      (new)
css/site-shell.css
js/site-shell.js
js/analytics.js
```

Commit and push your changes. The existing photographs, `js/photos.js`, and gallery loading scripts remain untouched. Reload the site. The changed script/CSS URLs carry versioned cache query strings.

## How to verify

1. In a **separate browser profile** that is NOT your excluded home IP, visit the live site. You will see a small optional “Remember this browser?” prompt. Click **Allow** (do not use personal-IP test traffic for testing actual D1 writes).
2. Visit the photography page and open a photograph. In DevTools → Network, a `/track` event should contain `visitor_id` beginning with `v1-`. Return in a genuinely new browsing session; the `visitor_id` should be the same while `session_id` changes. (If you restore an existing session, the browser may restore the session ID too.)
3. The D1 console can independently verify: `SELECT substr(visitor_id,1,9) AS browser, COUNT(DISTINCT session_id) AS sessions FROM events WHERE visitor_id IS NOT NULL GROUP BY visitor_id;` Don't paste unredacted identifiers into public places.
4. Check the private dashboard in **All Time** or **Today** under “Behind the visits.” An identifier with at least two distinct sessions is labeled **Returned**.
5. Use the site Privacy control → **Stop recognition** to remove that browser's local ID. Its future events should no longer contain `visitor_id`. Use `?analytics=off` to turn off ALL events for that browser.
6. With `EXCLUDED_IPS`, your personal traffic should still respond `{"ok":true,"excluded":true}` and remain absent from the database.

## Interpretation and limitations

- A *browser* is NOT necessarily a person. Private browsing, cleared storage, switching browsers or devices, and consent refusal can all hide or split repeat visits.
- “Newly recognized” means the browser's first **consented, linked event**, not necessarily its first-ever visit.
- “Returned” means at least two different browser `session_id` values in its **full retained history** and at least one linked event in the selected date range. These groups can overlap with “Newly recognized.”
- “Seen once” means only one linked browsing session *so far*, not a prediction that the person will never come back.
- Browser IDs start collecting only after V2.9 is live and a visitor consents. Past events are **never backfilled or attributed**.
- Existing session-based analytics can still run without returning-browser consent. Persistent browser recognition requires an explicit affirmative choice. Check your site's privacy disclosures and any regional rules applicable to the underlying session analytics too; this is not a blanket legal-compliance guarantee.
- The opt-out revokes future tagging and removes the stored browser ID; previously collected events remain. Handle any legally valid erasure request separately.
- There is no automatic historical-event deletion or retention cutoff in this update.

## Rollback

If needed, restore `backup/worker-v2.8.1.js` to the existing Worker and restore the previous versions of the listed portfolio files from Git history. Leave the new nullable D1 column and index in place: V2.8.1 ignores them, so **rebuilding the database is unnecessary**.

## Local testing

With Node.js supporting `node:sqlite`:

```
node tests/test_worker.cjs
node tests/test_browser.cjs
```

Tests use a simulated, in-memory SQLite D1-compatible schema and synthetic events. They do not contact Cloudflare or modify the live database.
