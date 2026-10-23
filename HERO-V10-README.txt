PARTYZRA HERO V10 — NO POST-DROP JUMP

Replace only:
  css/style.css

FIX
- Removes the separate post-drop animation handoff.
- The dangling rotation now begins at the same time as each phrase starts
  dropping from above.
- When the drop reaches its resting point, nothing new turns on, so there
  should be no second downward shift.
- Removed 3D perspective/yaw from the dangling motion because activating a
  perspective transform can cause a tiny compositing/subpixel jump.
- The hanging motion is now pure, very slow 2D rotation around one invisible
  point above the center of each word.
- The pivot is closer to the word, which keeps the tilt natural but avoids
  an obvious vertical arc.
- The loop begins and ends at exactly rotate(0deg), so it is seamless.
- Steel, gold shimmer, fiery red pulse, spacing, slow drop/fade, and curated
  hero-photo behavior remain unchanged.
