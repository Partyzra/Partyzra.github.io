PARTYZRA MUSIC ARTWORK OPTIMIZATION

WHAT THIS DOES
--------------
Creates smaller WebP copies of the two artwork images used on the Music page.
Your originals remain unchanged.

SOURCE FILES
------------
MusicTracks/Album Artwork.png
MusicTracks/Lemon Bundt.jpg

OUTPUT FILES
------------
MusicTracks/Album-Artwork-web.webp
MusicTracks/Lemon-Bundt-web.webp

HOW TO USE
----------
1. Put build-music-artwork-assets.bat in your repo root.
2. Make sure the MusicTracks folder contains the two original artwork files.
3. Double-click build-music-artwork-assets.bat.
4. Commit the two new .webp files to GitHub.
5. Replace music-content.html and css/style.css with the versions in this patch.

NOTES
-----
- The Music page now references the lightweight WebP files.
- The displayed artwork is also slightly smaller on desktop/tablet/mobile.
- Images now use eager loading + async decoding because they are immediately visible on the Music page.
