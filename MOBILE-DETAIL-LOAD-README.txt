MOBILE DETAIL LOADING UPDATE
============================

This version keeps the sharp thumbnail-first viewer and improves the transition
to the original full-resolution photograph on phones.

Changes:
- The exact photograph touched by the visitor is promoted to high-priority loading.
- After mobile scrolling pauses, at most two likely photographs can be warmed in
  advance. Save-Data and 2G/slow-2G connections skip this behavior.
- Previous/next speculative full-resolution loads remain low priority and do not
  start until the current detail image is ready.
- The "Loading detail" badge now tracks the upper-right corner of the displayed
  photograph and no longer sits near the alternate-frame controls.
- The thumbnail preview remains completely unblurred.

Important limitation:
The final detail speed is still bounded by the byte size and decode cost of the
original files in Images/photo-full/. No JavaScript-only change can make a very
large camera-resolution original download like a small web image. A future
optional display-resolution tier would provide the largest additional speedup.
