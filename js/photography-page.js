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
  // Photography soundtrack
  // ----------------------------------------------------------

  const soundtrack = qs('[data-photo-soundtrack]');
  const soundtrackToggle = qs('[data-soundtrack-toggle]');
  const soundtrackIcon = qs('[data-soundtrack-icon]');
  const soundtrackStatus = qs('[data-soundtrack-status]');

  if (soundtrack && soundtrackToggle) {
    const targetVolume = 0.42;
    let fadeFrame = null;

    const setSoundtrackUI = (state) => {
      const playing = state === 'playing';
      const blocked = state === 'blocked';
      const ended = state === 'ended';

      soundtrackToggle.classList.toggle('is-playing', playing);
      soundtrackToggle.classList.toggle('needs-interaction', blocked);
      soundtrackToggle.setAttribute('aria-pressed', String(playing));
      soundtrackToggle.setAttribute('aria-label', playing ? 'Pause soundtrack' : (ended ? 'Replay soundtrack' : 'Play soundtrack'));

      if (soundtrackIcon) soundtrackIcon.textContent = playing ? 'Ⅱ' : '▶';
      if (soundtrackStatus) {
        soundtrackStatus.textContent = playing ? 'Now playing' : (ended ? 'Replay soundtrack' : (blocked ? 'Play soundtrack' : 'Soundtrack'));
      }
    };

    const fadeVolume = (from, to, duration = 1600) => {
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

    const startSoundtrack = async () => {
      try {
        soundtrack.volume = 0.12;
        await soundtrack.play();
        fadeVolume(0.12, targetVolume);
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

    soundtrack.addEventListener('play', () => setSoundtrackUI('playing'));
    soundtrack.addEventListener('pause', () => {
      if (!soundtrack.ended) setSoundtrackUI('paused');
    });
    soundtrack.addEventListener('ended', () => setSoundtrackUI('ended'));

    // Attempt audible autoplay as soon as the page script runs. Modern browsers
    // may reject this on a first visit; in that case the control changes to a
    // clear "Play soundtrack" fallback and one click starts playback.
    setSoundtrackUI('paused');
    startSoundtrack();
  }

  // ----------------------------------------------------------
  // Gallery rendering — randomized archive + virtual collections
  // ----------------------------------------------------------

  const grid = qs('#photoGrid');
  if (!grid || typeof PORTFOLIO_PHOTOS === 'undefined') return;

  const basePath = 'Images/photo-full/';
  const albumNav = qs('[data-album-nav]');
  const albumHeading = qs('[data-album-heading]');
  const photoCount = qs('[data-photo-count]');
  const galleryStatus = qs('[data-gallery-status]');

  /*
    Virtual albums keep every file in Images/photo-full/. A photo can appear
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
          || file === 'door.jpg'
          || file === 'open mouth.jpg'
          || file === 'homeless.jpg'
          || /(^|[\s_.-])(cat|kitty)([\s_.-]|$)/.test(file)
          || /(^|\s)(cat|kitty)(\s|$)/.test(title);

        if (explicitlyNotPeople) return false;

        return file === 'performance.jpg'
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
    const names = new Set();

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

  let activeAlbum = 'All';

  // Keep the navigation intentionally curated instead of surfacing every
  // metadata category as a new tab.
  const albumNames = ALBUM_RULES.map(rule => rule.name);

  const photosForActiveAlbum = () => {
    if (activeAlbum === 'All') return randomizedArchive;
    return randomizedArchive.filter(photo => photo.__albums.includes(activeAlbum));
  };

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
    The full-resolution files remain the source images for now, but we avoid
    asking a phone to download 100+ of them at once. Only the first few grid
    images receive a src immediately; the rest are attached shortly before
    they approach the viewport.
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

  function renderGrid() {
    const photos = photosForActiveAlbum();
    const fragment = document.createDocumentFragment();

    gridImageObserver?.disconnect();

    photos.forEach((photo, index) => {
      const figure = document.createElement('figure');
      figure.className = 'photo-grid-item';

      const button = document.createElement('button');
      button.className = 'photo-grid-button';
      button.type = 'button';
      button.dataset.full = basePath + photo.file;
      button.dataset.title = photo.title || photo.file;
      button.dataset.collection = photo.collection || '';
      button.dataset.location = photo.location || '';
      button.dataset.year = photo.year || '';
      button.dataset.note = photo.note || '';
      button.dataset.albums = photo.__albums.join('|');
      button.setAttribute('aria-label', `Open photograph: ${photo.title || photo.file}`);

      const img = document.createElement('img');
      img.className = 'photo-grid-image';
      img.dataset.src = basePath + photo.file;
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

      const markLoaded = () => figure.classList.add('is-loaded');
      img.addEventListener('load', markLoaded, { once: true });
      if (img.complete && img.naturalWidth) markLoaded();

      img.addEventListener('error', () => {
        figure.remove();
        updateCounts();
      }, { once: true });

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
  const srcAt = index => itemAt(index)?.dataset.full || '';
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
    if (!src) return Promise.resolve();
    if (preloadCache.has(src)) return preloadCache.get(src);

    const promise = new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = src;
      if (image.complete) resolve();
    });

    preloadCache.set(src, promise);
    return promise;
  }

  function preloadAround(index) {
    [-2, -1, 1, 2].forEach(offset => preload(srcAt(index + offset)));
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
    const src = srcAt(target);
    if (!src) return;

    transitionLocked = animate;
    await preload(src);

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
