PARTYZRA PHOTOGRAPHY — LATEST ALBUM V7

Replace:
  photography-content.html
  js/photography-page.js

photography.html is included unchanged from the prior deep-link patch for continuity.

NEW:
- Adds a virtual album/tab named "Latest" immediately after "All".
- Latest always contains the entire photo archive.
- All keeps its existing randomized-on-page-load behavior.
- Normal named albums keep their existing behavior.
- Latest is sorted newest first.

DATE BEHAVIOR:
The current photos.js manifest does not contain a true per-photo creation date.
Latest therefore supports these fields whenever they exist:
  "created"
  "createdAt"
  "date"
  "dateCreated"
  "dateTaken"

Recommended format:
  "created": "2026-10-24"

If a photo has a valid date, Latest sorts it by that date, newest first.
Photos without a date are still included; they fall back to newest-added-to-
photos.js first (reverse manifest position).

Example:
{
  "file": "Seagulls.jpg",
  "title": "Mishi & Susan",
  "slug": "seagulls",
  "created": "2026-10-20",
  ...
}

No photos.js change is required for the tab itself to appear.
The script cache version is bumped to 2.9.4.
