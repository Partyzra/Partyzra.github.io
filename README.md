# V4.15.7 — Lovely Day playback fix

Replace only:

- `js/site-shell.js`

What changed:

- `Lovely Day, Good As Hell` remains track 1.
- The player now URL-encodes media filenames safely for hosted playback.
- The Lovely Day track includes case-sensitive filename fallbacks for `As/as` and `.mp3/.MP3`.
- If the first Lovely Day path fails, Play automatically tries the next candidate.
- Playlist order remains: Lovely Day → Painkillers → Unknown Guitar Track → The Drive Back.
- Continuous playback between Home, Photography and Music is unchanged.

The preferred/canonical file location is:

`MusicTracks/Lovely Day, Good As Hell - Pomplamoose.mp3`
