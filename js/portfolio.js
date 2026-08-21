(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Header and mobile navigation.
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

  // Dynamic copyright year. Scope this to the footer only.
  // Photography items also use data-year as metadata, so a global [data-year]
  // selector would replace each gallery button's image/content with the current year.
  qsa('.site-footer [data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Soft reveal on scroll. Elements remain visible when JS is unavailable.
  const revealItems = qsa('[data-reveal]');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reveal-ready');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.08 });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  // Custom music controls.
  const trackCards = qsa('[data-track-card]');
  const formatTime = value => {
    if (!Number.isFinite(value)) return '—:—';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const pauseOtherTracks = activeAudio => {
    trackCards.forEach(card => {
      const audio = qs('[data-audio]', card);
      if (audio && audio !== activeAudio) audio.pause();
    });
  };

  trackCards.forEach(card => {
    const audio = qs('[data-audio]', card);
    const play = qs('[data-track-play]', card);
    const seek = qs('[data-track-seek]', card);
    const current = qs('[data-track-current]', card);
    const duration = qs('[data-track-duration]', card);
    if (!audio || !play || !seek) return;

    const title = qs('h2', card)?.textContent?.trim() || 'track';

    const syncPlayState = () => {
      const playing = !audio.paused && !audio.ended;
      card.classList.toggle('is-playing', playing);
      play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${title}`);
    };

    const syncTimeline = () => {
      const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      seek.value = String(Math.round(ratio * 1000));
      seek.style.setProperty('--progress', `${ratio * 100}%`);
      if (current) current.textContent = formatTime(audio.currentTime);
      if (duration) duration.textContent = formatTime(audio.duration);
    };

    play.addEventListener('click', () => {
      if (audio.paused) {
        pauseOtherTracks(audio);
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });

    seek.addEventListener('input', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
        syncTimeline();
      }
    });

    audio.addEventListener('loadedmetadata', syncTimeline);
    audio.addEventListener('durationchange', syncTimeline);
    audio.addEventListener('timeupdate', syncTimeline);
    audio.addEventListener('play', () => { pauseOtherTracks(audio); syncPlayState(); });
    audio.addEventListener('pause', syncPlayState);
    audio.addEventListener('ended', () => { syncPlayState(); audio.currentTime = 0; syncTimeline(); });
    syncPlayState();
    syncTimeline();
  });

  // Photography: simple gallery + full-frame viewer.
  const allGalleryButtons = qsa('.gallery-button').filter(button => button.isConnected);
  const countEl = qs('[data-photo-count]');
  const statusEl = qs('[data-gallery-status]');

  const connectedGalleryButtons = () => allGalleryButtons.filter(button => button.isConnected);

  const syncGalleryCount = () => {
    const count = connectedGalleryButtons().length;
    if (countEl) countEl.textContent = `${count} photographs`;
    if (statusEl) statusEl.textContent = `${count} photographs`;
  };

  syncGalleryCount();
  window.addEventListener('portfolio:photo-missing', syncGalleryCount);

  const lightbox = qs('[data-lightbox]');
  if (!lightbox || !allGalleryButtons.length) return;

  const stage = qs('[data-lightbox-stage]', lightbox);
  const currentImg = qs('[data-lightbox-image]', lightbox);
  const captionEl = qs('[data-lightbox-caption]', lightbox);
  const metaEl = qs('[data-lightbox-meta]', lightbox);
  const indexEl = qs('[data-lightbox-index]', lightbox);
  const progressEl = qs('[data-lightbox-progress]', lightbox);
  const closeBtn = qs('[data-lightbox-close]', lightbox);
  const prevBtn = qs('[data-lightbox-prev]', lightbox);
  const nextBtn = qs('[data-lightbox-next]', lightbox);

  let currentIndex = 0;
  let lastFocused = null;
  let pointerStartX = 0;
  let pointerDeltaX = 0;
  let isPointerDown = false;
  let transitionLock = false;
  let transitionTimer = 0;

  const currentSet = () => connectedGalleryButtons();
  const wrap = (index, items = currentSet()) => (index + items.length) % items.length;
  const itemAt = index => {
    const items = currentSet();
    if (!items.length) return null;
    return items[wrap(index, items)];
  };
  const sourceAt = index => itemAt(index)?.dataset.full || qs('img', itemAt(index))?.src || '';
  const captionAt = index => itemAt(index)?.dataset.title || itemAt(index)?.dataset.caption || qs('img', itemAt(index))?.alt || '';
  const metaAt = index => {
    const item = itemAt(index);
    if (!item) return '';
    return [item.dataset.collection, item.dataset.location, item.dataset.year].filter(Boolean).join(' · ');
  };

  const preloadCache = new Map();

  function preload(src) {
    if (!src) return Promise.resolve();
    if (preloadCache.has(src)) return preloadCache.get(src);

    const promise = new Promise(resolve => {
      const image = new Image();
      image.onload = async () => {
        try { if (image.decode) await image.decode(); } catch (_) {}
        resolve();
      };
      image.onerror = resolve;
      image.src = src;
      if (image.complete) image.onload();
    });

    preloadCache.set(src, promise);
    return promise;
  }

  function preloadAround(index) {
    [-2, -1, 1, 2].forEach(offset => preload(sourceAt(index + offset)));
  }

  function syncCopy(index) {
    const items = currentSet();
    if (!items.length) return;
    currentIndex = wrap(index, items);
    if (captionEl) captionEl.textContent = captionAt(currentIndex);
    if (metaEl) metaEl.textContent = metaAt(currentIndex);
    if (indexEl) indexEl.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    if (progressEl) progressEl.style.width = `${((currentIndex + 1) / items.length) * 100}%`;
  }

  async function show(index, { animate = false, direction = 1 } = {}) {
    const items = currentSet();
    if (!items.length) return;

    const targetIndex = wrap(index, items);
    const src = sourceAt(targetIndex);
    if (!src) return;

    // Adjacent photographs are normally already in cache. Awaiting the target
    // before swapping prevents the viewer from briefly showing an empty frame.
    await preload(src);

    if (animate) {
      currentImg.style.setProperty('--photo-exit-x', `${direction > 0 ? -14 : 14}px`);
      currentImg.classList.add('is-leaving');
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }

    syncCopy(targetIndex);

    // Place the new image slightly on the opposite side, then softly settle it
    // to center. The image box itself always fills the stage with object-fit:
    // contain, so portrait and landscape photographs remain completely visible.
    currentImg.classList.add('no-transition');
    currentImg.classList.remove('is-leaving');
    currentImg.src = src;
    currentImg.alt = captionAt(targetIndex);
    currentImg.style.opacity = '0';
    currentImg.style.transform = `translate3d(${animate ? (direction > 0 ? 12 : -12) : 0}px, 0, 0) scale(.992)`;

    try { if (currentImg.decode) await currentImg.decode(); } catch (_) {}

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        currentImg.classList.remove('no-transition');
        currentImg.style.opacity = '1';
        currentImg.style.transform = 'translate3d(0,0,0) scale(1)';
      });
    });

    preloadAround(targetIndex);
  }

  async function open(trigger) {
    const items = currentSet();
    const index = items.indexOf(trigger);
    if (index < 0) return;

    lastFocused = trigger || document.activeElement;
    await show(index, { animate: false });
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    closeBtn?.focus({ preventScroll: true });
  }

  function close() {
    window.clearTimeout(transitionTimer);
    transitionLock = false;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    currentImg.classList.remove('is-leaving', 'no-transition');
    currentImg.style.transform = '';
    currentImg.style.opacity = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus({ preventScroll: true });
  }

  async function go(direction) {
    const items = currentSet();
    if (transitionLock || items.length < 2) return;
    transitionLock = true;
    stage?.classList.remove('is-dragging');

    await show(currentIndex + direction, { animate: true, direction });

    transitionTimer = window.setTimeout(() => {
      transitionLock = false;
    }, 360);
  }

  allGalleryButtons.forEach(button => button.addEventListener('click', () => open(button)));
  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => go(-1));
  nextBtn?.addEventListener('click', () => go(1));

  document.addEventListener('keydown', event => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
  });

  // Swipe/drag is intentionally restrained. It provides feedback without
  // physically pulling neighboring slides into view, which keeps the full
  // photograph stable and centered.
  stage?.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    isPointerDown = true;
    pointerStartX = event.clientX;
    pointerDeltaX = 0;
    stage.classList.add('is-dragging');
    stage.setPointerCapture?.(event.pointerId);
  });

  stage?.addEventListener('pointermove', event => {
    if (!isPointerDown || transitionLock) return;
    pointerDeltaX = event.clientX - pointerStartX;
    const width = Math.max(stage.clientWidth, 1);
    const softX = Math.max(-42, Math.min(42, pointerDeltaX * .14));
    const opacity = Math.max(.72, 1 - Math.abs(pointerDeltaX) / width * .45);
    currentImg.style.transform = `translate3d(${softX}px,0,0) scale(.995)`;
    currentImg.style.opacity = String(opacity);
  });

  function finishPointer(event) {
    if (!isPointerDown) return;
    isPointerDown = false;
    stage?.releasePointerCapture?.(event.pointerId);
    stage?.classList.remove('is-dragging');

    const threshold = Math.min(90, Math.max(52, stage.clientWidth * .1));
    const delta = pointerDeltaX;
    pointerDeltaX = 0;

    currentImg.style.transform = 'translate3d(0,0,0) scale(1)';
    currentImg.style.opacity = '1';

    if (Math.abs(delta) >= threshold) go(delta < 0 ? 1 : -1);
  }

  stage?.addEventListener('pointerup', finishPointer);
  stage?.addEventListener('pointercancel', finishPointer);
})();
