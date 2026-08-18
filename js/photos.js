// Photography manifest for GitHub Pages.
// Add a new entry here whenever you add a photo to Images/photo-full/.
const PORTFOLIO_PHOTOS = [
  { file: 'Abandoned.JPG', caption: 'Abandoned' },
  { file: 'Abandoned1.jpg', caption: 'Abandoned1' },
{ file: 'Abandoned2.jpg', caption: 'Abandoned2' },
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
  { file: 'Lily2.jpg', caption: 'Lily II' },
  { file: 'Lily3.jpg', caption: 'Lily III' },
  { file: 'Mountain.jpg', caption: 'Mountain' },
  { file: 'Night Sky.jpg', caption: 'Night Sky' },
  { file: 'Open Mouth.jpg', caption: 'Open Mouth' },
  { file: 'Peace.jpg', caption: 'Peace' },
  { file: 'Peacock.jpg', caption: 'Peacock' },
  { file: 'Performance.jpg', caption: 'Performance' },
  { file: 'Phoebe.jpg', caption: 'Phoebe' },
  { file: 'Printing Press3.jpg', caption: 'Printing Press' },
  { file: 'Samurai.jpg', caption: 'Samurai' },
  { file: 'Seagull.jpg', caption: 'Seagull' },
  { file: 'Sean.JPG', caption: 'Sean' },
  { file: 'Sun Kitty.jpg', caption: 'Sun Kitty' },
  { file: 'Sunset.jpg', caption: 'Sunset' },
  { file: 'The Rocket.jpg', caption: 'The Rocket' },
  { file: 'Weed.JPG', caption: 'Weed' },
  { file: 'Zeboy!.jpg', caption: 'Zeboy!' },
{ file: 'Contrast.jpg', caption: 'Contrast' },
{ file: 'Cornfield.jpg', caption: 'Cornfield' },
{ file: 'Cow Charging.jpg', caption: 'Cow Charging' },
{ file: 'Creepy Derick.jpg', caption: 'Creepy Derick' },
{ file: 'Derick.jpg', caption: 'Derick' },
{ file: 'Derick2.jpg', caption: 'Derick2' },
{ file: 'Derick3.jpg', caption: 'Derick3' },
{ file: 'Dori is Wednesday.jpg', caption: 'Dori is Wednesday' },
{ file: 'Dori.jpg', caption: 'Dori' },
{ file: 'Fence.jpg', caption: 'Fence' },
{ file: 'Field.jpg', caption: 'Field' },
{ file: 'Flowers.jpg', caption: 'Flowers' },
{ file: 'Friends.jpg', caption: 'Friends' },
{ file: 'Friends.jpg', caption: 'Friends' },
{ file: 'Gargoyle.jpg', caption: 'Gargoyle' },
{ file: 'Grasshopper.png', caption: 'Grasshopper.png' },
{ file: 'Hawaii Beach.jpg', caption: 'Hawaii Beach' },
{ file: 'Hawaii Couple.jpg', caption: 'Hawaii Couple' },
{ file: 'Hawaii Girl.jpg', caption: 'Hawaii Girl' },
{ file: 'Hawaii Mountain.jpg', caption: 'Hawaii Mountain' },
{ file: 'Hawaii Water Crash.jpg',caption: 'Hawaii Water Crash'},
{ file: 'Helmets.jpg', caption: 'Helmets' },
{ file: 'Horses.jpg', caption: 'Horses' },
{ file: 'In The Rain.jpg', caption: 'In The Rain' },
{ file: 'Justin.jpg', caption: 'Justin' },
{ file: 'Lily.jpg', caption: 'Lily' },
{ file: 'Lily2.jpg', caption: 'Lily2' },
{ file: 'Me.jpg', caption: 'Me' },
{ file: 'My Father.jpg', caption: 'My Father' },
{ file: 'My Father2.jpg', caption: 'My Father2' },
{ file: 'My Father3.jpg', caption: 'My Father3' },
{ file: 'My Mother.jpg', caption: 'My Mother' },
{ file: 'Night Car.jpg', caption: 'Night Car' },
{ file: 'Night Sky.jpg', caption: 'Night Sky' },
{ file: 'Open Mouth.jpg', caption: 'Open Mouth' },
{ file: 'Peace.jpg', caption: 'Peace' },
{ file: 'Peacock.jpg', caption: 'Peacock' },
{ file: 'Possey.jpg', caption: 'Possey' },
{ file: 'Printing Press3.jpg', caption: 'Printing Press3' },
{ file: 'Rattlesnake Rapids.jpg', caption: 'Rattlesnake Rapids' },
{ file: 'Weed.jpg', caption: 'Weed' },









Performance
Phoebe




Seagull
Sean
Sun Kitty
Sunflowers
Sunset
The Rocket
Weed
Zeboy!
];

(function renderPhotographyGallery() {
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;

  const basePath = 'Images/photo-full/';
  const fragment = document.createDocumentFragment();

  PORTFOLIO_PHOTOS.forEach((photo, index) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery-item';
    figure.dataset.reveal = '';

    const button = document.createElement('button');
    button.className = 'gallery-button';
    button.type = 'button';
    button.dataset.full = basePath + photo.file;
    button.dataset.caption = photo.caption;
    button.setAttribute('aria-label', `Open photograph ${index + 1}: ${photo.caption}`);

    const img = document.createElement('img');
    img.src = basePath + photo.file;
    img.alt = photo.caption;
    img.loading = index < 4 ? 'eager' : 'lazy';
    img.decoding = 'async';

    const overlay = document.createElement('span');
    overlay.className = 'gallery-overlay';
    overlay.innerHTML = `<span class="gallery-index">${String(index + 1).padStart(2, '0')}</span><span class="gallery-caption">${photo.caption}</span><span class="gallery-open">↗</span>`;

    button.append(img, overlay);
    figure.appendChild(button);
    fragment.appendChild(figure);
  });

  gallery.appendChild(fragment);
})();
