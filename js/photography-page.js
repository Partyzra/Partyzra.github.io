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
          || file === 'rocks2.jpg';
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
          || tags.includes('coaster');
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
  let pointerStartX = null;

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
    pointerStartX = null;
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  const go = direction => display(currentIndex + direction, true);

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
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    }
  });

  // Swipe navigation tracks gesture distance only. It does not move/scale the
  // image while dragging, so the photograph remains fully contained.
  stage?.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStartX = event.clientX;
    stage.setPointerCapture?.(event.pointerId);
  });

  stage?.addEventListener('pointerup', event => {
    if (pointerStartX === null) return;
    const delta = event.clientX - pointerStartX;
    pointerStartX = null;
    stage.releasePointerCapture?.(event.pointerId);

    const threshold = Math.min(90, Math.max(48, stage.clientWidth * .09));
    if (Math.abs(delta) >= threshold) go(delta < 0 ? 1 : -1);
  });

  stage?.addEventListener('pointercancel', () => {
    pointerStartX = null;
  });
})();
