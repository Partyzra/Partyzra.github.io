// ============================================================
// PARTYZRA PHOTOGRAPHY MANIFEST
// ============================================================
// Add a new entry here whenever you add a photograph to:
//
// Images/photo-full/
//
// IMPORTANT:
// GitHub Pages filenames are case-sensitive.
// "Photo.JPG" and "Photo.jpg" are different files.
// ============================================================

const PORTFOLIO_PHOTOS = [
  { file: 'Abandoned.JPG', caption: 'Abandoned' },
  { file: 'Abandoned1.jpg', caption: 'Abandoned I' },
  { file: 'Abandoned2.jpg', caption: 'Abandoned II' },

  { file: 'Andrew.JPG', caption: 'Andrew' },

  { file: 'Barn.jpg', caption: 'Barn' },
  { file: 'Barnstreet.jpg', caption: 'Barn Street' },

  { file: 'Cannibal.jpg', caption: 'Cannibal' },
  { file: 'Carts.jpg', caption: 'Carts' },
  { file: 'Clock Tower.jpg', caption: 'Clock Tower' },
  { file: 'Contrast.jpg', caption: 'Contrast' },
  { file: 'Cornfield.jpg', caption: 'Cornfield' },
  { file: 'Cow Charging.jpg', caption: 'Cow Charging' },
  { file: 'Creepy Derick.jpg', caption: 'Creepy Derick' },

  { file: 'Dad.jpg', caption: 'Dad' },

  { file: 'Derick & Tori.JPG', caption: 'Derick & Tori' },
  { file: 'Derick.jpg', caption: 'Derick' },
  { file: 'Derick2.jpg', caption: 'Derick II' },
  { file: 'Derick3.jpg', caption: 'Derick III' },

  { file: 'Dori is Wednesday.jpg', caption: 'Dori is Wednesday' },
  { file: 'Dori.jpg', caption: 'Dori' },

  { file: 'Fence.jpg', caption: 'Fence' },
  { file: 'Field.jpg', caption: 'Field' },

  { file: 'Flowers.JPG', caption: 'Flowers' },

  { file: 'Fox.jpg', caption: 'Fox' },
  { file: 'Friends.jpg', caption: 'Friends' },

  { file: 'Gargoyle.jpg', caption: 'Gargoyle' },

  { file: 'Grasshopper.jpg', caption: 'Grasshopper' },
  { file: 'Grasshopper.png', caption: 'Grasshopper' },

  { file: 'Hawaii Beach.jpg', caption: 'Hawaii Beach' },
  { file: 'Hawaii Couple.jpg', caption: 'Hawaii Couple' },
  { file: 'Hawaii Girl.jpg', caption: 'Hawaii Girl' },
  { file: 'Hawaii Mountain.jpg', caption: 'Hawaii Mountain' },
  { file: 'Hawaii Water Crash.jpg', caption: 'Hawaii Water Crash' },

  { file: 'Helmets.JPG', caption: 'Helmets' },
  { file: 'Helmets.jpg', caption: 'Helmets' },

  { file: 'Horses.jpg', caption: 'Horses' },

  { file: 'In The Rain.jpg', caption: 'In The Rain' },

  { file: 'Justin.jpg', caption: 'Justin' },

  { file: 'Lily.jpg', caption: 'Lily' },
  { file: 'Lily2.jpg', caption: 'Lily II' },
  { file: 'Lily3.jpg', caption: 'Lily III' },

  { file: 'Me.jpg', caption: 'Me' },

  { file: 'Mountain.jpg', caption: 'Mountain' },

  { file: 'My Father.jpg', caption: 'My Father' },
  { file: 'My Father2.jpg', caption: 'My Father II' },
  { file: 'My Father3.jpg', caption: 'My Father III' },
  { file: 'My Mother.jpg', caption: 'My Mother' },

  { file: 'Night Car.jpg', caption: 'Night Car' },
  { file: 'Night Sky.jpg', caption: 'Night Sky' },

  { file: 'Open Mouth.jpg', caption: 'Open Mouth' },

  { file: 'Peace.jpg', caption: 'Peace' },
  { file: 'Peacock.jpg', caption: 'Peacock' },
  { file: 'Performance.jpg', caption: 'Performance' },
  { file: 'Phoebe.jpg', caption: 'Phoebe' },
  { file: 'Possey.jpg', caption: 'Possey' },

  { file: 'Printing Press3.jpg', caption: 'Printing Press' },

  { file: 'Rattlesnake Rapids.jpg', caption: 'Rattlesnake Rapids' },

  { file: 'Samurai.jpg', caption: 'Samurai' },
  { file: 'Seagull.jpg', caption: 'Seagull' },
  { file: 'Sean.JPG', caption: 'Sean' },

  { file: 'Sun Kitty.jpg', caption: 'Sun Kitty' },
  { file: 'Sunset.jpg', caption: 'Sunset' },

  { file: 'The Rocket.jpg', caption: 'The Rocket' },

  { file: 'Weed.JPG', caption: 'Weed' },
  { file: 'Weed.jpg', caption: 'Weed' },

  { file: 'Zeboy!.jpg', caption: 'Zeboy!' }
];


// ============================================================
// GALLERY RENDERER
// ============================================================

(function renderPhotographyGallery() {
  const gallery = document.querySelector('[data-gallery]');

  if (!gallery) return;

  const basePath = 'Images/photo-full/';
  const fragment = document.createDocumentFragment();

  // Prevent duplicate rendering if this script is ever loaded twice.
  gallery.innerHTML = '';

  PORTFOLIO_PHOTOS.forEach((photo, index) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery-item';
    figure.dataset.reveal = '';

    // --------------------------------------------------------
    // Gallery button
    // --------------------------------------------------------

    const button = document.createElement('button');

    button.className = 'gallery-button';
    button.type = 'button';

    button.dataset.full = `${basePath}${photo.file}`;
    button.dataset.caption = photo.caption;

    button.setAttribute(
      'aria-label',
      `Open photograph ${index + 1}: ${photo.caption}`
    );


    // --------------------------------------------------------
    // Image
    // --------------------------------------------------------

    const img = document.createElement('img');

    img.src = `${basePath}${photo.file}`;
    img.alt = photo.caption;

    // Load the first few photographs immediately.
    // Everything else waits until the visitor approaches it.
    img.loading = index < 4 ? 'eager' : 'lazy';

    img.decoding = 'async';


    // --------------------------------------------------------
    // Overlay
    // --------------------------------------------------------

    const overlay = document.createElement('span');
    overlay.className = 'gallery-overlay';

    const number = document.createElement('span');
    number.className = 'gallery-index';
    number.textContent = String(index + 1).padStart(2, '0');

    const caption = document.createElement('span');
    caption.className = 'gallery-caption';
    caption.textContent = photo.caption;

    const openIcon = document.createElement('span');
    openIcon.className = 'gallery-open';
    openIcon.setAttribute('aria-hidden', 'true');
    openIcon.textContent = '↗';

    overlay.append(number, caption, openIcon);


    // --------------------------------------------------------
    // Assemble photograph
    // --------------------------------------------------------

    button.append(img, overlay);
    figure.appendChild(button);
    fragment.appendChild(figure);
  });

  gallery.appendChild(fragment);
})();