(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  // ----------------------------------------------------------
  // Shared page chrome (kept local to Photography so the older
  // site-wide lightbox code cannot interfere with this viewer).
  // ----------------------------------------------------------

  const header = qs('[data-site-header]');
  const navToggle = qs('[data-nav-toggle]');
  const siteNav = qs('[data-site-nav]');

  const syncHeader = () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 18);
  };

  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
    });

    qsa('a', siteNav).forEach(link => link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    }));
  }

  qsa('.site-footer [data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // ----------------------------------------------------------
  // Photography soundtrack — manual two-track player
  // ----------------------------------------------------------

  const soundtrack = qs('[data-photo-soundtrack]');
  const soundtrackToggle = qs('[data-soundtrack-toggle]');
  const soundtrackNext = qs('[data-soundtrack-next]');
  const soundtrackIcon = qs('[data-soundtrack-icon]');
  const soundtrackStatus = qs('[data-soundtrack-status]');
  const soundtrackTitle = qs('[data-soundtrack-title]');

  if (soundtrack && soundtrackToggle) {
    const targetVolume = 0.42;
    const soundtrackTracks = [
      {
        src: 'assets/audio/the-drive-back-tom-anello.mp3',
        title: 'The Drive Back — Tom Anello'
      },
      {
        src: 'MusicTracks/Guitar Solo.wav',
        title: 'Guitar Solo'
      }
    ];

    let currentTrackIndex = 0;
    let fadeFrame = null;
    let changingTrack = false;

    const currentTrack = () => soundtrackTracks[currentTrackIndex];

    const setTrackTitle = () => {
      if (soundtrackTitle) soundtrackTitle.textContent = currentTrack().title;
    };

    const setSoundtrackUI = state => {
      const playing = state === 'playing';
      const blocked = state === 'blocked';
      const ended = state === 'ended';

      soundtrackToggle.classList.toggle('is-playing', playing);
      soundtrackToggle.classList.toggle('needs-interaction', blocked);
      soundtrackToggle.setAttribute('aria-pressed', String(playing));
      soundtrackToggle.setAttribute('aria-label', playing ? 'Pause soundtrack' : 'Play soundtrack');

      if (soundtrackIcon) soundtrackIcon.textContent = playing ? 'Ⅱ' : '▶';
      if (soundtrackStatus) {
        soundtrackStatus.textContent = playing
          ? 'Now playing'
          : (ended ? 'Track ended' : 'Play soundtrack');
      }
      setTrackTitle();
    };

    const fadeVolume = (from, to, duration = 900) => {
      if (fadeFrame) cancelAnimationFrame(fadeFrame);
      const started = performance.now();
      soundtrack.volume = Math.max(0, Math.min(1, from));

      const step = now => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        soundtrack.volume = from + (to - from) * eased;
        if (progress < 1) fadeFrame = requestAnimationFrame(step);
      };

      fadeFrame = requestAnimationFrame(step);
    };

    const loadTrack = index => {
      const total = soundtrackTracks.length;
      currentTrackIndex = ((index % total) + total) % total;
      const track = currentTrack();

      if (soundtrack.getAttribute('src') !== track.src) {
        soundtrack.src = track.src;
        soundtrack.load();
      }

      setTrackTitle();
    };

    const startSoundtrack = async ({ gentleFade = true } = {}) => {
      try {
        soundtrack.volume = gentleFade ? 0.12 : targetVolume;
        await soundtrack.play();
        if (gentleFade) fadeVolume(0.12, targetVolume);
        setSoundtrackUI('playing');
        return true;
      } catch (_) {
        soundtrack.volume = targetVolume;
        setSoundtrackUI('blocked');
        return false;
      }
    };

    const pauseSoundtrack = () => {
      if (fadeFrame) cancelAnimationFrame(fadeFrame);
      soundtrack.pause();
      soundtrack.volume = targetVolume;
      setSoundtrackUI('paused');
    };

    soundtrackToggle.addEventListener('click', async () => {
      if (!soundtrack.paused && !soundtrack.ended) {
        pauseSoundtrack();
        return;
      }

      if (soundtrack.ended) soundtrack.currentTime = 0;
      await startSoundtrack();
    });

    soundtrackNext?.addEventListener('click', async () => {
      const wasPlaying = !soundtrack.paused && !soundtrack.ended;
      changingTrack = true;

      if (fadeFrame) cancelAnimationFrame(fadeFrame);
      soundtrack.pause();
      loadTrack(currentTrackIndex + 1);
      soundtrack.currentTime = 0;
      soundtrack.volume = targetVolume;

      if (wasPlaying) {
        await startSoundtrack({ gentleFade: false });
      } else {
        setSoundtrackUI('paused');
      }

      changingTrack = false;
    });

    soundtrack.addEventListener('play', () => setSoundtrackUI('playing'));
    soundtrack.addEventListener('pause', () => {
      if (!soundtrack.ended && !changingTrack) setSoundtrackUI('paused');
    });

    // Do not auto-advance. The visitor chooses when to move to the next song.
    soundtrack.addEventListener('ended', () => setSoundtrackUI('ended'));

    // Photography opens silently with The Drive Back selected.
    loadTrack(0);
    soundtrack.volume = targetVolume;
    setSoundtrackUI('paused');
  }

  // ----------------------------------------------------------
  // Gallery rendering — randomized archive + virtual collections
  // ----------------------------------------------------------

  const grid = qs('#photoGrid');
  if (!grid || typeof PORTFOLIO_PHOTOS === 'undefined') return;

  const fullBasePath = 'Images/photo-full/';
  const thumbBasePath = 'Images/photo-thumbs/';

  // GitHub Pages is case-sensitive, while Windows normally is not. A filename
  // such as Derick2.JPG can therefore work locally but fail online if Git has
  // the same file tracked as Derick2.jpg (or vice versa). Try the exact name
  // first, then common extension-case variants before treating an image as
  // genuinely missing.
  const fileCaseVariants = file => {
    const exact = String(file || '').trim();
    if (!exact) return [];

    const variants = [exact];
    const match = exact.match(/^(.*)\.([^.]+)$/);
    if (!match) return variants;

    const [, stem, extension] = match;
    [extension.toLowerCase(), extension.toUpperCase()].forEach(nextExtension => {
      const candidate = `${stem}.${nextExtension}`;
      if (!variants.includes(candidate)) variants.push(candidate);
    });

    return variants;
  };

  const fullPathsFor = file => fileCaseVariants(file)
    .map(candidate => `${fullBasePath}${candidate}`);

  const thumbnailPathsFor = file => fileCaseVariants(file)
    .map(candidate => `${thumbBasePath}${candidate}.webp`);

  const thumbnailPathFor = file => thumbnailPathsFor(file)[0] || '';

  // Grid thumbnails are cropped with object-fit: cover. By default the crop is
  // centered, but portraits sometimes need the focal point moved upward so the
  // subject's face stays visible. An explicit `focus` value in photos.js wins;
  // otherwise use a couple of sensible defaults for the animal portraits that
  // need it right now.
  //
  // Example in photos.js:
  //   focus: '50% 20%'
  //
  // The first number moves left/right and the second moves up/down. Fullscreen
  // viewing is untouched; this only changes the thumbnail crop in the grid.
  const gridFocusFor = photo => {
    const explicitFocus = String(photo?.focus || photo?.gridFocus || '').trim();
    if (explicitFocus) return explicitFocus;

    const file = String(photo?.file || '').trim().toLowerCase();
    const stem = file.replace(/\.[^.]+$/, '');

    // All Peacock images favor the upper part of the frame so the head/face is
    // shown instead of the center of the body.
    if (stem.startsWith('peacock')) return '50% 18%';

    // The portrait Fox image needs the same upward bias.
    if (stem === 'fox') return '50% 20%';

    // Individual grid crops requested for portraits/details whose important
    // subject is far from the geometric center of the frame. These only affect
    // the thumbnail grid; the fullscreen viewer still uses the complete image.
    if (stem === 'model') return '50% 85%';       // hat + hair at bottom
    if (stem === 'the rocket') return '50% 0%';   // people at top
    if (stem === 'derick') return '50% 20%';      // head near top
    if (stem === 'fox2') return '50% 30%';        // fox head near top
    if (stem === 'lincoln') return '50% 80%';        // feet near bottom
    if (stem === 'derick & tori') return '50% 15%';  // Heads near top
    if (stem === 'zeboy!') return '50% 45%';  // Center
    if (stem === 'zey portrait') return '50% 25%';        // head near top
    if (stem === 'sean') return '50% 25%';      // head near top
    if (stem === 'miss watson') return '50% 15%';      // head near top
    if (stem === 'fox1') return '50% 10%';      // head near top
    if (stem === 'fox1.5') return '50%  0%';      // head near top
    if (stem === 'barnstreet') return '10% 60%';      // to the left
    if (stem === 'seagull1') return '100% 50%';      // to the right
    if (stem === 'horses') return '50% 0%';   // horse at top
    if (stem === 'my mother') return '50% 17%';   // head at top
    if (stem === 'seagull') return '50% 10%';   // people at top
    if (stem === 'tractor & shed') return '0% 50%';   // to the left

    if (stem === 'seagull3') return '50% 70%';   // center

    if (stem === 'cowboy') return '50% 25%';   // top
    if (stem === 'firefighters1') return '50% 0%';   // top

    if (stem === 'gnomes') return '0% 50%';      // to the left

    if (stem === 'est square') return '50% 94%';        // near bottom

    if (stem === 'lemon bundt') return '50% 16%';   // flower at top

    if (stem === 'minecarts') return '50% 16%';   // top

    if (stem === 'new york45') return '50% 3%';   // top

    if (stem === 'new york8') return '50% 80%';   // bottom


     if (stem === 'seagulls') return '50% 50%';   // center

     if (stem === 'new york58') return '20% 50%';   // to the left

  };

  const albumNav = qs('[data-album-nav]');
  const albumHeading = qs('[data-album-heading]');
  const photoCount = qs('[data-photo-count]');
  const galleryStatus = qs('[data-gallery-status]');

  /*
    Virtual albums keep every full-resolution file in Images/photo-full/. A photo can appear
    in All plus one or more albums without duplicating the image.

    You can also explicitly add this to any photos.js item later:
      album: 'Lagoon'
    or:
      albums: ['People', 'Hawaii']
  */
  const normalize = value => String(value || '').trim().toLowerCase();
  const normalizedTags = photo => (Array.isArray(photo.tags) ? photo.tags : [])
    .map(normalize)
    .filter(Boolean);

  // Share-link slugs. An explicit `slug` in photos.js wins. If a photo has no
  // explicit slug, its exact filename becomes a safe automatic fallback so
  // every photograph can still be linked without extra metadata.
  const slugify = value => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const shareSlugFor = photo => {
    const explicit = slugify(photo?.slug);
    if (explicit) return explicit;
    return slugify(photo?.file) || slugify(photo?.title) || 'photo';
  };

  const ALBUM_RULES = [
    {
      name: 'Antelope Island',
      matches: photo => {
        const file = normalize(photo.file);
        return file.startsWith('antelope island')
          || file === 'antelope dr.png'
          || file.startsWith('buffalo')
          || file === 'rocks.jpg'
          || file === 'rocks2.jpg'
          || file === 'flowers1.jpg';
      }
    },
    {
      name: 'Hawaii',
      matches: photo => {
        const file = normalize(photo.file);
        const collection = normalize(photo.collection);
        return collection === 'hawaii'
          || file === 'kauai.jpg'
          || file === 'side of kauai.jpg'
          || file === 'relaxing.jpg'
          || file === 'water crash.jpg';
      }
    },
    {
      name: 'Lagoon',
      matches: photo => {
        const file = normalize(photo.file);
        const tags = normalizedTags(photo);
        return file.includes('lagoon')
          || file === 'rattlesnake rapids.jpg'
          || file === 'cannibal.jpg'
          || file === 'the rocket.jpg'
          || file === 'samurai.jpg'
          || file === 'printing press3.jpg'
          || file === 'peacock.jpg'
          || file === 'clock tower.jpg'
          || file === 'performance.jpg'
          || file === 'performance2.jpg'
          || file === 'carts.jpg'
          || tags.includes('coaster');
      }
    },
    {
      name: 'Animals',
      matches: photo => {
        const file = normalize(photo.file);
        const title = normalize(photo.title);
        const collection = normalize(photo.collection);
        const tags = normalizedTags(photo);

        const animalWord = /(^|[\s_.-])(fox|buffalo|cow|horse|horses|grasshopper|peacock|seagull|squirrel|tiger|bird|kitty|cat)([\s_.-]|$)/;

        return collection === 'wildlife'
          || tags.some(tag => ['animal', 'bird', 'insect', 'wildlife'].includes(tag))
          || file === 'phoebe.jpg'
          || file === 'open mouth.jpg'
          || file.startsWith('buffalo')
          || file.startsWith('fox')
          || file.startsWith('grasshopper')
          || animalWord.test(file)
          || animalWord.test(title);
      }
    },
    {
      name: 'People',
      matches: photo => {
        const file = normalize(photo.file);
        const title = normalize(photo.title);
        const collection = normalize(photo.collection);
        const tags = normalizedTags(photo);

        // These are intentionally not part of the People album even if
        // older metadata happens to label them as portraits/people.
        const explicitlyNotPeople = file === 'possey.jpg'
          || file === 'phoebe.jpg'
          || file === 'door.jpg'
          || file === 'open mouth.jpg'
          || file === 'homeless.jpg'
          || /(^|[\s_.-])(cat|kitty)([\s_.-]|$)/.test(file)
          || /(^|\s)(cat|kitty)(\s|$)/.test(title);

        if (explicitlyNotPeople) return false;

        return file === 'performance.jpg'
          || file === 'performance2.jpg'
          || file === 'lily.jpg'
          || file === 'lily2.jpg'
          || file === 'zey portrait.png'
          || file === 'zey.jpg'
          || ['people', 'portraits', 'family'].includes(collection)
          || tags.some(tag => ['people', 'portrait', 'self-portrait'].includes(tag));
      }
    },
    {
      name: 'Landscapes',
      matches: photo => {
        const file = normalize(photo.file);
        const collection = normalize(photo.collection);
        const tags = normalizedTags(photo);

        return collection === 'landscape'
          || tags.includes('landscape')
          || /(^|[\s_-])(mountain|field|sunset|cornfield|kauai)([\s_.-]|$)/.test(file);
      }
    }
  ];

  // Exact duplicate filenames are ignored. Different extensions/case remain
  // separate because GitHub Pages treats them as separate files.
  const seen = new Set();
  const uniquePhotos = PORTFOLIO_PHOTOS.filter(photo => {
    const file = String(photo?.file || '').trim();
    if (!file || seen.has(file)) return false;
    seen.add(file);
    return true;
  });

  const resolveAlbums = photo => {
    // Every photograph always belongs to the master All collection. Named
    // albums are additive only: they never make a photograph exclusive.
    const names = new Set(['All']);

    if (typeof photo.album === 'string' && photo.album.trim()) {
      names.add(photo.album.trim());
    }

    if (Array.isArray(photo.albums)) {
      photo.albums.forEach(name => {
        if (typeof name === 'string' && name.trim()) names.add(name.trim());
      });
    }

    ALBUM_RULES.forEach(rule => {
      if (rule.matches(photo)) names.add(rule.name);
    });

    return [...names];
  };

  const usedShareSlugs = new Set();
  const archive = uniquePhotos.map((photo, photoIndex) => {
    const baseSlug = shareSlugFor(photo);
    let shareSlug = baseSlug;
    let suffix = 2;

    // Slugs must be unique. Explicit duplicates are preserved safely by adding
    // a numeric suffix rather than letting one direct link open the wrong image.
    while (usedShareSlugs.has(shareSlug)) {
      shareSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    usedShareSlugs.add(shareSlug);

    return {
      ...photo,
      __albums: resolveAlbums(photo),
      __slug: shareSlug || `photo-${photoIndex + 1}`
    };
  });

  /*
    Fresh shuffle on every page load.

    This work is tiny compared with decoding/downloading photographs: a
    Fisher-Yates shuffle is O(n), so even a collection with hundreds of
    images is effectively instant. The expensive part remains image loading,
    which is still handled progressively below.

    We shuffle once per page load and keep that order for the whole visit.
    Switching between albums therefore feels stable until the page reloads.
  */
  const shuffle = items => {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  };

  const randomizedArchive = shuffle(archive);

  // Open the Photography archive on the master All collection by default.
  // Named albums remain available from the collection tabs.
  let activeAlbum = 'All';

  // Keep the existing curated album order, then automatically append any
  // custom album names declared directly in photos.js. This means a new entry
  // such as `album: 'American Fork Canyon'` immediately creates its own tab;
  // no photography-page.js edit is needed for future albums.
  const albumNames = [];
  const albumNameKeys = new Set();

  const addAlbumName = name => {
    const cleanName = String(name || '').trim();
    const key = normalize(cleanName);
    if (!cleanName || key === 'all' || albumNameKeys.has(key)) return;

    albumNameKeys.add(key);
    albumNames.push(cleanName);
  };

  // Preserve the familiar order of the built-in albums first.
  ALBUM_RULES.forEach(rule => addAlbumName(rule.name));

  // Then add user-created albums in the order they first appear in photos.js.
  uniquePhotos.forEach(photo => {
    if (typeof photo.album === 'string') addAlbumName(photo.album);

    if (Array.isArray(photo.albums)) {
      photo.albums.forEach(addAlbumName);
    }
  });

  const photosForActiveAlbum = () =>
    randomizedArchive.filter(photo => photo.__albums.includes(activeAlbum));

  function updateCounts() {
    const count = qsa('.photo-grid-button', grid).length;
    const total = archive.length;

    if (photoCount) photoCount.textContent = `${total} photographs`;
    if (galleryStatus) galleryStatus.textContent = `${count} photograph${count === 1 ? '' : 's'}`;
    if (albumHeading) albumHeading.textContent = activeAlbum === 'All' ? 'All photographs' : activeAlbum;
  }

  function renderAlbumNav() {
    if (!albumNav) return;

    const names = ['All', ...albumNames];
    const fragment = document.createDocumentFragment();

    names.forEach(name => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'photo-album-tab';
      button.dataset.album = name;
      button.textContent = name;
      button.setAttribute('aria-pressed', String(name === activeAlbum));
      if (name === activeAlbum) button.classList.add('is-active');
      fragment.appendChild(button);
    });

    albumNav.replaceChildren(fragment);
  }

  /*
    The grid uses lightweight WebP files generated locally in
    Images/photo-thumbs/. The full-resolution originals are only referenced
    by the fullscreen viewer. Lazy/progressive loading remains in place so the
    page does not request every thumbnail at once.

    Thumbnail names deliberately preserve the original filename + extension:
      Fox.jpg      -> Images/photo-thumbs/Fox.jpg.webp
      Field.png    -> Images/photo-thumbs/Field.png.webp
    This prevents collisions when both .jpg and .png versions exist.
  */
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = Boolean(connection?.saveData);
  const effectiveType = String(connection?.effectiveType || '').toLowerCase();
  const slowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';
  const smallScreen = window.matchMedia('(max-width: 700px), (max-width: 900px) and (pointer: coarse)').matches;
  // Only touch-first phone/tablet browsers use thumbnails in the enlarged viewer.
  // A narrow desktop window still receives full-resolution photographs.
  const lightweightViewer = window.matchMedia('(pointer: coarse) and (max-width: 1100px)').matches;
  const eagerCount = saveData ? 2 : (smallScreen ? 3 : 6);
  const observerMargin = saveData ? '250px 0px' : (smallScreen ? '400px 0px' : '600px 0px');

  const loadGridImage = img => {
    if (!img || img.src || !img.dataset.src) return;
    img.src = img.dataset.src;
  };

  const gridImageObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          loadGridImage(entry.target);
          gridImageObserver.unobserve(entry.target);
        });
      }, { rootMargin: observerMargin, threshold: 0.01 })
    : null;

  /*
    Loading and revealing are intentionally separate.

    Thumbnails still begin downloading before they reach the viewport so the
    gallery feels instant while scrolling. A second observer waits until the
    actual tile becomes visible, then gives the loaded image its soft reveal.
    This preserves the speed benefit of preloading without letting photographs
    finish their fade before the visitor has actually reached them.
  */
  const revealGridItem = figure => {
    if (!figure || !figure.classList.contains('is-loaded')) return;
    figure.classList.add('is-visible');
    gridRevealObserver?.unobserve(figure);
  };

  const gridRevealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const figure = entry.target;
          figure.dataset.inView = 'true';
          revealGridItem(figure);
        });
      }, { rootMargin: '0px 0px 24px 0px', threshold: 0.06 })
    : null;

  function renderGrid() {
    const photos = photosForActiveAlbum();
    const fragment = document.createDocumentFragment();

    gridImageObserver?.disconnect();
    gridRevealObserver?.disconnect();

    photos.forEach((photo, index) => {
      const figure = document.createElement('figure');
      figure.className = 'photo-grid-item';

      const button = document.createElement('button');
      button.className = 'photo-grid-button';
      button.type = 'button';
      const fullCandidates = fullPathsFor(photo.file);
      const thumbCandidates = thumbnailPathsFor(photo.file);
      const fullSrc = fullCandidates[0] || '';
      const thumbSrc = thumbCandidates[0] || '';
      // Never fall back to a full camera-resolution image in the scrolling grid.
      // Missing thumbnails become lightweight placeholders; the full viewer is untouched.
      const gridCandidates = thumbCandidates;

      button.dataset.file = photo.file || '';
      button.dataset.slug = photo.__slug || '';
      button.dataset.full = fullSrc;
      button.dataset.fullCandidates = JSON.stringify(fullCandidates);
      button.dataset.variants = JSON.stringify(Array.isArray(photo.variants) ? photo.variants.filter(Boolean) : []);
      button.dataset.thumb = thumbSrc;
      button.dataset.title = photo.title || photo.file;
      button.dataset.collection = photo.collection || '';
      button.dataset.location = photo.location || '';
      button.dataset.year = photo.year || '';
      button.dataset.note = photo.note || '';
      button.dataset.albums = photo.__albums.join('|');
      button.setAttribute('aria-label', `Open photograph: ${photo.title || photo.file}`);

      const img = document.createElement('img');
      img.className = 'photo-grid-image';
      img.style.objectPosition = gridFocusFor(photo);
      img.dataset.src = gridCandidates[0] || '';
      img.dataset.candidates = JSON.stringify(gridCandidates);
      img.dataset.candidateIndex = '0';
      img.alt = photo.title || '';
      img.loading = 'lazy';
      img.decoding = 'async';

      if (index < eagerCount) {
        img.loading = 'eager';
        if (index < Math.min(3, eagerCount)) img.fetchPriority = 'high';
        loadGridImage(img);
      } else if (gridImageObserver) {
        img.fetchPriority = 'low';
        gridImageObserver.observe(img);
      } else {
        loadGridImage(img);
      }

      const markLoaded = () => {
        figure.classList.add('is-loaded');

        // If the tile has already entered the viewport, reveal it now. If it
        // loaded ahead of the scroll position, the reveal observer will wait
        // and fire only when the visitor actually reaches it.
        if (!gridRevealObserver || figure.dataset.inView === 'true') {
          requestAnimationFrame(() => revealGridItem(figure));
        }
      };
      img.addEventListener('load', markLoaded, { once: true });
      if (img.complete && img.naturalWidth) markLoaded();

      img.addEventListener('error', () => {
        let candidates = [];
        try {
          candidates = JSON.parse(img.dataset.candidates || '[]');
        } catch (_) {}

        const currentIndex = Number.parseInt(img.dataset.candidateIndex || '0', 10);
        const nextIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;
        const nextSrc = candidates[nextIndex];

        if (nextSrc) {
          img.dataset.candidateIndex = String(nextIndex);
          img.src = nextSrc;
          return;
        }

        // Preserve the clickable photo, but avoid downloading the huge original
        // merely to fill a thumbnail tile. Missing thumbs can be regenerated later.
        img.style.visibility = 'hidden';
        button.classList.add('is-missing-thumbnail');
        const note = document.createElement('span');
        note.className = 'photo-grid-preview-missing';
        note.textContent = 'Preview unavailable — open to view';
        button.insertBefore(note, img.nextSibling);
        markLoaded();
      });

      const overlay = document.createElement('span');
      overlay.className = 'photo-grid-overlay';

      const title = document.createElement('span');
      title.className = 'photo-grid-title';
      title.textContent = photo.title || photo.file;

      const open = document.createElement('span');
      open.className = 'photo-grid-open';
      open.setAttribute('aria-hidden', 'true');
      open.textContent = '↗';

      overlay.append(title, open);
      button.append(img, overlay);
      figure.appendChild(button);
      fragment.appendChild(figure);
    });

    grid.replaceChildren(fragment);

    // Observe the mounted tiles after the DOM swap so their viewport geometry
    // is accurate. Browsers without IntersectionObserver simply reveal a tile
    // as soon as its thumbnail finishes loading.
    if (gridRevealObserver) {
      qsa('.photo-grid-item', grid).forEach(figure => gridRevealObserver.observe(figure));
    } else {
      qsa('.photo-grid-item.is-loaded', grid).forEach(figure => revealGridItem(figure));
    }

    updateCounts();
  }

  renderAlbumNav();
  renderGrid();

  albumNav?.addEventListener('click', event => {
    const button = event.target.closest('[data-album]');
    if (!button) return;

    const selectedAlbum = button.dataset.album || 'All';
    // Count actual tab changes only, not repeat clicks or the default All load.
    if (selectedAlbum === activeAlbum) return;
    activeAlbum = selectedAlbum;
    renderAlbumNav();
    renderGrid();

    // Existing low-priority analytics queue; no image requests or synchronous work.
    // The Worker records it as a custom_event (item=album_select, label=album name).
    window.PortfolioAnalytics?.trackEvent('album_select', activeAlbum);

    // Keep album changes anchored near the start of the gallery on phones.
    if (window.matchMedia('(max-width: 700px)').matches) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // ----------------------------------------------------------
  // Full-frame viewer — two centered layers, soft cross-fade
  // ----------------------------------------------------------

  const viewer = qs('[data-photo-viewer]');
  if (!viewer) return;

  const stage = qs('[data-viewer-stage]', viewer);
  const images = [
    qs('[data-viewer-image-a]', viewer),
    qs('[data-viewer-image-b]', viewer)
  ].filter(Boolean);

  const closeButton = qs('[data-viewer-close]', viewer);
  const prevButton = qs('[data-viewer-prev]', viewer);
  const nextButton = qs('[data-viewer-next]', viewer);
  const caption = qs('[data-viewer-caption]', viewer);
  const meta = qs('[data-viewer-meta]', viewer);
  const indexLabel = qs('[data-viewer-index]', viewer);
  const variantControls = qs('[data-viewer-variants]', viewer);
  const variantButtons = qs('[data-viewer-variant-buttons]', viewer);
  const detailStatus = qs('[data-viewer-detail-status]', viewer);

  // Share control: keep the direct-link behavior, but present it as a quiet
  // swooping-arrow icon positioned just beneath the photograph's lower-right
  // corner instead of as "Copy link" text in the top toolbar.
  const shareButton = document.createElement('button');
  shareButton.type = 'button';
  shareButton.className = 'photo-viewer-share';
  shareButton.setAttribute('aria-label', 'Copy direct link to this photograph');
  shareButton.setAttribute('title', 'Copy link');
  shareButton.innerHTML = `
    <svg class="photo-viewer-share-icon" viewBox="0 0 375 345" aria-hidden="true" focusable="false">
      <path d="M 256 11 L 235 19 L 233 74 L 158 75 L 98 86 L 57 106 L 28 137 L 13 177 L 11 234 L 28 286 L 55 329 L 65 324 L 62 262 L 69 227 L 103 186 L 153 171 L 233 169 L 234 221 L 253 233 L 360 128 L 358 112 Z" />
    </svg>
  `;
  viewer.appendChild(shareButton);

  const shareFeedback = document.createElement('span');
  shareFeedback.className = 'photo-viewer-share-feedback';
  shareFeedback.setAttribute('aria-live', 'polite');
  shareFeedback.setAttribute('aria-atomic', 'true');
  viewer.appendChild(shareFeedback);

  if (!document.getElementById('photo-viewer-share-style')) {
    const shareStyle = document.createElement('style');
    shareStyle.id = 'photo-viewer-share-style';
    shareStyle.textContent = `
      .photo-viewer-share {
        position: absolute;
        z-index: 18;
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        padding: 6px;
        margin: 0;
        appearance: none;
        border: 0;
        background: transparent;
        color: rgba(226, 228, 230, .62);
        opacity: .82;
        cursor: pointer;
        transform: translateZ(0);
        transition:
          color .18s ease,
          opacity .18s ease,
          transform .22s cubic-bezier(.22,.72,.2,1);
      }

      .photo-viewer-share-icon {
        display: block;
        width: 25px;
        height: 25px;
        fill: currentColor;
        transform: none;
        transform-origin: center;
      }

      .photo-viewer-share:hover,
      .photo-viewer-share:focus-visible {
        color: rgba(255,255,255,.96);
        opacity: 1;
        transform: translateY(-1px) scale(1.045);
      }

      .photo-viewer-share:focus-visible {
        outline: 1px solid rgba(240,211,155,.70);
        outline-offset: 2px;
        border-radius: 50%;
      }

      .photo-viewer-share.is-copied {
        color: rgba(240,211,155,.96);
        opacity: 1;
        transform: scale(1.08);
      }

      .photo-viewer-share:disabled {
        opacity: .20;
        cursor: default;
        transform: none;
      }

      .photo-viewer-share-feedback {
        position: absolute;
        z-index: 18;
        display: block;
        color: rgba(240,211,155,.78);
        font-size: .52rem;
        font-weight: 500;
        letter-spacing: .10em;
        line-height: 1;
        text-transform: uppercase;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transform: translateY(3px);
        transition:
          opacity .22s ease,
          transform .28s cubic-bezier(.22,.72,.2,1);
      }

      .photo-viewer-share-feedback.is-visible {
        opacity: .92;
        transform: translateY(0);
      }

      @media (max-width: 620px) {
        .photo-viewer-share {
          width: 36px;
          height: 36px;
          padding: 6px;
        }

        .photo-viewer-share-icon {
          width: 23px;
          height: 23px;
        }

        .photo-viewer-share-feedback {
          font-size: .48rem;
        }
      }
    `;
    document.head.appendChild(shareStyle);
  }

  let buttons = qsa('.photo-grid-button', grid);
  let currentIndex = 0;
  let currentVariantIndex = 0;
  let activeLayer = 0;
  let lastFocused = null;
  let transitionLocked = false;
  let pendingNavigation = 0;
  let navigationUnlockTimer = 0;
  let shareFeedbackTimer = 0;

  const MIN_ZOOM = 1;
  const BUTTON_ZOOM = 2.35;
  const BASE_MAX_ZOOM = 4;
  const HARD_MAX_ZOOM = 12;
  let zoomScale = MIN_ZOOM;
  let zoomX = 0;
  let zoomY = 0;

  /*
    High-resolution viewer model
    ----------------------------
    The old viewer kept each photograph fitted to the stage with max-width /
    max-height and then magnified that fitted browser layer with scale(). That
    is fast, but on some Chromium/GPU combinations it can make fine texture
    look softer than the original file.

    The upgraded viewer measures the source image, calculates its fitted size,
    and changes the image element's REAL rendered width/height as you zoom. The
    transform is now used only for panning. That gives the browser the original
    file to resample at the requested inspection size instead of enlarging a
    small composited layer.

    nativeZoom is DPR-aware: at that magnification, one source-image pixel is
    approximately one physical display pixel. High-resolution photographs can
    therefore expose their real detail without forcing every image in the grid
    to load at full size.
  */
  const imageMetrics = new WeakMap();

  // Pointer state supports both swipe navigation and true two-finger pinch.
  const activePointers = new Map();
  let gestureMode = null; // 'swipe', 'pan', or 'pinch'
  let swipeStartX = 0;
  let pointerStartY = 0;
  let suppressClickZoom = false;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  let pinchStartDistance = 0;
  let pinchStartScale = MIN_ZOOM;
  let pinchStartX = 0;
  let pinchStartY = 0;
  let pinchAnchorX = 0;
  let pinchAnchorY = 0;

  const wrap = index => (index + buttons.length) % buttons.length;
  const itemAt = index => buttons[wrap(index)];

  const currentShareSlug = () => itemAt(currentIndex)?.dataset.slug || '';

  const shareUrlForSlug = slug => {
    const url = new URL(window.location.href);
    url.hash = slug || '';
    return url.href;
  };

  const hashSlug = () => {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return '';
    try { return slugify(decodeURIComponent(raw)); } catch (_) { return slugify(raw); }
  };

  const clearShareHash = () => {
    if (!window.location.hash) return;
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(window.history.state, '', cleanUrl || window.location.pathname);
  };

  const copyText = async text => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) {}
    textarea.remove();
    return copied;
  };

  const copyCurrentPhotoLink = async () => {
    const slug = currentShareSlug();
    if (!slug) return;

    window.clearTimeout(shareFeedbackTimer);

    try {
      const copied = await copyText(shareUrlForSlug(slug));

      shareButton.classList.toggle('is-copied', copied);
      shareButton.setAttribute(
        'aria-label',
        copied ? 'Link copied' : 'Copy direct link to this photograph'
      );
      shareButton.setAttribute('title', copied ? 'Link copied' : 'Copy link');

      if (copied && shareFeedback) {
        shareFeedback.textContent = 'link copied';
        shareFeedback.classList.add('is-visible');
        queueShareButtonPosition();
      }
    } catch (_) {
      shareButton.classList.remove('is-copied');
      shareButton.setAttribute('aria-label', 'Copy direct link to this photograph');
      shareButton.setAttribute('title', 'Copy link');
      if (shareFeedback) {
        shareFeedback.textContent = '';
        shareFeedback.classList.remove('is-visible');
      }
    }

    shareFeedbackTimer = window.setTimeout(() => {
      shareButton.classList.remove('is-copied');
      shareButton.setAttribute('aria-label', 'Copy direct link to this photograph');
      shareButton.setAttribute('title', 'Copy link');

      if (shareFeedback) {
        shareFeedback.classList.remove('is-visible');
        window.setTimeout(() => {
          if (!shareFeedback.classList.contains('is-visible')) shareFeedback.textContent = '';
        }, 280);
      }
    }, 1350);
  };

  const variantFilesAt = index => {
    const item = itemAt(index);
    if (!item) return [];

    let alternates = [];
    try {
      const parsed = JSON.parse(item.dataset.variants || '[]');
      if (Array.isArray(parsed)) alternates = parsed.filter(Boolean);
    } catch (_) {}

    const primary = item.dataset.file || '';
    return [primary, ...alternates]
      .filter(Boolean)
      .filter((value, position, values) => values.indexOf(value) === position);
  };

  const srcCandidatesAt = (index, variantIndex = 0) => {
    const item = itemAt(index);
    if (!item) return [];

    const file = variantFilesAt(index)[variantIndex];
    if (!file) return [];

    // Phones and touch tablets use the already-generated WebP thumbnail files
    // for ALL enlarged frames. No full-resolution image is requested on mobile.
    // Desktop retains the original full-resolution source/case fallbacks.
    if (lightweightViewer) return thumbnailPathsFor(file);

    if (variantIndex === 0) {
      try {
        const parsed = JSON.parse(item.dataset.fullCandidates || '[]');
        if (Array.isArray(parsed) && parsed.length) return parsed.filter(Boolean);
      } catch (_) {}
      return item.dataset.full ? [item.dataset.full] : [];
    }

    return fullPathsFor(file);
  };

  const titleAt = index => itemAt(index)?.dataset.title || '';

  const metaAt = index => {
    const item = itemAt(index);
    if (!item) return '';

    const albumLabel = activeAlbum !== 'All' ? activeAlbum : '';
    return [albumLabel, item.dataset.collection, item.dataset.location, item.dataset.year]
      .filter(Boolean)
      .filter((value, position, values) => values.indexOf(value) === position)
      .join(' · ');
  };

  const activeViewerImage = () => images[activeLayer] || null;

  const positionShareButton = () => {
    if (!shareButton || !viewer.classList.contains('is-open')) return;

    const image = activeViewerImage();
    if (!image || !image.classList.contains('is-active')) return;

    const imageRect = image.getBoundingClientRect();
    const viewerRect = viewer.getBoundingClientRect();
    if (!imageRect.width || !imageRect.height || !viewerRect.width || !viewerRect.height) return;

    const buttonSize = shareButton.offsetWidth || 38;
    const edgeGap = window.matchMedia('(max-width: 620px)').matches ? 6 : 9;
    const viewportInset = window.matchMedia('(max-width: 620px)').matches ? 8 : 14;

    // Align the icon with the photo's right edge and place it just below the
    // bottom edge — visually outside the frame, not over the photograph.
    const desiredLeft = imageRect.right - viewerRect.left - buttonSize;
    const desiredTop = imageRect.bottom - viewerRect.top + edgeGap;

    const left = Math.min(
      Math.max(viewportInset, desiredLeft),
      Math.max(viewportInset, viewerRect.width - buttonSize - viewportInset)
    );

    const top = Math.min(
      Math.max(viewportInset, desiredTop),
      Math.max(viewportInset, viewerRect.height - buttonSize - viewportInset)
    );

    shareButton.style.left = `${Math.round(left)}px`;
    shareButton.style.top = `${Math.round(top)}px`;

    if (shareFeedback) {
      const feedbackWidth = shareFeedback.offsetWidth || 54;
      const feedbackGap = 5;

      // Keep the tiny confirmation close to the icon while ensuring it stays
      // inside the viewport. Prefer placing it just to the left of the arrow.
      let feedbackLeft = left - feedbackWidth - feedbackGap;
      if (feedbackLeft < viewportInset) feedbackLeft = left + buttonSize + feedbackGap;

      const feedbackTop = top + Math.max(0, (buttonSize - 8) / 2);

      shareFeedback.style.left = `${Math.round(feedbackLeft)}px`;
      shareFeedback.style.top = `${Math.round(feedbackTop)}px`;
    }
  };

  const queueShareButtonPosition = () => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(positionShareButton));
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // The usable photo viewport is the stage's inner content box, excluding
  // its padding. Keeping this geometry in one place makes click-focus, pinch
  // anchoring, and pan limits all agree about the exact center/edges.
  const stageViewport = () => {
    if (!stage) {
      return {
        left: 0,
        top: 0,
        width: 1,
        height: 1,
        centerX: .5,
        centerY: .5
      };
    }

    const rect = stage.getBoundingClientRect();
    const styles = getComputedStyle(stage);
    const paddingLeft = parseFloat(styles.paddingLeft || 0);
    const paddingRight = parseFloat(styles.paddingRight || 0);
    const paddingTop = parseFloat(styles.paddingTop || 0);
    const paddingBottom = parseFloat(styles.paddingBottom || 0);
    const width = Math.max(1, stage.clientWidth - paddingLeft - paddingRight);
    const height = Math.max(1, stage.clientHeight - paddingTop - paddingBottom);
    const left = rect.left + paddingLeft;
    const top = rect.top + paddingTop;

    return {
      left,
      top,
      width,
      height,
      centerX: left + width / 2,
      centerY: top + height / 2
    };
  };

  const stageAvailableSize = () => {
    const viewport = stageViewport();
    return { width: viewport.width, height: viewport.height };
  };

  function measureImage(image) {
    if (!image?.naturalWidth || !image?.naturalHeight) return null;

    const available = stageAvailableSize();
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    // Never upscale the fitted view. Small photographs remain at their source
    // size; large photographs are reduced only enough to fit the stage.
    const fitScale = Math.min(
      1,
      available.width / naturalWidth,
      available.height / naturalHeight
    );

    const fitWidth = Math.max(1, naturalWidth * fitScale);
    const fitHeight = Math.max(1, naturalHeight * fitScale);
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // At nativeZoom, source pixels and physical screen pixels are approximately
    // 1:1. This is the sharp inspection point the previous transform-only zoom
    // could not guarantee.
    const nativeZoom = clamp(1 / Math.max(fitScale * dpr, .0001), MIN_ZOOM, HARD_MAX_ZOOM);
    const maxZoom = clamp(Math.max(BASE_MAX_ZOOM, nativeZoom), MIN_ZOOM, HARD_MAX_ZOOM);

    return {
      naturalWidth,
      naturalHeight,
      fitWidth,
      fitHeight,
      nativeZoom,
      maxZoom,
      stageWidth: available.width,
      stageHeight: available.height,
      dpr
    };
  }

  function positionImageAtViewportCenter(image) {
    if (!image || !stage) return;

    // The image is absolutely positioned so changing its real width/height
    // never changes the grid track or shifts the visual center. Anchor it to
    // the exact center of the stage's usable (unpadded) photo viewport.
    const viewport = stageViewport();
    const stageRect = stage.getBoundingClientRect();
    image.style.left = `${viewport.centerX - stageRect.left}px`;
    image.style.top = `${viewport.centerY - stageRect.top}px`;
  }

  function prepareImageLayout(image) {
    const metrics = measureImage(image);
    if (!metrics) return null;

    imageMetrics.set(image, metrics);
    positionImageAtViewportCenter(image);
    image.style.width = `${metrics.fitWidth}px`;
    image.style.height = `${metrics.fitHeight}px`;
    image.style.setProperty('--viewer-pan-x', '0px');
    image.style.setProperty('--viewer-pan-y', '0px');
    return metrics;
  }

  function metricsForImage(image) {
    if (!image) return null;

    const existing = imageMetrics.get(image);
    const available = stageAvailableSize();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    if (existing
      && Math.abs(existing.stageWidth - available.width) < .5
      && Math.abs(existing.stageHeight - available.height) < .5
      && Math.abs(existing.dpr - dpr) < .01) {
      return existing;
    }

    return prepareImageLayout(image);
  }

  const activeMetrics = () => metricsForImage(activeViewerImage());
  const maxZoomForActive = () => activeMetrics()?.maxZoom || BASE_MAX_ZOOM;
  const inspectionZoomForActive = () => {
    const metrics = activeMetrics();

    // A single click should feel like a deliberate close-up, not an enormous
    // leap to 1:1 source pixels on a very large photograph. Native-pixel depth
    // remains available through pinch zoom / +, but the first click stays at
    // the familiar controlled magnification.
    return clamp(
      BUTTON_ZOOM,
      MIN_ZOOM,
      metrics?.maxZoom || BASE_MAX_ZOOM
    );
  };

  function clampPan() {
    const image = activeViewerImage();
    const metrics = metricsForImage(image);
    if (!image || !metrics || zoomScale <= MIN_ZOOM) {
      zoomX = 0;
      zoomY = 0;
      return;
    }

    const viewport = stageViewport();
    const renderedWidth = metrics.fitWidth * zoomScale;
    const renderedHeight = metrics.fitHeight * zoomScale;

    // These are the full legal travel distances from the centered position.
    // At either extreme the corresponding edge of the photograph meets the
    // edge of the usable viewport, so no portion of a zoomed image is trapped
    // outside the draggable range.
    const maxX = Math.max(0, (renderedWidth - viewport.width) / 2);
    const maxY = Math.max(0, (renderedHeight - viewport.height) / 2);

    zoomX = clamp(zoomX, -maxX, maxX);
    zoomY = clamp(zoomY, -maxY, maxY);
  }

  function syncZoomUI() {
    const zoomed = zoomScale > MIN_ZOOM + 0.01;
    viewer.classList.toggle('is-zoomed', zoomed);
    stage?.classList.toggle('is-zoomed', zoomed);
  }

  function applyZoom({ clampPosition = true } = {}) {
    const image = activeViewerImage();
    const metrics = metricsForImage(image);
    if (!image || !metrics) return;

    zoomScale = clamp(zoomScale, MIN_ZOOM, metrics.maxZoom);
    if (clampPosition) clampPan();

    // Resize the actual image element instead of scaling a fitted compositor
    // layer. The browser therefore resamples directly from the full-resolution
    // source at the requested inspection size. Transform is reserved for pan.
    image.style.width = `${metrics.fitWidth * zoomScale}px`;
    image.style.height = `${metrics.fitHeight * zoomScale}px`;

    // Re-anchor after any viewport/layout change. The CSS transform is now
    // reserved for centering + pan only; zoom itself remains real image sizing.
    positionImageAtViewportCenter(image);

    if (zoomScale <= MIN_ZOOM + 0.01) {
      zoomScale = MIN_ZOOM;
      zoomX = 0;
      zoomY = 0;
      image.style.width = `${metrics.fitWidth}px`;
      image.style.height = `${metrics.fitHeight}px`;
    }

    image.style.setProperty('--viewer-pan-x', `${zoomX}px`);
    image.style.setProperty('--viewer-pan-y', `${zoomY}px`);

    syncZoomUI();
    queueShareButtonPosition();
  }

  function resetZoom() {
    zoomScale = MIN_ZOOM;
    zoomX = 0;
    zoomY = 0;
    images.forEach(image => {
      if (!image) return;
      image.style.setProperty('--viewer-pan-x', '0px');
      image.style.setProperty('--viewer-pan-y', '0px');
      if (image.naturalWidth && image.naturalHeight) prepareImageLayout(image);
    });
    syncZoomUI();
    queueShareButtonPosition();
  }

  function setZoom(nextScale, anchorClientX = null, anchorClientY = null) {
    const previousScale = zoomScale;
    const viewport = stageViewport();
    const maxZoom = maxZoomForActive();
    const clampedNextScale = clamp(nextScale, MIN_ZOOM, maxZoom);

    if (anchorClientX !== null && anchorClientY !== null && previousScale > 0) {
      const anchorX = anchorClientX - viewport.centerX;
      const anchorY = anchorClientY - viewport.centerY;
      const ratio = clampedNextScale / previousScale;

      // Keep the part beneath the user's fingers/cursor in the same screen
      // position as magnification changes.
      zoomX = anchorX - ratio * (anchorX - zoomX);
      zoomY = anchorY - ratio * (anchorY - zoomY);
    }

    zoomScale = clampedNextScale;
    applyZoom();
  }

  function zoomToClientPoint(nextScale, clientX, clientY) {
    const image = activeViewerImage();
    const metrics = metricsForImage(image);
    if (!image || !metrics) return;

    const imageRect = image.getBoundingClientRect();
    if (!imageRect.width || !imageRect.height) {
      setZoom(nextScale, clientX, clientY);
      return;
    }

    // Capture the exact source-relative point the visitor clicked BEFORE the
    // image is resized. This avoids guessing from the stage dimensions and is
    // reliable for portrait, landscape, and unusually cropped aspect ratios.
    const imageX = clamp((clientX - imageRect.left) / imageRect.width, 0, 1);
    const imageY = clamp((clientY - imageRect.top) / imageRect.height, 0, 1);
    const nextZoom = clamp(nextScale, MIN_ZOOM, metrics.maxZoom);
    const renderedWidth = metrics.fitWidth * nextZoom;
    const renderedHeight = metrics.fitHeight * nextZoom;

    zoomScale = nextZoom;

    // Put the clicked point at the center of the viewing area whenever the
    // image bounds permit it. clampPan() then makes a near-edge click land as
    // close to center as possible without hiding an unreachable edge.
    zoomX = -(imageX - .5) * renderedWidth;
    zoomY = -(imageY - .5) * renderedHeight;
    applyZoom();
  }

  const pointerDistance = () => {
    const points = [...activePointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  };

  const pointerMidpoint = () => {
    const points = [...activePointers.values()];
    if (points.length < 2) return { x: 0, y: 0 };
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2
    };
  };

  // Full-resolution requests are cached so navigation never deliberately
  // downloads the same source twice. Keep the Image object as well as its
  // promise: if a speculative request later becomes the photograph the visitor
  // actually tapped, we can promote its fetch priority instead of starting over.
  const preloadCache = new Map();
  const MAX_PRELOAD_CACHE = 6;  // browser cache still retains fetched files


  function preload(src, priority = 'auto') {
    if (!src) return Promise.resolve(false);

    const cached = preloadCache.get(src);
    if (cached) {
      if (priority === 'high' && cached.image) {
        try { cached.image.fetchPriority = 'high'; } catch (_) {}
      }
      return cached.promise;
    }

    const image = new Image();
    image.decoding = 'async';
    try { image.fetchPriority = priority; } catch (_) {}

    const promise = new Promise(resolve => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = src;
      if (image.complete) resolve(Boolean(image.naturalWidth));
    });

    preloadCache.set(src, { promise, image });
    // Do not retain Image objects for the entire browsing session. Large
    // originals can otherwise consume significant decoded-image memory.
    while (preloadCache.size > MAX_PRELOAD_CACHE) {
      const oldest = preloadCache.keys().next().value;
      preloadCache.delete(oldest);
    }
    return promise;
  }

  async function resolveFullSrc(index, variantIndex = 0, priority = 'auto') {
    const candidates = srcCandidatesAt(index, variantIndex);
    for (const src of candidates) {
      if (await preload(src, priority)) return src;
    }
    return candidates[0] || '';
  }

  const previewSrcAt = index => {
    const item = itemAt(index);
    if (!item) return '';

    const gridImage = qs('.photo-grid-image', item);
    if (item.classList.contains('is-missing-thumbnail')) return '';
    const tileButton = item.matches('.photo-grid-button') ? item : item.querySelector('.photo-grid-button');
    if (tileButton?.classList.contains('is-missing-thumbnail')) return '';
    return gridImage?.currentSrc
      || gridImage?.src
      || item.dataset.thumb
      || '';
  };

  const preparePreviewLayout = (index, image) => {
    const gridImage = qs('.photo-grid-image', itemAt(index));
    if (!image || !gridImage?.naturalWidth || !gridImage?.naturalHeight) return false;

    const available = stageAvailableSize();
    const fitScale = Math.min(
      1,
      available.width / gridImage.naturalWidth,
      available.height / gridImage.naturalHeight
    );

    positionImageAtViewportCenter(image);
    image.style.width = `${Math.max(1, gridImage.naturalWidth * fitScale)}px`;
    image.style.height = `${Math.max(1, gridImage.naturalHeight * fitScale)}px`;
    image.style.setProperty('--viewer-pan-x', '0px');
    image.style.setProperty('--viewer-pan-y', '0px');
    return true;
  };

  function preloadAround(index) {
    // Never preload full-size images on mobile. On desktop, prepare only the
    // immediate neighbor to each side once the selected image is loaded.
    if (saveData || lightweightViewer) return;
    [-1, 1].forEach(offset => {
      resolveFullSrc(index + offset, 0, 'low').catch(() => {});
    });
  }

  function preloadVariants(index) {
    // Alternate frames can be many megabytes each; only load on explicit click.
  }

  function syncCopy(index) {
    if (caption) caption.textContent = titleAt(index);
    if (meta) meta.textContent = metaAt(index);
    if (shareButton) shareButton.disabled = !itemAt(index)?.dataset.slug;
    if (indexLabel) {
      indexLabel.textContent = `${String(index + 1).padStart(2, '0')} / ${String(buttons.length).padStart(2, '0')}`;
    }
  }

  function renderVariantControls(index) {
    if (!variantControls || !variantButtons) return;

    const files = variantFilesAt(index);
    if (files.length <= 1) {
      variantControls.hidden = true;
      variantButtons.replaceChildren();
      return;
    }

    const fragment = document.createDocumentFragment();
    files.forEach((_, variantIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'photo-viewer-variant-button';
      button.dataset.viewerVariant = String(variantIndex);
      button.textContent = String(variantIndex + 1).padStart(2, '0');
      button.setAttribute('aria-label', `Show frame ${variantIndex + 1} of ${files.length}`);
      button.setAttribute('aria-pressed', String(variantIndex === currentVariantIndex));
      if (variantIndex === currentVariantIndex) button.classList.add('is-active');
      fragment.appendChild(button);
    });

    variantButtons.replaceChildren(fragment);
    variantControls.hidden = false;
  }

  let displayRequestId = 0;

  const setDetailLoading = loading => {
    viewer.classList.toggle('is-loading-detail', loading);
    if (detailStatus) detailStatus.setAttribute('aria-hidden', String(!loading));
  };

  // Never reveal a reused viewer layer until the new source assigned to that
  // layer has actually loaded/decoded. Mobile browsers may otherwise keep
  // painting the layer's previous pixels for a moment, which looks like the
  // gallery is cycling backward through recently viewed photographs.
  async function setImageSourceReady(image, src, alt = '') {
    if (!image || !src) return false;

    image.classList.remove('is-active');
    image.alt = alt;
    image.style.transform = '';

    const absoluteSrc = (() => {
      try { return new URL(src, document.baseURI).href; } catch (_) { return src; }
    })();

    if (image.src !== absoluteSrc) image.src = src;

    if (!image.complete || !image.naturalWidth) {
      const loaded = await new Promise(resolve => {
        const onLoad = () => { cleanup(); resolve(true); };
        const onError = () => { cleanup(); resolve(false); };
        const cleanup = () => {
          image.removeEventListener('load', onLoad);
          image.removeEventListener('error', onError);
        };
        image.addEventListener('load', onLoad, { once: true });
        image.addEventListener('error', onError, { once: true });

        // Cover the tiny race where a cached image completes between the
        // condition above and listener registration.
        if (image.complete) {
          cleanup();
          resolve(Boolean(image.naturalWidth));
        }
      });
      if (!loaded) return false;
    }

    try {
      if (image.decode) await image.decode();
    } catch (_) {
      // Some browsers reject decode() even though the image is renderable.
    }

    return Boolean(image.naturalWidth);
  }

  function releaseNavigationLock(requestId, delay = 0) {
    window.clearTimeout(navigationUnlockTimer);
    navigationUnlockTimer = window.setTimeout(() => {
      if (requestId !== displayRequestId) return;
      transitionLocked = false;

      if (pendingNavigation) {
        const direction = pendingNavigation;
        pendingNavigation = 0;
        window.setTimeout(() => go(direction), 24);
      }
    }, delay);
  }

  function activateLayer(nextLayer, previousImage, animate = true) {
    const nextImage = images[nextLayer];
    if (!nextImage) return;

    nextImage.classList.remove('is-active');

    const reveal = () => {
      nextImage.classList.add('is-active');
      if (previousImage && previousImage !== nextImage) previousImage.classList.remove('is-active');
    };

    if (!animate || nextImage === previousImage) {
      reveal();
      return;
    }

    requestAnimationFrame(() => requestAnimationFrame(reveal));
  }

  async function display(index, animate = true) {
    if (!buttons.length) return;
    if (transitionLocked && animate) return;

    resetZoom();

    const requestId = ++displayRequestId;
    const target = wrap(index);
    const outgoing = images[activeLayer];
    const previewLayer = images.length > 1 ? 1 - activeLayer : activeLayer;
    const previewImage = images[previewLayer];
    const previewSrc = previewSrcAt(target);

    // Start the expensive request immediately, but do not let it control the
    // visible transition. The cached thumbnail gets the screen first.
    // Mobile needs only the cached WebP preview; don't launch a full-size
    // request or trigger a second decode/swap for exactly the same thumbnail.
    const fullSrcPromise = lightweightViewer
      ? Promise.resolve('')
      : resolveFullSrc(target, 0, 'high');

    transitionLocked = animate;
    setDetailLoading(true);

    let previewReady = false;
    if (previewImage && previewSrc) {
      previewImage.classList.add('is-preview');
      previewReady = await setImageSourceReady(previewImage, previewSrc, titleAt(target));
    }

    if (requestId !== displayRequestId) return;

    // Commit the logical gallery position only when the new preview is ready to
    // be shown. This keeps caption/index/variant state synchronized with what is
    // actually visible on screen.
    currentIndex = target;
    currentVariantIndex = 0;
    syncCopy(target);
    renderVariantControls(target);

    // Analytics counts the photograph when it actually becomes the viewer's
    // committed selection. The later full-resolution swap does not count again.
    window.PortfolioAnalytics?.trackPhotoView({
      file: variantFilesAt(target)[0] || itemAt(target)?.dataset.file || '',
      title: titleAt(target),
      variantIndex: 0
    });

    if (previewReady && previewImage) {
      prepareImageLayout(previewImage);
      activateLayer(previewLayer, outgoing, animate);
      activeLayer = previewLayer;
      queueShareButtonPosition();
    } else {
      outgoing?.classList.remove('is-active');
    }

    // The navigation pause is intentionally short and tied only to the visual
    // handoff. Visitors do not have to wait for the full-resolution detail file
    // before moving to the next photograph.
    releaseNavigationLock(requestId, animate ? 220 : 0);

    if (lightweightViewer) {
      setDetailLoading(false);
      return;
    }

    const src = await fullSrcPromise;
    if (requestId !== displayRequestId) return;

    if (!src) {
      setDetailLoading(false);
      transitionLocked = false;
      return;
    }

    const currentPreview = images[activeLayer];
    const fullLayer = images.length > 1 ? 1 - activeLayer : activeLayer;
    const fullImage = images[fullLayer];

    fullImage.classList.remove('is-preview');
    fullImage.decoding = 'async';
    try { fullImage.fetchPriority = 'high'; } catch (_) {}

    const fullReady = await setImageSourceReady(fullImage, src, titleAt(target));
    if (requestId !== displayRequestId) return;

    if (!fullReady) {
      setDetailLoading(false);
      return;
    }

    resetZoom();
    prepareImageLayout(fullImage);
    activateLayer(fullLayer, currentPreview, true);
    activeLayer = fullLayer;
    queueShareButtonPosition();
    setDetailLoading(false);

    preloadAround(target);
    preloadVariants(target);
  }

  async function displayVariant(nextVariantIndex, animate = true) {
    if (transitionLocked) return;

    const files = variantFilesAt(currentIndex);
    if (files.length <= 1) return;

    const targetVariant = clamp(nextVariantIndex, 0, files.length - 1);
    if (targetVariant === currentVariantIndex) return;

    const requestId = ++displayRequestId;
    resetZoom();
    transitionLocked = animate;
    setDetailLoading(true);

    const src = await resolveFullSrc(currentIndex, targetVariant, 'high');
    if (requestId !== displayRequestId) return;
    if (!src) {
      setDetailLoading(false);
      transitionLocked = false;
      return;
    }

    const outgoing = images[activeLayer];
    const incomingLayer = images.length > 1 ? 1 - activeLayer : activeLayer;
    const incoming = images[incomingLayer];

    incoming.classList.remove('is-preview');
    incoming.decoding = 'async';
    try { incoming.fetchPriority = 'high'; } catch (_) {}

    const ready = await setImageSourceReady(
      incoming,
      src,
      `${titleAt(currentIndex)} — alternate ${targetVariant + 1}`
    );

    if (requestId !== displayRequestId) return;
    if (!ready) {
      setDetailLoading(false);
      transitionLocked = false;
      return;
    }

    prepareImageLayout(incoming);
    currentVariantIndex = targetVariant;
    renderVariantControls(currentIndex);

    // Alternate frames are individual photographs too, so record the exact
    // file/frame selected rather than rolling every variant into the primary.
    window.PortfolioAnalytics?.trackPhotoView({
      file: variantFilesAt(currentIndex)[targetVariant] || '',
      title: titleAt(currentIndex),
      variantIndex: targetVariant
    });

    activateLayer(incomingLayer, outgoing, animate);
    activeLayer = incomingLayer;
    queueShareButtonPosition();
    setDetailLoading(false);
    releaseNavigationLock(requestId, animate ? 220 : 0);
  }

  // No background full-resolution preloads while browsing the gallery.
  // Full-size downloads start only when a visitor actually opens a photograph.
  // Neighbor preloads remain limited to the *open* full-screen viewer.

  async function openViewer(button) {
    // Re-read the DOM so the viewer follows the current randomized/album order.
    buttons = qsa('.photo-grid-button', grid);
    const index = buttons.indexOf(button);
    if (index < 0) return;

    lastFocused = button;
    transitionLocked = false;
    pendingNavigation = 0;
    window.clearTimeout(navigationUnlockTimer);
    activePointers.clear();
    gestureMode = null;
    resetZoom();

    // display() paints the already-cached thumbnail synchronously before its
    // first await. Open the overlay immediately afterward so the visitor sees
    // a photograph at once instead of waiting on the full-resolution request.
    const displayPromise = display(index, false);
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    closeButton?.focus({ preventScroll: true });
    await displayPromise;
  }

  function closeViewer() {
    ++displayRequestId;
    setDetailLoading(false);

    // Closing a directly linked photograph returns to the ordinary gallery URL.
    const activeHash = hashSlug();
    if (activeHash && buttons.some(button => button.dataset.slug === activeHash)) clearShareHash();
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    transitionLocked = false;
    pendingNavigation = 0;
    window.clearTimeout(navigationUnlockTimer);
    activePointers.clear();
    gestureMode = null;
    resetZoom();
    window.clearTimeout(shareFeedbackTimer);
    shareButton.classList.remove('is-copied');
    if (shareFeedback) {
      shareFeedback.classList.remove('is-visible');
      shareFeedback.textContent = '';
    }
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  const go = direction => {
    const step = direction < 0 ? -1 : 1;

    // A shared URL stays intact while its linked photo is open. Once the visitor
    // intentionally moves to another photo, clear that hash once and leave the
    // address bar stable for the rest of normal browsing.
    const activeHash = hashSlug();
    if (activeHash && buttons.some(button => button.dataset.slug === activeHash)) clearShareHash();

    // Preserve one intentional extra tap during the brief handoff instead of
    // racing multiple layer swaps or silently jumping around recent images.
    if (transitionLocked) {
      pendingNavigation = step;
      return;
    }

    resetZoom();
    display(currentIndex + step, true);
  };

  grid.addEventListener('click', event => {
    const button = event.target.closest('.photo-grid-button');
    if (button) openViewer(button);
  });

  closeButton?.addEventListener('click', closeViewer);
  prevButton?.addEventListener('click', () => go(-1));
  nextButton?.addEventListener('click', () => go(1));
  shareButton?.addEventListener('click', copyCurrentPhotoLink);

  const openPhotoFromHash = () => {
    const slug = hashSlug();
    if (!slug) return false;

    // Always search the All archive so a direct link works regardless of which
    // album the photograph belongs to. The default page load is already All.
    buttons = qsa('.photo-grid-button', grid);
    const target = buttons.find(button => button.dataset.slug === slug);
    if (!target) return false;

    openViewer(target);
    return true;
  };

  // Give the initial randomized All grid one paint before opening a direct link.
  window.requestAnimationFrame(() => openPhotoFromHash());

  // Also support changing/pasting a #slug while the Photography page is open.
  window.addEventListener('hashchange', () => {
    if (window.location.hash) openPhotoFromHash();
  });

  variantControls?.addEventListener('click', event => {
    const button = event.target.closest('[data-viewer-variant]');
    if (!button) return;

    const variantIndex = Number.parseInt(button.dataset.viewerVariant || '', 10);
    if (Number.isFinite(variantIndex)) displayVariant(variantIndex, true);
  });

  document.addEventListener('keydown', event => {
    if (!viewer.classList.contains('is-open')) return;

    if (event.key === 'Escape') closeViewer();

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setZoom(Math.min(maxZoomForActive(), zoomScale + .6));
    }

    if (event.key === '-') {
      event.preventDefault();
      setZoom(Math.max(MIN_ZOOM, zoomScale - .6));
    }

    if (event.key === '0') {
      event.preventDefault();
      resetZoom();
    }

    // Bracket keys cycle alternate snapshots when the current subject has
    // more than one version. Left/right arrows remain subject navigation.
    if (event.key === '[') {
      event.preventDefault();
      const count = variantFilesAt(currentIndex).length;
      if (count > 1) displayVariant((currentVariantIndex - 1 + count) % count, true);
    }
    if (event.key === ']') {
      event.preventDefault();
      const count = variantFilesAt(currentIndex).length;
      if (count > 1) displayVariant((currentVariantIndex + 1) % count, true);
    }

    // Arrow keys remain photo navigation. The image can be panned with pointer
    // or touch after zooming.
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    }
  });

  // ----------------------------------------------------------
  // Viewer gestures
  //
  // At 1x: one finger / mouse drag navigates between photographs.
  // Above 1x: one finger / mouse drag pans the enlarged photograph.
  // Two touch pointers: pinch continuously from fitted view through native detail.
  // ----------------------------------------------------------

  stage?.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture?.(event.pointerId);

    if (activePointers.size === 1) {
      swipeStartX = event.clientX;
      pointerStartY = event.clientY;
      suppressClickZoom = false;
    }

    if (activePointers.size >= 2 && event.pointerType !== 'mouse') {
      suppressClickZoom = true;
      gestureMode = 'pinch';
      pinchStartDistance = Math.max(pointerDistance(), 1);
      pinchStartScale = zoomScale;
      pinchStartX = zoomX;
      pinchStartY = zoomY;

      const midpoint = pointerMidpoint();
      const viewport = stageViewport();
      pinchAnchorX = midpoint.x - viewport.centerX;
      pinchAnchorY = midpoint.y - viewport.centerY;
      return;
    }

    if (zoomScale > MIN_ZOOM + 0.01) {
      gestureMode = 'pan';
      panStartX = event.clientX;
      panStartY = event.clientY;
      panOriginX = zoomX;
      panOriginY = zoomY;
      stage.classList.add('is-panning');
    } else {
      gestureMode = 'swipe';
    }
  });

  stage?.addEventListener('pointermove', event => {
    if (!activePointers.has(event.pointerId)) return;

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (Math.hypot(event.clientX - swipeStartX, event.clientY - pointerStartY) > 7) {
      suppressClickZoom = true;
    }

    if (activePointers.size >= 2 && event.pointerType !== 'mouse') {
      if (gestureMode !== 'pinch') {
        gestureMode = 'pinch';
        pinchStartDistance = Math.max(pointerDistance(), 1);
        pinchStartScale = zoomScale;
        pinchStartX = zoomX;
        pinchStartY = zoomY;

        const midpoint = pointerMidpoint();
        const viewport = stageViewport();
        pinchAnchorX = midpoint.x - viewport.centerX;
        pinchAnchorY = midpoint.y - viewport.centerY;
      }

      const distance = Math.max(pointerDistance(), 1);
      const nextScale = clamp(
        pinchStartScale * (distance / pinchStartDistance),
        MIN_ZOOM,
        maxZoomForActive()
      );
      const ratio = nextScale / Math.max(pinchStartScale, .001);

      zoomScale = nextScale;
      zoomX = pinchAnchorX - ratio * (pinchAnchorX - pinchStartX);
      zoomY = pinchAnchorY - ratio * (pinchAnchorY - pinchStartY);
      applyZoom();
      event.preventDefault();
      return;
    }

    if (gestureMode === 'pan' && zoomScale > MIN_ZOOM + 0.01) {
      zoomX = panOriginX + (event.clientX - panStartX);
      zoomY = panOriginY + (event.clientY - panStartY);
      applyZoom();
      event.preventDefault();
    }
  });

  function finishPointer(event, cancelled = false) {
    if (!activePointers.has(event.pointerId)) return;

    const point = activePointers.get(event.pointerId);
    activePointers.delete(event.pointerId);
    stage.releasePointerCapture?.(event.pointerId);

    if (gestureMode === 'swipe' && !cancelled && zoomScale <= MIN_ZOOM + 0.01) {
      const delta = (point?.x ?? event.clientX) - swipeStartX;
      const threshold = Math.min(90, Math.max(48, stage.clientWidth * .09));
      if (Math.abs(delta) >= threshold) {
        suppressClickZoom = true;
        go(delta < 0 ? 1 : -1);
      }
    }

    if (activePointers.size === 1 && zoomScale > MIN_ZOOM + 0.01) {
      // A pinch can naturally turn into a one-finger pan when one finger lifts.
      const remaining = [...activePointers.values()][0];
      gestureMode = 'pan';
      panStartX = remaining.x;
      panStartY = remaining.y;
      panOriginX = zoomX;
      panOriginY = zoomY;
      stage.classList.add('is-panning');
      return;
    }

    if (activePointers.size === 0) {
      gestureMode = null;
      stage.classList.remove('is-panning');

      // Snap very small pinch scales back to the clean fitted view.
      if (zoomScale < 1.04) resetZoom();
      else applyZoom();
    }
  }

  stage?.addEventListener('pointerup', event => finishPointer(event, false));
  stage?.addEventListener('pointercancel', event => finishPointer(event, true));

  // Pointer capture keeps swipe/pan gestures reliable, but it can retarget the
  // resulting click to the stage instead of the <img>. Use the active image's
  // rendered bounds rather than event.target so click-to-zoom remains reliable.
  function pointIsOnActiveImage(clientX, clientY) {
    const image = activeViewerImage();
    if (!image || !image.classList.contains('is-active')) return false;

    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    return clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom;
  }

  // The photograph itself is the primary zoom control. At the fitted view,
  // clicking any point inside the visible photograph magnifies toward that
  // exact point. While enlarged, a clean click (as opposed to a drag/pan)
  // returns the image to its complete fitted view. The surrounding black
  // stage remains inert.
  stage?.addEventListener('click', event => {
    if (transitionLocked || suppressClickZoom || viewer.classList.contains('is-loading-detail')) return;
    if (!pointIsOnActiveImage(event.clientX, event.clientY)) return;

    if (zoomScale > MIN_ZOOM + 0.01) {
      resetZoom();
      return;
    }

    zoomToClientPoint(inspectionZoomForActive(), event.clientX, event.clientY);
  });

  window.addEventListener('resize', () => {
    if (!viewer.classList.contains('is-open')) return;

    images.forEach(image => {
      if (image?.naturalWidth && image?.naturalHeight) prepareImageLayout(image);
    });

    if (zoomScale > MIN_ZOOM) applyZoom();
    queueShareButtonPosition();
  }, { passive: true });

  syncZoomUI();
})();
