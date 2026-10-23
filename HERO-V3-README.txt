PARTYZRA HERO V3 — WIDER COMPOSITION + OPTIONAL CURATION

Replace:
  home.html
  css/style.css
  js/portfolio.js

WHAT CHANGED
- Observe stays furthest left.
- Listen moves substantially farther right.
- Reminisce moves farther right again.
- Vertical spacing is increased so the three ideas occupy more of the hero.
- Existing slow text fades remain unchanged.
- Existing moving/crossfading background behavior remains unchanged.

OPTIONAL CURATED HERO PHOTOS
The homepage still rotates through ALL photos by default.

To curate it, open js/photos.js and add:
  "hero": true,

to any photo entry you want included on the homepage.

Example:

{
  "file": "Sunset.jpg",
  "title": "Sunset",
  "album": "Landscapes",
  "hero": true
}

As soon as one or more photos have hero:true, the homepage automatically
uses ONLY those marked photographs for its background rotation.

Remove all hero:true flags and it automatically returns to the full archive.

This does not create a new gallery album and does not change where the photo
appears in Photography.
