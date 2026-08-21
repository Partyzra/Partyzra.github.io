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
  // Gallery rendering
  // ----------------------------------------------------------

  const grid = qs('#photoGrid');
  if (!grid || typeof PORTFOLIO_PHOTOS === 'undefined') return;

  const basePath = 'Images/photo-full/';

  // Exact duplicate filenames are ignored. Different extensions/case remain
  // separate because GitHub Pages treats them as separate files.
  const seen = new Set();
  const uniquePhotos = PORTFOLIO_PHOTOS.filter(photo => {
    const file = String(photo?.file || '').trim();
    if (!file || seen.has(file)) return false;
    seen.add(file);
    return true;
  });

  // Keep the gallery in the exact order defined in photos.js.
  // No photograph receives a special lead position here.
  const orderedPhotos = uniquePhotos;

  const fragment = document.createDocumentFragment();

  orderedPhotos.forEach((photo, index) => {
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
    button.setAttribute('aria-label', `Open photograph: ${photo.title || photo.file}`);

    const img = document.createElement('img');
    img.className = 'photo-grid-image';
    img.src = basePath + photo.file;
    img.alt = photo.title || '';
    img.loading = index < 6 ? 'eager' : 'lazy';
    img.decoding = 'async';
    if (index < 3) img.fetchPriority = 'high';

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

  const photoCount = qs('[data-photo-count]');
  const galleryStatus = qs('[data-gallery-status]');

  function updateCounts() {
    const count = qsa('.photo-grid-button', grid).length;
    if (photoCount) photoCount.textContent = `${count} photographs`;
    if (galleryStatus) galleryStatus.textContent = `${count} photographs`;
  }

  updateCounts();

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
    return [item.dataset.collection, item.dataset.location, item.dataset.year]
      .filter(Boolean)
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

    // Two requestAnimationFrames ensure the browser paints the incoming image
    // at opacity 0 before cross-fading it to opacity 1.
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
  // image while dragging, so the photograph remains fully contained at all times.
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
