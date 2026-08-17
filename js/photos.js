// Photography manifest for GitHub Pages.
// Add a new entry here whenever you add a photo to Images/photo-full/.
const PORTFOLIO_PHOTOS = [
  { file: 'Abandoned.JPG', caption: 'Abandoned' },
  { file: 'Andrew.JPG', caption: 'Andrew' },
  { file: 'Barn.jpg', caption: 'Barn' },
  { file: 'Barnstreet.jpg', caption: 'Barnstreet' },
  { file: 'Cannibal.jpg', caption: 'Cannibal' },
  { file: 'Carts.jpg', caption: 'Carts' },
  { file: 'Clock Tower.jpg', caption: 'Clock Tower' },
  { file: 'Dad.jpg', caption: 'Dad' },
  { file: 'Derick & Tori.JPG', caption: 'Derick & Tori' },
  { file: 'Derick and Tori.JPG', caption: 'Derick and Tori' },
  { file: 'Flowers.JPG', caption: 'Flowers' },
  { file: 'Fox.jpg', caption: 'Fox' },
  { file: 'Gargoyle.jpg', caption: 'Gargoyle' },
  { file: 'Grasshopper.jpg', caption: 'Grasshopper' },
  { file: 'Helmets.JPG', caption: 'Helmets' },
  { file: 'In The Rain.jpg', caption: 'In The Rain' },
  { file: 'Justin.jpg', caption: 'Justin' },
  { file: 'Lily.jpg', caption: 'Lily' },
  { file: 'Lily2.jpg', caption: 'Lily2' },
  { file: 'Lily3.jpg', caption: 'Lily3' },
  { file: 'Mountain.jpg', caption: 'Mountain' },
  { file: 'Night Sky.jpg', caption: 'Night Sky' },
  { file: 'Open Mouth.jpg', caption: 'Open Mouth' },
  { file: 'Peace.jpg', caption: 'Peace' },
  { file: 'Peacock.jpg', caption: 'Peacock' },
  { file: 'Performance.jpg', caption: 'Performance' },
  { file: 'Phoebe.jpg', caption: 'Phoebe' },
  { file: 'Printing Press3.jpg', caption: 'Printing Press3' },
  { file: 'Samurai.jpg', caption: 'Samurai' },
  { file: 'Seagull.jpg', caption: 'Seagull' },
  { file: 'Sean.JPG', caption: 'Sean' },
  { file: 'Sun Kitty.jpg', caption: 'Sun Kitty' },
  { file: 'Sunset.jpg', caption: 'Sunset' },
  { file: 'The Rocket.jpg', caption: 'The Rocket' },
  { file: 'Weed.JPG', caption: 'Weed' },
  { file: 'Zeboy!.jpg', caption: 'Zeboy!' },

];

(function renderPhotographyGallery() {
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;

  const basePath = 'Images/photo-full/';
  const fragment = document.createDocumentFragment();

  PORTFOLIO_PHOTOS.forEach((photo, index) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery-item';

    const button = document.createElement('button');
    button.className = 'gallery-button';
    button.type = 'button';
    button.dataset.full = basePath + photo.file;
    button.dataset.caption = photo.caption;

    const img = document.createElement('img');
    img.src = basePath + photo.file;
    img.alt = photo.caption;
    img.loading = index < 3 ? 'eager' : 'lazy';
    img.decoding = 'async';

    button.appendChild(img);
    figure.appendChild(button);
    fragment.appendChild(figure);
  });

  gallery.appendChild(fragment);
})();
