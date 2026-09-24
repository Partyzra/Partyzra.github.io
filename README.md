# V4.17.23 — All six Film clips autoplay

Replace only:

- `js/portfolio.js`

Changes:
- Hot Box and Abandoned now autoplay, loop, and pause/resume offscreen exactly like the other four Film clips.
- Their old manual click/play behavior is removed at runtime, including the play cue and button semantics.
- No `home.html` replacement is required, so any text/content edits made directly in the homepage are preserved.
- Existing muted/looping/viewport-aware behavior and reduced-motion handling remain intact.
