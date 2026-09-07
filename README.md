# V4.17.8 — True Click-Focus Native Viewer

Replace only:

- `js/photography-page.js`
- `css/photography.css`

## Fix

The V4.17.7 focal-point math was correct, but the enlarged full-resolution image was still a normal CSS-grid item. When its real width/height increased for native-resolution viewing, the oversized image could enlarge the grid track and move the visual image center. That made a correct click coordinate appear to zoom above the clicked point.

V4.17.8 removes the viewer image from grid sizing with absolute positioning and anchors it to the exact usable-stage center. The image can now grow to high-resolution inspection size without moving that center.

Result:
- clicked point is the actual zoom focal point
- high-resolution/native rendering is preserved
- drag/pan reaches every legal edge of the enlarged photograph
- fit-to-screen view, variants, arrows, pinch zoom, and albums are unchanged
