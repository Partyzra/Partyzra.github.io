Mobile viewer navigation refinement

Changes in this build:
- Previous/Next controls sit in a dedicated row above the frame/variant selector on mobile.
- Frame selectors are no longer fixed-position, preventing overlap with navigation arrows.
- "Loading detail" is displayed in the top viewer bar, outside the photograph.
- Reused viewer image layers are not revealed until their newly assigned thumbnail is loaded/decoded.
  This prevents stale pixels from recently viewed images flashing during navigation.
- A short navigation lock/one-step queue prevents rapid taps from racing image-layer swaps.
- Full-resolution detail continues loading in the background and does not block normal navigation.
