PARTYZRA — PROJECT 2A + 2B
=========================

PROJECT 2A — COPYRIGHT / IMAGE USE
----------------------------------
Changed:
- home.html
- photography-content.html
- music-content.html
- css/style.css
- NEW: image-use.html

Visible change:
A small footer item: © [year] Ryan · Image use

The Image Use page is intentionally restrained. It says direct links are welcome,
but asks visitors to request permission before reproducing/reposting/publishing/
printing/distributing/modifying original work.

Easy rollback:
Remove the footer-left element from the three content pages and delete image-use.html.
No gallery, music, photo-sharing, analytics tracking, or media-protection behavior was changed.

PROJECT 2B — INFRASTRUCTURE HEALTH
----------------------------------
Changed:
- cloudflare-worker/worker.js

Dashboard version: 2.8
No D1 schema change is required.
No Cloudflare API token is required.

The new Infrastructure Health section reports:
- Worker operational state
- Live D1 SELECT probe + duration
- D1 database size when reported by D1 meta
- Last analytics event
- All-time stored event count
- Events in the last hour / 24 hours
- D1 execution region when reported
- Dashboard authentication configured
- Tracking origin lock configured
- Owner-IP exclusion configured
- Maximum accepted analytics payload

The dashboard remains protected by the existing Basic Auth requirement.
The public /health endpoint remains minimal and unchanged.

Optional later enhancement:
Cloudflare account-level Worker request counts, runtime errors, CPU quantiles and
related observability can be added through Cloudflare's GraphQL Analytics API.
That should use a restricted API token stored as a Worker secret, never in GitHub.
