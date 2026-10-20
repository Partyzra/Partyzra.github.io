PARTYZRA V2.5 — SPEED FIRST + SERVER-SIDE IP EXCLUSION
====================================================

Built against the working V2.4 portfolio files and the working V2.2
Cloudflare Worker. Does NOT replace your images or D1 database.

CHANGES
-------
• Phone/touch-tablet gallery viewer uses lightweight existing WebP thumbs.
  Desktop/laptop viewer still opens full camera-resolution originals.
• No speculative mobile full-resolution preloads.
• Desktop viewer preloads only +/- 1 neighboring original, no variants.
• Preload JS cache holds at most six Image objects rather than indefinitely.
• Home slideshow uses WebP thumbnails only; no huge fallback originals.
• Missing home thumbnails have a bounded retry count.
• Film video loads start nearer the screen as you scroll.
• Cloudflare Worker can exclude IP(s) BEFORE any D1 INSERT.

PART A: PORTFOLIO (DO THIS FIRST, TEST SPEED)
---------------------------------------------
Back up your GitHub repository or make a new branch/commit before copying.
Copy these FOUR files to the matching locations in your EXISTING repository:

  portfolio/home.html                 -> home.html
  portfolio/photography-content.html  -> photography-content.html
  portfolio/js/portfolio.js           -> js/portfolio.js
  portfolio/js/photography-page.js    -> js/photography-page.js

IMPORTANT: Only replace these four files. Keep all other site files,
including existing js/analytics.js (V2.4), js/site-shell.js, thumbnails,
images, CSS, music, and videos exactly as they are.

Commit and Push origin using GitHub Desktop. After GitHub Pages publishes,
close old site tabs and hard-refresh (Ctrl+Shift+R) to fetch the new JS.
Test Home, All album, a mobile fullscreen photo, and desktop fullscreen.
On phone the fullscreen photo is less detailed when deeply zoomed; this is
an intentional tradeoff for speed. Photos without working WebP thumbnails
still need their thumbnails regenerated to display on phone.

PART B: WORKER (INDEPENDENT OF PART A)
-------------------------------------
1) Save/back up your live Cloudflare worker.js before editing.
2) Open Workers & Pages > partyzra-analytics > Edit Code.
3) Replace worker.js with cloudflare-worker/worker.js and Deploy.
4) In that SAME Worker's Settings > Variables and Secrets add a SECRET:
      Name: EXCLUDED_IPS
      Value: your own public IPv4 and, if used, IPv6 addresses
   Separate multiple addresses with commas. Do NOT type them in GitHub.
5) Save/deploy the secret setting if Cloudflare requests it.
6) Keep existing DB binding and DASHBOARD_PASSWORD secret untouched.

To find your public IP privately, use your browser to open a reputable
'what is my IP' site. Do NOT send the address to anyone or paste it here.
If the site shows separate IPv4 and IPv6 addresses, include BOTH.
If you use a VPN or your ISP changes your IP, update EXCLUDED_IPS.
Everyone sharing an excluded public IP (e.g. home Wi-Fi) is also excluded.

VERIFY IP EXCLUSION
-------------------
• From home Wi-Fi, load the site and open images.
• Developer Tools > Network > track: requests may still appear, since the
  browser is unaware of your IP; the server accepts them WITHOUT a D1 write.
• Request response for excluded IP: {"ok":true,"excluded":true} (202).
  A standard tracked request responds {"ok":true} (202).
• Dashboard counts should stay unchanged for your actions, but other live
  visitors could simultaneously change counts.
• Disable your existing personal-browser tracking separately if desired with
  https://partyzra.github.io/?analytics=off (suppresses requests entirely).

PRIVACY
-------
Excluded IPs are compared to CF-Connecting-IP in the Worker during each
incoming event, without writing an IP to D1 or returning the address.
GitHub Pages and Cloudflare may separately process network-level IP data.
Previously stored events are not automatically deleted; the D1 schema has
no IP column to identify your historical events reliably.

ROLLBACK
--------
• Portfolio: restore the preceding commit's four files and push.
• Worker: restore your saved previous Worker code. The D1 database stays.
• Removing EXCLUDED_IPS switches off IP filtering (no schema change).

LIMITATIONS
-----------
The uploaded portfolio source did NOT include the Images/ and video/ assets.
We cannot verify thumbnail coverage/file sizes or live network timings.
This release reduces known expensive request paths, but may not resolve
all delays if files are missing, oversized, miscached, or host/network bound.
If slowness persists: Chrome DevTools > Network > Disable cache, sort by
Size and Time, export HAR with sensitive data removed or send a screenshot.
