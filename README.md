# V4.12.6 — Remove Film divider band

Replace:
- `css/style.css`

The dark horizontal strip above the aerial video was caused by the first child's top margin collapsing outside `.film-section`, exposing the darker page/body background.

This update contains that margin inside the Film section, so the normal Film background now fills the spacing above the video. The spacing itself remains; only the unintended darker divider band is removed.
