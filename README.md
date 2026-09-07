# V4.17.9 — Manual bottom-row Film videos

Replace only:

- `home.html`
- `js/portfolio.js`
- `css/style.css`

Changes:

- Forest, Horses, Deer, and Snow keep the existing silent viewport autoplay behavior.
- Hot Box (bottom-left) and Abandoned (bottom-right) now start paused and never autoplay before a visitor explicitly clicks/taps them.
- Clicking/tapping either manual clip toggles play/pause. Enter/Space also works when focused.
- A subtle centered play cue appears while a manual clip is paused and disappears while it is playing.
- Manual clips still pause when well offscreen. If the visitor had them playing, they resume when brought back near the viewport; if the visitor manually paused them, they stay paused.
- No Photography files or photo metadata are changed.
