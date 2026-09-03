# V4.15.8 — First two soundtrack tracks playback fix

Replace only:

- `js/site-shell.js`

The live GitHub repository currently contains these exact filenames:

- `MusicTracks/Lovely Day, Good As Hell Mashup - Pomplamoose .mp3`
- `MusicTracks/Pain Killers - Rainbow Kitten Surprise.mp3`

The previous player paths did not match those hosted names, so GitHub Pages could not load either file.

This patch:

- points the first two playlist entries at the exact currently-hosted filenames;
- keeps Lovely Day first and Painkillers second;
- includes fallback filename candidates for later filename cleanup;
- leaves Guitar Solo and The Drive Back unchanged;
- leaves the continuous Home / Photography / Music soundtrack shell unchanged.
