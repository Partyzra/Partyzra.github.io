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
    if (stem === 'fox2') return '50% 20%';        // fox head near top
    if (stem === 'lincoln') return '50% 80%';        // feet near bottom
    if (stem === 'derick & tori') return '50% 15%';  // Heads near top
    if (stem === 'zeboy!') return '50% 45%';  // Center
    if (stem === 'zey portrait') return '50% 25%';        // head near top
    if (stem === 'sean') return '50% 25%';      // head near top
    if (stem === 'miss watson') return '50% 15%';      // head near top
    if (stem === 'fox1') return '50% 10%';      // head near top


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

  const archive = uniquePhotos.map(photo => ({
    ...photo,
    __albums: resolveAlbums(photo)
  }));

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

  // Keep the navigation intentionally curated instead of surfacing every
  // metadata category as a new tab.
  const albumNames = ALBUM_RULES.map(rule => rule.name);

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
  const saveData = Boolean(navigator.connection?.saveData);
  const smallScreen = window.matchMedia('(max-width: 700px)').matches;
  const eagerCount = saveData ? 2 : (smallScreen ? 4 : 8);
  const observerMargin = saveData ? '300px 0px' : (smallScreen ? '650px 0px' : '1100px 0px');

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
      const gridCandidates = [...thumbCandidates, ...fullCandidates]
        .filter((value, position, values) => value && values.indexOf(value) === position);

      button.dataset.full = fullSrc;
      button.dataset.fullCandidates = JSON.stringify(fullCandidates);
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

        figure.remove();
        updateCounts();
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

    activeAlbum = button.dataset.album || 'All';
    renderAlbumNav();
    renderGrid();

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

  let buttons = qsa('.photo-grid-button', grid);
  let currentIndex = 0;
  let activeLayer = 0;
  let lastFocused = null;
  let transitionLocked = false;

  const MIN_ZOOM = 1;
  const BUTTON_ZOOM = 2.35;
  const MAX_ZOOM = 4;
  let zoomScale = MIN_ZOOM;
  let zoomX = 0;
  let zoomY = 0;

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
  const srcCandidatesAt = index => {
    const item = itemAt(index);
    if (!item) return [];

    try {
      const parsed = JSON.parse(item.dataset.fullCandidates || '[]');
      if (Array.isArray(parsed) && parsed.length) return parsed.filter(Boolean);
    } catch (_) {}

    return item.dataset.full ? [item.dataset.full] : [];
  };

  const srcAt = index => srcCandidatesAt(index)[0] || '';
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

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function clampPan() {
    const image = activeViewerImage();
    if (!image || !stage || zoomScale <= MIN_ZOOM) {
      zoomX = 0;
      zoomY = 0;
      return;
    }

    const styles = getComputedStyle(stage);
    const availableWidth = Math.max(
      1,
      stage.clientWidth - parseFloat(styles.paddingLeft || 0) - parseFloat(styles.paddingRight || 0)
    );
    const availableHeight = Math.max(
      1,
      stage.clientHeight - parseFloat(styles.paddingTop || 0) - parseFloat(styles.paddingBottom || 0)
    );

    const baseWidth = image.offsetWidth || availableWidth;
    const baseHeight = image.offsetHeight || availableHeight;
    const maxX = Math.max(0, (baseWidth * zoomScale - availableWidth) / 2);
    const maxY = Math.max(0, (baseHeight * zoomScale - availableHeight) / 2);

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
    if (!image) return;

    zoomScale = clamp(zoomScale, MIN_ZOOM, MAX_ZOOM);
    if (clampPosition) clampPan();

    if (zoomScale <= MIN_ZOOM + 0.01) {
      zoomScale = MIN_ZOOM;
      zoomX = 0;
      zoomY = 0;
      image.style.transform = '';
    } else {
      image.style.transform = `translate3d(${zoomX}px, ${zoomY}px, 0) scale(${zoomScale})`;
    }

    syncZoomUI();
  }

  function resetZoom() {
    zoomScale = MIN_ZOOM;
    zoomX = 0;
    zoomY = 0;
    images.forEach(image => {
      if (image) image.style.transform = '';
    });
    syncZoomUI();
  }

  function setZoom(nextScale, anchorClientX = null, anchorClientY = null) {
    const previousScale = zoomScale;
    const rect = stage?.getBoundingClientRect();

    if (rect && anchorClientX !== null && anchorClientY !== null && previousScale > 0) {
      const anchorX = anchorClientX - rect.left - rect.width / 2;
      const anchorY = anchorClientY - rect.top - rect.height / 2;
      const ratio = nextScale / previousScale;

      // Keep the part beneath the user's fingers/cursor in roughly the same
      // screen position as magnification changes.
      zoomX = anchorX - ratio * (anchorX - zoomX);
      zoomY = anchorY - ratio * (anchorY - zoomY);
    }

    zoomScale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
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

  const preloadCache = new Map();

  function preload(src) {
    if (!src) return Promise.resolve(false);
    if (preloadCache.has(src)) return preloadCache.get(src);

    const promise = new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = src;
      if (image.complete) resolve(Boolean(image.naturalWidth));
    });

    preloadCache.set(src, promise);
    return promise;
  }

  async function resolveFullSrc(index) {
    const candidates = srcCandidatesAt(index);
    for (const src of candidates) {
      if (await preload(src)) return src;
    }
    return candidates[0] || '';
  }

  function preloadAround(index) {
    [-2, -1, 1, 2].forEach(offset => {
      resolveFullSrc(index + offset).catch(() => {});
    });
  }

  function syncCopy(index) {
    if (caption) caption.textContent = titleAt(index);
    if (meta) meta.textContent = metaAt(index);
    if (indexLabel) {
      indexLabel.textContent = `${String(index + 1).padStart(2, '0')} / ${String(buttons.length).padStart(2, '0')}`;
    }
  }

  async function display(index, animate = true) {
    if (!buttons.length || transitionLocked) return;

    // Every new photograph starts in the complete fitted view. Zoom is an
    // inspection state for the current image, not something carried to the next.
    resetZoom();

    const target = wrap(index);

    transitionLocked = animate;
    const src = await resolveFullSrc(target);
    if (!src) {
      transitionLocked = false;
      return;
    }

    const outgoing = images[activeLayer];
    const incomingLayer = images.length > 1 ? 1 - activeLayer : activeLayer;
    const incoming = images[incomingLayer];

    incoming.src = src;
    incoming.alt = titleAt(target);
    incoming.style.transform = '';

    try {
      if (incoming.decode) await incoming.decode();
    } catch (_) {}

    currentIndex = target;
    syncCopy(target);

    if (!animate || incoming === outgoing) {
      outgoing?.classList.remove('is-active');
      incoming.classList.add('is-active');
      activeLayer = incomingLayer;
      preloadAround(target);
      transitionLocked = false;
      return;
    }

    incoming.classList.remove('is-active');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        incoming.classList.add('is-active');
        outgoing?.classList.remove('is-active');
      });
    });

    activeLayer = incomingLayer;
    preloadAround(target);

    window.setTimeout(() => {
      transitionLocked = false;
    }, 460);
  }

  async function openViewer(button) {
    // Re-read the DOM so the viewer follows the current randomized/album order.
    buttons = qsa('.photo-grid-button', grid);
    const index = buttons.indexOf(button);
    if (index < 0) return;

    lastFocused = button;
    transitionLocked = false;
    activePointers.clear();
    gestureMode = null;
    resetZoom();
    await display(index, false);
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    closeButton?.focus({ preventScroll: true });
  }

  function closeViewer() {
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    transitionLocked = false;
    activePointers.clear();
    gestureMode = null;
    resetZoom();
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  const go = direction => {
    resetZoom();
    display(currentIndex + direction, true);
  };

  grid.addEventListener('click', event => {
    const button = event.target.closest('.photo-grid-button');
    if (button) openViewer(button);
  });

  closeButton?.addEventListener('click', closeViewer);
  prevButton?.addEventListener('click', () => go(-1));
  nextButton?.addEventListener('click', () => go(1));

  document.addEventListener('keydown', event => {
    if (!viewer.classList.contains('is-open')) return;

    if (event.key === 'Escape') closeViewer();

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setZoom(Math.min(MAX_ZOOM, zoomScale + .6));
    }

    if (event.key === '-') {
      event.preventDefault();
      setZoom(Math.max(MIN_ZOOM, zoomScale - .6));
    }

    if (event.key === '0') {
      event.preventDefault();
      resetZoom();
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
  // Two touch pointers: pinch continuously between 1x and 4x.
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
      const rect = stage.getBoundingClientRect();
      pinchAnchorX = midpoint.x - rect.left - rect.width / 2;
      pinchAnchorY = midpoint.y - rect.top - rect.height / 2;
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
        const rect = stage.getBoundingClientRect();
        pinchAnchorX = midpoint.x - rect.left - rect.width / 2;
        pinchAnchorY = midpoint.y - rect.top - rect.height / 2;
      }

      const distance = Math.max(pointerDistance(), 1);
      const nextScale = clamp(
        pinchStartScale * (distance / pinchStartDistance),
        MIN_ZOOM,
        MAX_ZOOM
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
    if (transitionLocked || suppressClickZoom) return;
    if (!pointIsOnActiveImage(event.clientX, event.clientY)) return;

    if (zoomScale > MIN_ZOOM + 0.01) {
      resetZoom();
      return;
    }

    setZoom(BUTTON_ZOOM, event.clientX, event.clientY);
  });

  window.addEventListener('resize', () => {
    if (viewer.classList.contains('is-open') && zoomScale > MIN_ZOOM) applyZoom();
  }, { passive: true });

  syncZoomUI();
})();
