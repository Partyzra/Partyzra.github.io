PARTYZRA MUSIC PERSISTENCE V2.8

Why the previous version could fail:
The Play button lives inside music-content.html (an iframe), while the persistent
<audio> element lived in the outer shell. Browsers can reject scripted audio
playback when the user gesture and media element are in different browsing
contexts, making the Music-page button look inert.

What changed:
1. All Alone and Lemon Bundt now start from their own <audio> elements directly
   inside music-content.html, in the same document as the user's Play click.
2. Once the Music page has been created, its iframe is kept mounted when the
   visitor navigates to Home or Photography. It is hidden rather than destroyed,
   so the playing song continues without restarting.
3. The compact player shown on Home / Photography proxies the exact same hidden
   Music-page player. Returning to Music reveals the original player at the same
   playback position.
4. No global player is shown before the visitor explicitly starts a song on the
   Music page.

Files changed:
- js/site-shell.js
- js/music-persistence.js
- css/site-shell.css
- index.html
- music.html
- photography.html
- music-content.html

Your MusicTracks files do not need to be renamed or modified.
