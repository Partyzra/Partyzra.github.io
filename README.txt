PARTYZRA ANALYTICS V2.3 — PRIVACY + PERFORMANCE
================================================

CHANGES
- Uses low-priority scheduled sending for analytics, after the browser gets
  time to render page contents and photographs.
- On tab hiding or navigation, sends pending events using the existing
  non-blocking keepalive request.
- Adds a per-browser, persistent opt-out for your own visits and photo opens.
- Does not store or use IP addresses, MAC addresses, names or fingerprints.
- Leaves Cloudflare Worker V2.2, D1 database, dashboard, and passwords alone.

INSTALL (only one file)
1. Back up your existing Github repo's js/analytics.js.
2. Replace js/analytics.js with the copy in this zip.
3. Commit and push the replacement to GitHub Pages using GitHub Desktop.
4. After GitHub Pages publishes, open the public site and refresh once.

TURN OFF TRACKING IN YOUR CURRENT BROWSER
   https://partyzra.github.io/?analytics=off
Open that URL once in the browser/profile you use to review the portfolio.
It saves a preference in localStorage for the origin partyzra.github.io.
It persists across site pages, refreshes and future visits (until browser
site data is cleared). It does not apply to other browsers/devices/profiles,
so repeat there if needed. Incognito/private windows have separate storage.

TURN TRACKING BACK ON IN YOUR CURRENT BROWSER
   https://partyzra.github.io/?analytics=on

VERIFY YOUR OWN BROWSER IS EXCLUDED
1. Open the opt-out link once.
2. Press F12 in Chrome, choose Application -> Local storage ->
   https://partyzra.github.io. Confirm key
   partyzra_analytics_opt_out has value 1.
3. Optionally use the Network panel, filter for /track, then click photos.
   You should see no outgoing /track requests after opting out.
   Make sure you are on the newly published version of analytics.js.

IMPORTANT NOTES
- This is not IP/MAC filtering. A browser cannot read the device's MAC
  address. IP-based filtering is less robust when your IP changes and can
  wrongly hide visits from other people sharing the same IP.
- All existing analytics remain in the database; only future activity in
  opted-out browsers is excluded.
- Photo/network performance depends heavily on image sizes, caches, Wi-Fi,
  and available bandwidth. Delaying analytics is a preventative optimization,
  not a guarantee that photo loading issues are caused by analytics.
- No changes needed to: cloudflare-worker/worker.js, schema.sql,
  js/analytics-config.js, photography-page.js, photos.js, or image assets.

ROLLBACK
Restore your previous js/analytics.js in the GitHub repo and push it.
